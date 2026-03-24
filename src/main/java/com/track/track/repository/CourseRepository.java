package com.track.track.repository;

import com.track.track.model.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseRepository extends JpaRepository<Course, UUID> {
    List<Course> findByUserId(UUID userId);
    Optional<Course> findByUserIdAndModuleCode(UUID userId, String moduleCode);
    void deleteByUserId(UUID userId);
}