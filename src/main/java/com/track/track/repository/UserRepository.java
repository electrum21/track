package com.track.track.repository;

import com.track.track.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;
import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByFirebaseUid(String firebaseUid);
    Optional<User> findByTelegramChatId(String telegramChatId);
    List<User> findByTelegramChatIdIsNotNull();
}