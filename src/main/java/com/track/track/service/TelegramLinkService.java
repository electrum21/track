package com.track.track.service;

import com.track.track.model.TelegramLinkCode;
import com.track.track.model.User;
import com.track.track.model.Task;
import com.track.track.service.TaskService;
import com.track.track.repository.TelegramLinkCodeRepository;
import com.track.track.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;

@Service
public class TelegramLinkService {

    private static final String ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int CODE_LENGTH = 8;
    private static final int CODE_TTL_MINUTES = 10;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final TelegramLinkCodeRepository linkCodeRepository;
    private final UserRepository userRepository;
    private final TaskService taskService;

    public TelegramLinkService(TelegramLinkCodeRepository linkCodeRepository,
                                UserRepository userRepository, TaskService taskService) {
        this.linkCodeRepository = linkCodeRepository;
        this.userRepository = userRepository;
        this.taskService = taskService;
    }

    @Transactional
    public TelegramLinkCode createLinkCode(User user) {
        // invalidate previously unused codes for the user
        linkCodeRepository.deleteByUserIdAndUsedFalse(user.getId());

        String code = generateUniqueCode();

        TelegramLinkCode linkCode = new TelegramLinkCode();
        linkCode.setUserId(user.getId());
        linkCode.setCode(code);
        linkCode.setExpiresAt(LocalDateTime.now().plusMinutes(CODE_TTL_MINUTES));
        linkCode.setUsed(false);

        return linkCodeRepository.save(linkCode);
    }

    @Transactional
    public User consumeLinkCode(String code, String telegramChatId) {
        TelegramLinkCode linkCode = linkCodeRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Invalid link code"));

        if (linkCode.isUsed()) {
            throw new RuntimeException("Link code has already been used");
        }
        if (linkCode.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Link code has expired");
        }

        User user = userRepository.findById(linkCode.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found for this link code"));

        user.setTelegramChatId(telegramChatId);
        userRepository.save(user);

        linkCode.setUsed(true);
        linkCodeRepository.save(linkCode);

        return user;
    }

    public Optional<User> getUserByTelegramChatId(String chatId) {
        return userRepository.findByTelegramChatId(chatId);
    }

    public TelegramLinkStatus getStatus(User user) {
        boolean linked = user.getTelegramChatId() != null && !user.getTelegramChatId().isBlank();
        return new TelegramLinkStatus(linked, linked ? user.getTelegramChatId() : null);
    }

    @Transactional
    public void unlink(User user) {
        user.setTelegramChatId(null);
        userRepository.save(user);
    }

    private String generateUniqueCode() {
        String code;
        do {
            code = generateCode();
        } while (linkCodeRepository.findByCode(code).isPresent());
        return code;
    }

    private String generateCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }

    public record TelegramLinkStatus(boolean linked, String chatId) {}

    public Map<String, List<Task>> getDueReminders(int dueSoonDays) {
        Map<String, List<Task>> reminders = new HashMap<>();
        List<User> linkedUsers = userRepository.findByTelegramChatIdIsNotNull();

        for (User user : linkedUsers) {
            List<Task> overdue = taskService.getOverdueTasks(user.getId());
            List<Task> dueSoon = taskService.getTasksDueWithin(user.getId(), dueSoonDays);

            List<Task> combined = new ArrayList<>(overdue);
            combined.addAll(dueSoon);

            if (!combined.isEmpty()) {
                reminders.put(user.getTelegramChatId(), combined);
            }
        }
        return reminders;
    }
}