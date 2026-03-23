package com.track.track.controller;

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
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/upload")
public class UploadController {

    private final TaskService taskService;
    private final DocumentService documentService;
    private final UserService userService;
    private final CourseService courseService;
    private final AcademicCalendarService academicCalendarService;

    public UploadController(TaskService taskService, DocumentService documentService,
                            UserService userService, CourseService courseService,
                            AcademicCalendarService academicCalendarService) {
        this.taskService = taskService;
        this.documentService = documentService;
        this.userService = userService;
        this.courseService = courseService;
        this.academicCalendarService = academicCalendarService;
    }

    private User getUserFromRequest(HttpServletRequest request) {
        String uid = (String) request.getAttribute("firebaseUid");
        String email = (String) request.getAttribute("firebaseEmail");
        String name = (String) request.getAttribute("firebaseName");
        return userService.findOrCreateByFirebaseUid(uid, email != null ? email : "", name != null ? name : "");
    }

    // ── task upload (Dashboard) — also upserts course info ─────────────────

    @PostMapping
    public ResponseEntity<List<TaskResponse>> uploadFile(
            HttpServletRequest request,
            @RequestParam("file") MultipartFile file) {
        try {
            User user = getUserFromRequest(request);
            String weekContext = academicCalendarService.buildWeekContext(user.getId());
            DocumentService.CourseAndTasks result = documentService.extractCourseAndTasksFromFile(file, weekContext);

            // Upsert all extracted courses
            java.util.Set<String> savedCodes2 = new java.util.HashSet<>();
            for (Course course : result.courses()) {
                course.setUser(user);
                Course existing = courseService.getCourseByUserAndCode(user.getId(), course.getModuleCode()).orElse(null);
                if (existing != null) {
                    if (course.getName() != null)      existing.setName(course.getName());
                    if (course.getProf() != null)      existing.setProf(course.getProf());
                    if (course.getExamDate() != null)  existing.setExamDate(course.getExamDate());
                    if (course.getExamVenue() != null) existing.setExamVenue(course.getExamVenue());
                    courseService.saveCourse(existing);
                } else {
                    courseService.saveCourse(course);
                }
                savedCodes2.add(course.getModuleCode());
            }

            // Save tasks
            List<Task> tasks = result.tasks();
            tasks.forEach(t -> t.setUser(user));
            List<Task> savedTasks = taskService.saveAll(tasks);

            // Ensure a course row exists for any task module code not already saved
            savedTasks.stream()
                    .map(Task::getModuleCode)
                    .filter(code -> code != null && !code.isBlank() && !savedCodes2.contains(code))
                    .distinct()
                    .forEach(code -> courseService.getOrCreate(user.getId(), code, user));

            return ResponseEntity.ok(savedTasks.stream().map(TaskResponse::from).toList());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(null);
        }
    }

    // ── new: course + tasks upload (Course page) ─────────────────────────────

    @PostMapping("/course")
    public ResponseEntity<Map<String, Object>> uploadCourseFile(
            HttpServletRequest request,
            @RequestParam("file") MultipartFile file) {
        try {
            User user = getUserFromRequest(request);
            String weekContext = academicCalendarService.buildWeekContext(user.getId());
            DocumentService.CourseAndTasks result = documentService.extractCourseAndTasksFromFile(file, weekContext);

            // Upsert all extracted courses
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

            // Save tasks
            List<Task> tasks = result.tasks();
            tasks.forEach(t -> t.setUser(user));
            List<Task> savedTasks = taskService.saveAll(tasks);

            // Ensure a course row exists for any task module code not already saved
            java.util.Set<String> savedCodes = savedCourses.stream()
                    .map(Course::getModuleCode).collect(java.util.stream.Collectors.toSet());
            savedTasks.stream()
                    .map(Task::getModuleCode)
                    .filter(code -> code != null && !code.isBlank() && !savedCodes.contains(code))
                    .distinct()
                    .forEach(code -> courseService.getOrCreate(user.getId(), code, user));

            return ResponseEntity.ok(Map.of(
                "courses", savedCourses.stream().map(CourseResponse::from).toList(),
                "tasks", savedTasks.stream().map(TaskResponse::from).toList()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage() != null ? e.getMessage() : e.getClass().getName()));
        }
    }
}