package com.track.track.repository;

import com.track.track.model.Task;
import com.track.track.model.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository 
public interface TaskRepository extends JpaRepository<Task, UUID> {  // By extending JpaRepository, can inherit a full set of ready-made database methods for free, e.g. save, findAll, count, etc.

    List<Task> findByUserId(UUID userId);

    List<Task> findByUserIdAndStatus(UUID userId, TaskStatus status);
    // Equivalent to SELECT * FROM tasks WHERE user_id = ? AND status = ? in SQL

    List<Task> findByUserIdAndModuleCode(UUID userId, String moduleCode);

    void deleteByUserId(UUID userId);
}