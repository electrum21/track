package com.track.track.controller;

import com.track.track.config.FileValidator;
import com.track.track.dto.CourseResponse;
import com.track.track.dto.TaskResponse;
import com.track.track.dto.UploadConfirmRequest;
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

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/upload")
public class UploadController {

    private final TaskService taskService;
    private final DocumentService documentService;
    private final UserService userService;
    private final CourseService courseService;
    private final AcademicCalendarService academicCalendarService;
    private final FileValidator fileValidator;

    // Simple per-user upload cooldown: 15 seconds between uploads
    private static final long UPLOAD_COOLDOWN_MS = 15_000;
    private final ConcurrentHashMap<String, Long> lastUploadTime = new ConcurrentHashMap<>();

    private void checkRateLimit(String userId) {
        long now = System.currentTimeMillis();
        Long last = lastUploadTime.get(userId);
        if (last != null && now - last < UPLOAD_COOLDOWN_MS)
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "Please wait a moment before uploading again.");
        lastUploadTime.put(userId, now);
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
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "moduleCode", required = false) String moduleCodeHint) {
        fileValidator.validate(file);
        try {
            User user = getUserFromRequest(request);
            checkRateLimit(user.getId().toString());
            String weekContext = academicCalendarService.buildWeekContext(user.getId());
            DocumentService.CourseAndTasks result = documentService.extractCourseAndTasksFromFile(file, weekContext);

            String hint = (moduleCodeHint != null && !moduleCodeHint.isBlank())
                    ? moduleCodeHint.trim().toUpperCase()
                    : null;

            // Uploads made from within a specific module's page (Course page) pass a moduleCode
            // hint. Any extracted task without a detected module code is assumed to belong to
            // that module, rather than being silently dropped later on.
            if (hint != null) {
                result.tasks().stream()
                        .filter(t -> t.getModuleCode() == null || t.getModuleCode().isBlank())
                        .forEach(t -> t.setModuleCode(hint));
            }

            // Every module code the file references — from extracted course info and from tasks.
            Set<String> referencedCodes = new HashSet<>();
            result.courses().stream()
                    .map(Course::getModuleCode)
                    .filter(code -> code != null && !code.isBlank())
                    .forEach(referencedCodes::add);
            result.tasks().stream()
                    .map(Task::getModuleCode)
                    .filter(code -> code != null && !code.isBlank())
                    .forEach(referencedCodes::add);

            // If we know which module this upload is supposed to be for, and nothing extracted
            // from the file actually references that module, don't save anything — the file
            // is probably for a different module entirely. Hold the extracted data client-side
            // (same pattern as the missing-module confirmation below) and let the user decide.
            if (hint != null && !referencedCodes.isEmpty() && !referencedCodes.contains(hint)) {
                return ResponseEntity.ok(Map.of(
                    "moduleMismatch", true,
                    "expectedModule", hint,
                    "detectedModules", new TreeSet<>(referencedCodes),
                    "courses", result.courses().stream().map(CourseResponse::from).toList(),
                    "tasks", result.tasks().stream().map(TaskResponse::from).toList()
                ));
            }

            // The user's own added courses are the source of truth for what they're allowed to upload for.
            Set<String> ownedCodes = courseService.getCoursesByUser(user.getId()).stream()
                    .map(Course::getModuleCode)
                    .collect(Collectors.toSet());

            Set<String> notAdded = referencedCodes.stream()
                    .filter(code -> !ownedCodes.contains(code))
                    .collect(Collectors.toCollection(TreeSet::new));

            if (!notAdded.isEmpty()) {
                // Split into codes that are real NTU modules (can be offered as "add this?")
                // vs ones that aren't in the catalog at all (nothing sensible to add).
                Set<String> catalogCodes = courseService.getModuleCatalog().stream()
                        .map(Course::getModuleCode)
                        .collect(Collectors.toSet());
                Set<String> invalid = notAdded.stream()
                        .filter(code -> !catalogCodes.contains(code))
                        .collect(Collectors.toCollection(TreeSet::new));

                if (!invalid.isEmpty()) {
                    String codesJoined = String.join(", ", invalid);
                    String message = invalid.size() == 1
                            ? "\"" + codesJoined + "\" doesn't match any NTU module we recognize, so it can't be added automatically. Please check the file or add the course manually."
                            : "\"" + codesJoined + "\" don't match any NTU modules we recognize, so they can't be added automatically. Please check the file or add the courses manually.";
                    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                        "error", "INVALID_MODULE",
                        "invalidModules", invalid,
                        "message", message
                    ));
                }

                // Every missing code is a valid NTU module — don't save anything yet.
                // Let the client confirm adding it, then hit /course/confirm with this same payload.
                return ResponseEntity.ok(Map.of(
                    "needsConfirmation", true,
                    "missingModules", notAdded,
                    "courses", result.courses().stream().map(CourseResponse::from).toList(),
                    "tasks", result.tasks().stream().map(TaskResponse::from).toList()
                ));
            }

            List<Course> savedCourses = new ArrayList<>();
            for (Course course : result.courses()) {
                Course existing = courseService.getCourseByUserAndCode(user.getId(), course.getModuleCode())
                        .orElseThrow(); // guaranteed present — checked above
                if (course.getName() != null)      existing.setName(course.getName());
                if (course.getProf() != null)      existing.setProf(course.getProf());
                if (course.getExamDate() != null)  existing.setExamDate(course.getExamDate());
                if (course.getExamVenue() != null) existing.setExamVenue(course.getExamVenue());
                savedCourses.add(courseService.saveCourse(existing));
            }

            List<Task> tasks = result.tasks().stream()
                .filter(t -> t.getModuleCode() != null && !t.getModuleCode().isBlank())
                .collect(Collectors.toList());
            tasks.forEach(t -> t.setUser(user));
            List<Task> savedTasks = taskService.saveAll(tasks);

            return ResponseEntity.ok(Map.of(
                "courses", savedCourses.stream().map(CourseResponse::from).toList(),
                "tasks",   savedTasks.stream().map(TaskResponse::from).toList()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage() != null ? e.getMessage() : e.getClass().getName()));
        }
    }

    // Called after the user confirms "add this module to my courses" on a needsConfirmation
    // response above. Persists the courses/tasks that were extracted but not yet saved —
    // no re-parsing of the original file needed.
    @PostMapping("/course/confirm")
    public ResponseEntity<Map<String, Object>> confirmCourseUpload(
            HttpServletRequest request,
            @RequestBody UploadConfirmRequest body) {
        try {
            User user = getUserFromRequest(request);

            List<Course> savedCourses = new ArrayList<>();
            if (body.getCourses() != null) {
                for (UploadConfirmRequest.CourseItem item : body.getCourses()) {
                    if (item.getModuleCode() == null || item.getModuleCode().isBlank()) continue;
                    Course existing = courseService.getCourseByUserAndCode(user.getId(), item.getModuleCode())
                            .orElseGet(() -> {
                                Course c = new Course();
                                c.setUser(user);
                                c.setModuleCode(item.getModuleCode());
                                return c;
                            });
                    if (item.getName() != null)      existing.setName(item.getName());
                    if (item.getProf() != null)      existing.setProf(item.getProf());
                    if (item.getExamDate() != null)  existing.setExamDate(item.getExamDate());
                    if (item.getExamVenue() != null) existing.setExamVenue(item.getExamVenue());
                    savedCourses.add(courseService.saveCourse(existing));
                }
            }

            List<Task> tasks = new ArrayList<>();
            if (body.getTasks() != null) {
                for (UploadConfirmRequest.TaskItem item : body.getTasks()) {
                    if (item.getModuleCode() == null || item.getModuleCode().isBlank()) continue;
                    Task t = new Task();
                    t.setUser(user);
                    t.setTitle(item.getTitle());
                    t.setModuleCode(item.getModuleCode());
                    t.setType(item.getType());
                    t.setDueDate(item.getDueDate());
                    t.setDueTime(item.getDueTime());
                    t.setDueDateRaw(item.getDueDateRaw());
                    t.setStatus(item.getStatus());
                    t.setWeightage(item.getWeightage());
                    t.setConfidence(item.getConfidence());
                    t.setNote(item.getNote());
                    tasks.add(t);
                }
            }
            List<Task> savedTasks = taskService.saveAll(tasks);

            return ResponseEntity.ok(Map.of(
                "courses", savedCourses.stream().map(CourseResponse::from).toList(),
                "tasks",   savedTasks.stream().map(TaskResponse::from).toList()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage() != null ? e.getMessage() : e.getClass().getName()));
        }
    }
}