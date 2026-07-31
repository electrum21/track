package com.track.track.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.track.track.model.AcademicCalendarConfig;

import java.util.UUID;

@Repository
public interface AcademicCalendarConfigRepository extends JpaRepository<AcademicCalendarConfig, UUID> {
}