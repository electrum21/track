package com.track.track.controller;

import com.track.track.model.Task;
import com.track.track.model.TaskStatus;
import com.track.track.model.User;
import com.track.track.service.TaskService;
import com.track.track.service.UserService;
import com.track.track.dto.TaskResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;
    private final UserService userService;

    public TaskController(TaskService taskService, UserService userService) {
        this.taskService = taskService;
        this.userService = userService;
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
    public ResponseEntity<TaskResponse> updateTask(HttpServletRequest request, @PathVariable UUID id, @RequestBody Task task) {
        User user = getUserFromRequest(request);
        // Verify ownership before updating
        boolean owns = taskService.getTaskById(id)
                .map(t -> t.getUser().getId().equals(user.getId()))
                .orElse(false);
        if (!owns) return ResponseEntity.status(403).build();
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