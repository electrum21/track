package com.track.track.repository;

import com.track.track.model.AcademicWeek;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface AcademicWeekRepository extends JpaRepository<AcademicWeek, UUID> {
    List<AcademicWeek> findByUserIdOrderBySortOrder(UUID userId);
    void deleteByUserId(UUID userId);
}
