package com.track.track.controller;

import com.track.track.config.FileValidator;
import com.track.track.dto.CourseResponse;
import com.track.track.dto.TaskResponse;
import com.track.track.model.Course;
import com.track.track.model.Task;
import com.track.track.model.User;
import com.track.track.service.AcademicCalendarService;
import com.track.track.service.CourseService;
import com.track.track.service.DocumentService;
import com.track.track.service.TaskService;
import com.track.track.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import java.util.UUID;

@RestController
@RequestMapping("/api/upload")
public class UploadController {

    private record UploadPreview(UUID userId, DocumentService.CourseAndTasks result, long createdAt) {}
    private record PersistedUpload(List<Course> courses, List<Task> tasks) {}

    private final TaskService taskService;
    private final DocumentService documentService;
    private final UserService userService;
    private final CourseService courseService;
    private final AcademicCalendarService academicCalendarService;
    private final FileValidator fileValidator;

    // Simple per-user upload cooldown: 15 seconds between uploads
    private static final long UPLOAD_COOLDOWN_MS = 15_000;
    private static final long PREVIEW_TTL_MS = 10 * 60 * 1000;
    private final ConcurrentHashMap<String, Long> lastUploadTime = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, UploadPreview> pendingUploads = new ConcurrentHashMap<>();

    private boolean isRateLimited(String userId) {
        long now = System.currentTimeMillis();
        Long last = lastUploadTime.get(userId);
        if (last != null && now - last < UPLOAD_COOLDOWN_MS)
            return true;
        return false;
    }

    private void markUploadTime(String userId) {
        lastUploadTime.put(userId, System.currentTimeMillis());
    }

    private String storePreview(UUID userId, DocumentService.CourseAndTasks result) {
        String previewId = UUID.randomUUID().toString();
        pendingUploads.put(previewId, new UploadPreview(userId, result, System.currentTimeMillis()));
        return previewId;
    }

    private UploadPreview consumePreview(String previewId, UUID userId) {
        UploadPreview preview = pendingUploads.remove(previewId);
        if (preview == null) return null;
        if (!preview.userId().equals(userId)) return null;
        if (System.currentTimeMillis() - preview.createdAt() > PREVIEW_TTL_MS) return null;
        return preview;
    }

    private PersistedUpload persistUploadResult(UUID userId, User user, DocumentService.CourseAndTasks result) {
        List<Course> savedCourses = new java.util.ArrayList<>();
        for (Course course : result.courses()) {
            String moduleCode = course.getModuleCode() == null ? null : course.getModuleCode().toUpperCase();
            if (moduleCode == null || moduleCode.isBlank()) continue;
            Course existing = courseService.getCourseByUserAndCode(userId, moduleCode)
                    .orElseGet(() -> courseService.getOrCreate(userId, moduleCode, user));
            if (course.getName() != null)      existing.setName(course.getName());
            if (course.getProf() != null)      existing.setProf(course.getProf());
            if (course.getExamDate() != null)  existing.setExamDate(course.getExamDate());
            if (course.getExamVenue() != null) existing.setExamVenue(course.getExamVenue());
            savedCourses.add(courseService.saveCourse(existing));
        }

        List<Task> tasks = result.tasks().stream()
                .filter(t -> t.getModuleCode() != null && !t.getModuleCode().isBlank())
                .collect(java.util.stream.Collectors.toList());
        tasks.forEach(t -> t.setUser(user));
        List<Task> savedTasks = taskService.saveAll(tasks);
        return new PersistedUpload(savedCourses, savedTasks);
    }

    public UploadController(TaskService taskService, DocumentService documentService,
                            UserService userService, CourseService courseService,
                            AcademicCalendarService academicCalendarService,
                            FileValidator fileValidator) {
        this.taskService = taskService;
        this.documentService = documentService;
        this.userService = userService;
        this.courseService = courseService;
        this.academicCalendarService = academicCalendarService;
        this.fileValidator = fileValidator;
    }

    private User getUserFromRequest(HttpServletRequest request) {
        String uid   = (String) request.getAttribute("firebaseUid");
        String email = (String) request.getAttribute("firebaseEmail");
        String name  = (String) request.getAttribute("firebaseName");
        return userService.findOrCreateByFirebaseUid(uid, email != null ? email : "", name != null ? name : "");
    }

