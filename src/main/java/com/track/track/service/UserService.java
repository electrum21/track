package com.track.track.service;

import com.track.track.model.User;
import com.track.track.repository.AcademicWeekRepository;
import com.track.track.repository.CourseRepository;
import com.track.track.repository.TaskRepository;
import com.track.track.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final CourseRepository courseRepository;
    private final AcademicWeekRepository academicWeekRepository;

    public UserService(UserRepository userRepository,
                       TaskRepository taskRepository,
                       CourseRepository courseRepository,
                       AcademicWeekRepository academicWeekRepository) {
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
        this.courseRepository = courseRepository;
        this.academicWeekRepository = academicWeekRepository;
    }

    public User saveUser(User user) {
        return userRepository.save(user);
    }

    public User findOrCreateByFirebaseUid(String uid, String email, String name) {
        return userRepository.findByFirebaseUid(uid).map(existing -> {
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

    /**
     * Deletes all user data (tasks, courses, academic weeks) then the user record itself.
     */
    @Transactional
    public void deleteUserAndAllData(String firebaseUid) {
        userRepository.findByFirebaseUid(firebaseUid).ifPresent(user -> {
            UUID userId = user.getId();
            taskRepository.deleteByUserId(userId);
            courseRepository.deleteByUserId(userId);
            academicWeekRepository.deleteByUserId(userId);
            userRepository.delete(user);
        });
    }
}