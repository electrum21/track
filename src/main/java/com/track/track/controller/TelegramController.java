package com.track.track.controller;

import com.track.track.dto.TaskResponse;
import com.track.track.model.TelegramLinkCode;
import com.track.track.model.User;
import com.track.track.model.Task;
import com.track.track.service.TaskService;
import com.track.track.service.TelegramLinkService;
import com.track.track.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.time.ZoneOffset;

@RestController
public class TelegramController {

    private final TelegramLinkService telegramLinkService;
    private final UserService userService;
    private final TaskService taskService;

    @Value("${telegram.bot.shared-secret}")
    private String botSharedSecret;

    public TelegramController(TelegramLinkService telegramLinkService, UserService userService, TaskService taskService) {
        this.telegramLinkService = telegramLinkService;
        this.userService = userService;
        this.taskService = taskService;
    }

    // ── user-facing (Firebase-authenticated, called from the website) ──────

    private User getUserFromRequest(HttpServletRequest request) {
        String uid = (String) request.getAttribute("firebaseUid");
        String email = (String) request.getAttribute("firebaseEmail");
        String name = (String) request.getAttribute("firebaseName");
        return userService.findOrCreateByFirebaseUid(uid, email != null ? email : "", name != null ? name : "");
    }

    @GetMapping("/api/telegram/status")
    public ResponseEntity<TelegramLinkService.TelegramLinkStatus> getStatus(HttpServletRequest request) {
        User user = getUserFromRequest(request);
        return ResponseEntity.ok(telegramLinkService.getStatus(user));
    }

    @PostMapping("/api/telegram/link-code")
    public ResponseEntity<Map<String, Object>> generateLinkCode(HttpServletRequest request) {
        User user = getUserFromRequest(request);
        TelegramLinkCode linkCode = telegramLinkService.createLinkCode(user);
        return ResponseEntity.ok(Map.of(
                "code", linkCode.getCode(),
                "expiresAt", linkCode.getExpiresAt().atZone(ZoneOffset.systemDefault()).withZoneSameInstant(ZoneOffset.UTC).toString()
        ));
    }

    @DeleteMapping("/api/telegram/link")
    public ResponseEntity<Void> unlink(HttpServletRequest request) {
        User user = getUserFromRequest(request);
        telegramLinkService.unlink(user);
        return ResponseEntity.noContent().build();
    }

    // ── bot-facing (shared-secret authenticated, called from the Python bot) ──

    private boolean isValidBotSecret(HttpServletRequest request) {
        String provided = request.getHeader("X-Bot-Secret");
        return provided != null && provided.equals(botSharedSecret);
    }

    @PostMapping("/internal/telegram/consume")
    public ResponseEntity<Map<String, Object>> consumeLinkCode(
            HttpServletRequest request,
            @RequestBody Map<String, String> body) {
        if (!isValidBotSecret(request)) return ResponseEntity.status(403).build();

        String code = body.get("code");
        String chatId = body.get("chatId");
        User user = telegramLinkService.consumeLinkCode(code, chatId);
        return ResponseEntity.ok(Map.of(
                "email", user.getEmail() != null ? user.getEmail() : "",
                "name", user.getName() != null ? user.getName() : ""
        ));
    }

    @GetMapping("/internal/telegram/user/{chatId}")
    public ResponseEntity<Map<String, Object>> getUserByChatId(
            HttpServletRequest request,
            @PathVariable String chatId) {
        if (!isValidBotSecret(request)) return ResponseEntity.status(403).build();

        Optional<User> user = telegramLinkService.getUserByTelegramChatId(chatId);
        if (user.isEmpty()) return ResponseEntity.notFound().build();

        return ResponseEntity.ok(Map.of(
                "id", user.get().getId().toString(),
                "email", user.get().getEmail() != null ? user.get().getEmail() : "",
                "name", user.get().getName() != null ? user.get().getName() : ""
        ));
    }

    @GetMapping("/internal/telegram/tasks/{chatId}")
    public ResponseEntity<List<TaskResponse>> getTasksForChat(
            HttpServletRequest request,
            @PathVariable String chatId,
            @RequestParam(required = false, defaultValue = "all") String filter) {
        if (!isValidBotSecret(request)) return ResponseEntity.status(403).build();

        Optional<User> userOpt = telegramLinkService.getUserByTelegramChatId(chatId);
        if (userOpt.isEmpty()) return ResponseEntity.notFound().build();
        User user = userOpt.get();

        List<Task> tasks = switch (filter) {
            case "overdue" -> taskService.getOverdueTasks(user.getId());
            case "today" -> taskService.getTasksDueToday(user.getId());
            default -> taskService.getTasksByUser(user.getId());
        };

        return ResponseEntity.ok(tasks.stream().map(TaskResponse::from).toList());
    }

    @GetMapping("/internal/telegram/reminders/due")
    public ResponseEntity<Map<String, List<TaskResponse>>> getDueReminders(HttpServletRequest request) {
        if (!isValidBotSecret(request)) return ResponseEntity.status(403).build();

        Map<String, List<Task>> reminders = telegramLinkService.getDueReminders(3); // 3-day lookahead
        Map<String, List<TaskResponse>> response = reminders.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> e.getValue().stream().map(TaskResponse::from).toList()
                ));
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/internal/telegram/user/{chatId}")
    public ResponseEntity<Map<String, Object>> unlinkByChatId(
            HttpServletRequest request,
            @PathVariable String chatId) {
        if (!isValidBotSecret(request)) return ResponseEntity.status(403).build();

        Optional<User> user = telegramLinkService.getUserByTelegramChatId(chatId);
        if (user.isEmpty()) return ResponseEntity.notFound().build();

        telegramLinkService.unlink(user.get());
        return ResponseEntity.notFound().build();
    }
}