    // ── course + tasks upload (Course page + Dashboard) ─────────────────────

    @PostMapping("/course")
    public ResponseEntity<Map<String, Object>> uploadCourseFile(
            HttpServletRequest request,
            @RequestParam("file") MultipartFile file) {
        fileValidator.validate(file);
        try {
            User user = getUserFromRequest(request);
            String userId = user.getId().toString();
            String weekContext = academicCalendarService.buildWeekContext(user.getId());
            DocumentService.CourseAndTasks result = documentService.extractCourseAndTasksFromFile(file, weekContext);

            // Every module code the file references, from extracted course info and from tasks.
            Set<String> referencedCodes = new java.util.HashSet<>();
            result.courses().stream()
                    .map(Course::getModuleCode)
                    .filter(code -> code != null && !code.isBlank())
                    .forEach(referencedCodes::add);
            result.tasks().stream()
                    .map(Task::getModuleCode)
                    .filter(code -> code != null && !code.isBlank())
                    .forEach(referencedCodes::add);

            Set<String> invalidModules = courseService.findUnknownModuleCodes(referencedCodes);
            if (!invalidModules.isEmpty()) {
            String codesJoined = String.join(", ", invalidModules);
            String message = invalidModules.size() == 1
                ? "The uploaded slides reference an unknown module (" + codesJoined + "). Please check the module code and try again."
                : "The uploaded slides reference unknown modules (" + codesJoined + "). Please check the module codes and try again.";
            return ResponseEntity.badRequest().body(Map.of(
                "error", "INVALID_MODULES",
                "invalidModules", invalidModules,
                "message", message
            ));
            }

            // The user's own added courses are the source of truth for what they're allowed to upload for.
            Set<String> ownedCodes = courseService.getCoursesByUser(user.getId()).stream()
                    .map(Course::getModuleCode)
                .filter(code -> code != null && !code.isBlank())
                .map(String::toUpperCase)
                .collect(Collectors.toSet());

            Set<String> notAdded = referencedCodes.stream()
                .map(code -> code == null ? null : code.toUpperCase())
                .filter(code -> code != null && !ownedCodes.contains(code))
                .collect(Collectors.toCollection(java.util.TreeSet::new));

            if (!notAdded.isEmpty()) {
                String codesJoined = String.join(", ", notAdded);
                String message = notAdded.size() == 1
                    ? "This module (" + codesJoined + ") is not in your courses yet. Add it now to create the tasks found in the slides too?"
                    : "These modules (" + codesJoined + ") are not in your courses yet. Add them now to create the tasks found in the slides too?";
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "error", "MODULE_NOT_IN_COURSES",
                    "missingModules", notAdded,
                    "message", message,
                    "requiresConfirmation", true,
                    "previewId", storePreview(user.getId(), result)
                ));
            }

            if (isRateLimited(userId)) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                        "Please wait a moment before uploading again.");
            }

            PersistedUpload saved = persistUploadResult(user.getId(), user, result);
            markUploadTime(userId);

            return ResponseEntity.ok(Map.of(
                "courses", saved.courses().stream().map(CourseResponse::from).toList(),
                "tasks",   saved.tasks().stream().map(TaskResponse::from).toList()
            ));
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage() != null ? e.getMessage() : e.getClass().getName()));
        }
    }

    @PostMapping("/course/confirm")
    public ResponseEntity<Map<String, Object>> confirmCourseUpload(
            HttpServletRequest request,
            @RequestParam("previewId") String previewId) {
        try {
            User user = getUserFromRequest(request);
            String userId = user.getId().toString();
            if (isRateLimited(userId)) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                        "Please wait a moment before uploading again.");
            }

            UploadPreview preview = consumePreview(previewId, user.getId());
            if (preview == null) {
                throw new ResponseStatusException(HttpStatus.GONE,
                        "This upload preview expired or is no longer available. Please upload the file again.");
            }

                PersistedUpload saved = persistUploadResult(user.getId(), user, preview.result());
            markUploadTime(userId);

            return ResponseEntity.ok(Map.of(
                    "courses", saved.courses().stream().map(CourseResponse::from).toList(),
                    "tasks", saved.tasks().stream().map(TaskResponse::from).toList()
            ));
            } catch (ResponseStatusException e) {
                throw e;
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage() != null ? e.getMessage() : e.getClass().getName()));
        }
    }
}