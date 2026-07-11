package com.track.track.controller;

import com.track.track.model.TelegramLinkCode;
import com.track.track.model.User;
import com.track.track.service.TelegramLinkService;
import com.track.track.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
public class TelegramController {

    private final TelegramLinkService telegramLinkService;
    private final UserService userService;

    @Value("${telegram.bot.shared-secret}")
    private String botSharedSecret;

    public TelegramController(TelegramLinkService telegramLinkService, UserService userService) {
        this.telegramLinkService = telegramLinkService;
        this.userService = userService;
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
                "expiresAt", linkCode.getExpiresAt().toString()
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
}