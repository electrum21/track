package com.track.track.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;

@Entity
@Table(name = "tasks")
public class Task {

    @Id // Primary key
    @GeneratedValue(strategy = GenerationType.UUID) // PostgreSQL automatically generates a unique ID for every new row
    private UUID id;

    @ManyToOne // Many tasks can belong to one user
    @JoinColumn(name = "user_id", nullable = false) // Foreign key column in the tasks table that points to the users table
    private User user;

    @ManyToOne 
    @JoinColumn(name = "source_file_id")
    private UploadedFile sourceFile;

    @NotBlank // Spring will reject the request before it even reaches the database if title is empty.
    @Column(nullable = false)
    private String title;

    @NotBlank // Spring will reject the request before it even reaches the database if title is empty.
    @Column(nullable = false)
    private String moduleCode;

    @Enumerated(EnumType.STRING)
    private TaskType type;

    private LocalDate dueDate;

    private LocalTime dueTime;

    @Column(columnDefinition = "TEXT")
    private String dueDateRaw;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status;

    private Float weightage;

    private Float confidence;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = TaskStatus.NEEDS_REVIEW;
        }
    }

    public UUID getId() { 
        return id; 
    }

    public User getUser() { 
        return user; 
    }
    public void setUser(User user) { 
        this.user = user; 
    }

    public UploadedFile getSourceFile() { 
        return sourceFile; 
    }

    public void setSourceFile(UploadedFile sourceFile) { 
        this.sourceFile = sourceFile; 
    }

    public String getTitle() { 
        return title; 
    }

    public void setTitle(String title) { 
        this.title = title; 
    }

    public String getModuleCode() { 
        return moduleCode; 
    }

    public void setModuleCode(String moduleCode) { 
        this.moduleCode = moduleCode; 
    }

    public TaskType getType() { 
        return type; 
    }

    public void setType(TaskType type) { 
        this.type = type; 
    }

    public LocalDate getDueDate() { 
        return dueDate; 
    }

    public void setDueDate(LocalDate dueDate) { 
        this.dueDate = dueDate; 
    }

    public LocalTime getDueTime() { 
        return dueTime; 
    }
    
    public void setDueTime(LocalTime dueTime) { 
        this.dueTime = dueTime; 
    }

    public String getDueDateRaw() { 
        return dueDateRaw; 
    }

    public void setDueDateRaw(String dueDateRaw) { 
        this.dueDateRaw = dueDateRaw; 
    }

    public TaskStatus getStatus() { 
        return status; 
    }

    public void setStatus(TaskStatus status) { 
        this.status = status; 
    }

    public Float getWeightage() { 
        return weightage; 
    }

    public void setWeightage(Float weightage) { 
        this.weightage = weightage; 
    }

    public Float getConfidence() { 
        return confidence; 
    }

    public void setConfidence(Float confidence) { 
        this.confidence = confidence; 
    }

    public String getNote() { 
        return note; 
    }
    public void setNote(String note) { 
        this.note = note; 
    }

    public LocalDateTime getCreatedAt() { 
        return createdAt; 
    }
    
}