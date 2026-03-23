package com.track.track.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "uploaded_files")
public class UploadedFile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String originalFilename;

    @Column(nullable = false)
    private String storagePath;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FileStatus status;

    @Column(nullable = false, updatable = false)
    private LocalDateTime uploadedAt;

    @PrePersist
    protected void onCreate() {
        this.uploadedAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = FileStatus.PROCESSING;
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

    public String getOriginalFilename() { 
        return originalFilename; 
    }

    public void setOriginalFilename(String originalFilename) { 
        this.originalFilename = originalFilename; 
    }

    public String getStoragePath() { 
        return storagePath; 
    }

    public void setStoragePath(String storagePath) { 
        this.storagePath = storagePath; 
    }

    public FileStatus getStatus() { 
        return status; 
    }

    public void setStatus(FileStatus status) { 
        this.status = status; 
    }

    public LocalDateTime getUploadedAt() { 
        return uploadedAt; 
    }
}