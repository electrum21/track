package com.track.track.repository;

import com.track.track.model.TelegramLinkCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TelegramLinkCodeRepository extends JpaRepository<TelegramLinkCode, UUID> {

    Optional<TelegramLinkCode> findByCode(String code);

    void deleteByUserIdAndUsedFalse(UUID userId);
}