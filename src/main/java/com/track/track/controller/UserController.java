package com.track.track.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.track.track.model.User;
import com.track.track.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Max 10KB for preferences — enough for any reasonable settings object
    private static final int MAX_PREFERENCES_BYTES = 10_240;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    private User getUserFromRequest(HttpServletRequest request) {
        String uid = (String) request.getAttribute("firebaseUid");
        String email = (String) request.getAttribute("firebaseEmail");
        String name = (String) request.getAttribute("firebaseName");
        return userService.findOrCreateByFirebaseUid(uid, email != null ? email : "", name != null ? name : "");
    }

    @GetMapping("/preferences")
    public ResponseEntity<Map<String, Object>> getPreferences(HttpServletRequest request) {
        User user = getUserFromRequest(request);
        String prefs = user.getPreferences();
        return ResponseEntity.ok(Map.of("preferences", prefs != null ? prefs : "{}"));
    }

    @PutMapping("/preferences")
    public ResponseEntity<Map<String, Object>> updatePreferences(
            HttpServletRequest request,
            @RequestBody Map<String, Object> preferencesMap) {
        try {
            String prefsString = objectMapper.writeValueAsString(preferencesMap);

            // Reject oversized payloads
            if (prefsString.getBytes().length > MAX_PREFERENCES_BYTES) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Preferences payload too large (max 10KB)"));
            }

            User user = getUserFromRequest(request);
            user.setPreferences(prefsString);
            userService.saveUser(user);
            return ResponseEntity.ok(Map.of("preferences", prefsString));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
}