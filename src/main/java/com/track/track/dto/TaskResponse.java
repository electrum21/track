package com.track.track.dto;

import com.track.track.model.Task;
import com.track.track.model.TaskStatus;
import com.track.track.model.TaskType;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

// DTO (Data Transfer Object) — controls exactly what gets exposed in the API response
// We never return the raw Task entity because it contains sensitive nested User data
public class TaskResponse {

    // Only the user's UUID — never the full User object with passwordHash, email, etc.
    private UUID userId;

    private UUID id;
    private String title;
    private String moduleCode;

    // Stored as enum in DB, serialized as string in JSON e.g. "ASSIGNMENT"
    private TaskType type;

    private LocalDate dueDate;
    private LocalTime dueTime;

    // Exactly what the document said e.g. "Week 10", "15 April 5pm"
    private String dueDateRaw;

    // CONFIRMED, NEEDS_REVIEW, PENDING_DATE, or COMPLETED
    private TaskStatus status;

    // Grading weightage of task
    private Float weightage;

    // How confident Gemini was in the extraction (0.0 - 1.0)
    private Float confidence;

    // Gemini's explanation if confidence is low or date is unresolved
    private String note;

    private LocalDateTime createdAt;

    // Static factory method — converts a Task entity into a TaskResponse DTO
    // Called like: TaskResponse.from(task)
    public static TaskResponse from(Task task) {
        TaskResponse dto = new TaskResponse();

        dto.id = task.getId();

        // Extract only the userId from the nested User object
        dto.userId = task.getUser() != null ? task.getUser().getId() : null;

        dto.title = task.getTitle();
        dto.moduleCode = task.getModuleCode();
        dto.type = task.getType();
        dto.dueDate = task.getDueDate();
        dto.dueTime = task.getDueTime();
        dto.dueDateRaw = task.getDueDateRaw();
        dto.status = task.getStatus();
        dto.weightage = task.getWeightage();
        dto.confidence = task.getConfidence();
        dto.note = task.getNote();
        dto.createdAt = task.getCreatedAt();

        return dto;
    }

    // Getters — no setters needed since this object is only ever read, not modified
    public UUID getId() { 
        return id; 
    }

    public UUID getUserId() { 
        return userId; 
    }

    public String getTitle() { 
        return title; 
    }

    public String getModuleCode() { 
        return moduleCode; 
    }

    public TaskType getType() { 
        return type; 
    }

    public LocalDate getDueDate() { 
        return dueDate; 
    }

    public LocalTime getDueTime() { 
        return dueTime; 
    }

    public String getDueDateRaw() { 
        return dueDateRaw; 
    }

    public TaskStatus getStatus() { 
        return status; 
    }

    public Float getWeightage() { 
        return weightage; 
    }

    public Float getConfidence() { 
        return confidence; 
    }

    public String getNote() { 
        return note; 
    }

    public LocalDateTime getCreatedAt() { 
        return createdAt; 
    }
    
}