package com.track.track.service;

import com.track.track.model.User;
import com.track.track.repository.UserRepository;
import org.springframework.stereotype.Service;
import java.util.Optional;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User saveUser(User user) {
        return userRepository.save(user);
    }

    public User findOrCreateByFirebaseUid(String uid, String email, String name) {
        return userRepository.findByFirebaseUid(uid).map(existing -> {
            // Update email/name if we now have real values and didn't before
            boolean changed = false;
            if ((existing.getEmail() == null || existing.getEmail().isBlank())
                    && email != null && !email.isBlank()) {
                existing.setEmail(email);
                changed = true;
            }
            if ((existing.getName() == null || existing.getName().isBlank())
                    && name != null && !name.isBlank()) {
                existing.setName(name);
                changed = true;
            }
            return changed ? userRepository.save(existing) : existing;
        }).orElseGet(() -> {
            User user = new User();
            user.setFirebaseUid(uid);
            user.setEmail(email != null && !email.isBlank() ? email : null);
            user.setName(name != null && !name.isBlank() ? name : null);
            return userRepository.save(user);
        });
    }

    public Optional<User> getUserById(UUID id) {
        return userRepository.findById(id);
    }

    public Optional<User> getUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public boolean existsByEmail(String email) {
        return userRepository.findByEmail(email).isPresent();
    }
}