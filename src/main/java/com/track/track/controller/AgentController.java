package com.track.track.controller;

import com.track.track.model.User;
import com.track.track.service.AgentService;
import com.track.track.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/agent")
public class AgentController {

    private final AgentService agentService;
    private final UserService userService;

    public AgentController(AgentService agentService, UserService userService) {
        this.agentService = agentService;
        this.userService = userService;
    }

    @PostMapping("/chat")
    public ResponseEntity<Map<String, Object>> chat(
            HttpServletRequest request,
            @RequestBody Map<String, Object> body) {
        try {
            String uid = (String) request.getAttribute("firebaseUid");
            User user = userService.findOrCreateByFirebaseUid(uid, "", "");
            String message = (String) body.get("message");
            List<Map<String, String>> history = (List<Map<String, String>>) body.getOrDefault("history", List.of());
            return ResponseEntity.ok(agentService.chat(message, history, user));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("message", "Agent error: " + e.getMessage()));
        }
    }
}