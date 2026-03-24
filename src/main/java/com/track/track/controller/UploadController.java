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
import java.util.concurrent.ConcurrentHashMap;

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
            @RequestParam("file") MultipartFile file) {
        fileValidator.validate(file);
        try {
            User user = getUserFromRequest(request);
            checkRateLimit(user.getId().toString());
            String weekContext = academicCalendarService.buildWeekContext(user.getId());
            DocumentService.CourseAndTasks result = documentService.extractCourseAndTasksFromFile(file, weekContext);

            List<Course> savedCourses = new java.util.ArrayList<>();
            for (Course course : result.courses()) {
                course.setUser(user);
                Course existing = courseService.getCourseByUserAndCode(user.getId(), course.getModuleCode()).orElse(null);
                if (existing != null) {
                    if (course.getName() != null)      existing.setName(course.getName());
                    if (course.getProf() != null)      existing.setProf(course.getProf());
                    if (course.getExamDate() != null)  existing.setExamDate(course.getExamDate());
                    if (course.getExamVenue() != null) existing.setExamVenue(course.getExamVenue());
                    savedCourses.add(courseService.saveCourse(existing));
                } else {
                    savedCourses.add(courseService.saveCourse(course));
                }
            }

            List<Task> tasks = result.tasks();
            tasks.forEach(t -> t.setUser(user));
            List<Task> savedTasks = taskService.saveAll(tasks);

            java.util.Set<String> savedCodes = savedCourses.stream()
                    .map(Course::getModuleCode).collect(java.util.stream.Collectors.toSet());
            savedTasks.stream()
                    .map(Task::getModuleCode)
                    .filter(code -> code != null && !code.isBlank() && !savedCodes.contains(code))
                    .distinct()
                    .forEach(code -> courseService.getOrCreate(user.getId(), code, user));

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