package com.track.track.controller;

import com.track.track.model.Task;
import com.track.track.model.TaskStatus;
import com.track.track.model.User;
import com.track.track.service.TaskService;
import com.track.track.service.CourseService;
import com.track.track.service.UserService;
import com.track.track.dto.TaskResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;
    private final UserService userService;
    private final CourseService courseService;

    public TaskController(TaskService taskService, UserService userService, CourseService courseService) {
        this.taskService = taskService;
        this.userService = userService;
        this.courseService = courseService;
    }

    private User getUserFromRequest(HttpServletRequest request) {
        String uid = (String) request.getAttribute("firebaseUid");
        String email = (String) request.getAttribute("firebaseEmail");
        String name = (String) request.getAttribute("firebaseName");
        return userService.findOrCreateByFirebaseUid(uid, email != null ? email : "", name != null ? name : "");
    }

    @GetMapping
    public ResponseEntity<List<TaskResponse>> getTasks(
            HttpServletRequest request,
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) String moduleCode) {

        User user = getUserFromRequest(request);
        UUID userId = user.getId();

        if (status != null) {
            return ResponseEntity.ok(taskService.getTasksByUserAndStatus(userId, status).stream().map(TaskResponse::from).toList());
        }
        if (moduleCode != null) {
            return ResponseEntity.ok(taskService.getTasksByUserAndModule(userId, moduleCode).stream().map(TaskResponse::from).toList());
        }
        return ResponseEntity.ok(taskService.getTasksByUser(userId).stream().map(TaskResponse::from).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskResponse> getTaskById(HttpServletRequest request, @PathVariable UUID id) {
        User user = getUserFromRequest(request);
        return taskService.getTaskById(id)
                .filter(t -> t.getUser().getId().equals(user.getId()))
                .map(TaskResponse::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<TaskResponse> createTask(HttpServletRequest request, @RequestBody Task task) {
        User user = getUserFromRequest(request);
        task.setUser(user);
        return ResponseEntity.ok(TaskResponse.from(taskService.saveTask(task)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateTask(HttpServletRequest request, @PathVariable UUID id, @RequestBody Task task) {
        User user = getUserFromRequest(request);
        // Verify ownership before updating
        boolean owns = taskService.getTaskById(id)
                .map(t -> t.getUser().getId().equals(user.getId()))
                .orElse(false);
        if (!owns) return ResponseEntity.status(403).build();

        // Reassigning a task to a module code the user hasn't added yet must not
        // silently create that module — reject and tell the client to add it first.
        String moduleCode = task.getModuleCode();
        if (moduleCode != null && !moduleCode.isBlank()
                && courseService.getCourseByUserAndCode(user.getId(), moduleCode).isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "unknown_module",
                    "message", "\"" + moduleCode + "\" is not in your modules. Add it first if you want to move this task there."
            ));
        }

        task.setUser(user);
        return ResponseEntity.ok(TaskResponse.from(taskService.updateTask(id, task)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(HttpServletRequest request, @PathVariable UUID id) {
        User user = getUserFromRequest(request);
        boolean owns = taskService.getTaskById(id)
                .map(t -> t.getUser().getId().equals(user.getId()))
                .orElse(false);
        if (!owns) return ResponseEntity.status(403).build();
        taskService.deleteTask(id);
        return ResponseEntity.noContent().build();
    }
}