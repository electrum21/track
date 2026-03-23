package com.track.track.controller;

import com.track.track.dto.CourseResponse;
import com.track.track.model.Course;
import com.track.track.model.User;
import com.track.track.service.CourseService;
import com.track.track.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/courses")
public class CourseController {

    private final CourseService courseService;
    private final UserService userService;

    public CourseController(CourseService courseService, UserService userService) {
        this.courseService = courseService;
        this.userService = userService;
    }

    private User getUserFromRequest(HttpServletRequest request) {
        String uid = (String) request.getAttribute("firebaseUid");
        String email = (String) request.getAttribute("firebaseEmail");
        String name = (String) request.getAttribute("firebaseName");
        return userService.findOrCreateByFirebaseUid(uid, email != null ? email : "", name != null ? name : "");
    }

    @GetMapping
    public ResponseEntity<List<CourseResponse>> getCourses(HttpServletRequest request) {
        User user = getUserFromRequest(request);
        return ResponseEntity.ok(
            courseService.getCoursesByUser(user.getId())
                .stream()
                .map(CourseResponse::from)
                .toList()
        );
    }

    @PostMapping
    public ResponseEntity<CourseResponse> createCourse(
            HttpServletRequest request,
            @RequestBody Course course) {
        User user = getUserFromRequest(request);
        course.setUser(user);
        return ResponseEntity.ok(CourseResponse.from(courseService.saveCourse(course)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CourseResponse> updateCourse(
            HttpServletRequest request,
            @PathVariable UUID id,
            @RequestBody Course course) {
        User user = getUserFromRequest(request);
        // Verify ownership before updating
        boolean owns = courseService.getCoursesByUser(user.getId())
                .stream().anyMatch(c -> c.getId().equals(id));
        if (!owns) return ResponseEntity.status(403).build();
        course.setUser(user);
        return ResponseEntity.ok(CourseResponse.from(courseService.updateCourse(id, course)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCourse(HttpServletRequest request, @PathVariable UUID id) {
        User user = getUserFromRequest(request);
        // Verify ownership before deleting
        boolean owns = courseService.getCoursesByUser(user.getId())
                .stream().anyMatch(c -> c.getId().equals(id));
        if (!owns) return ResponseEntity.status(403).build();
        courseService.deleteCourse(id);
        return ResponseEntity.noContent().build();
    }
}