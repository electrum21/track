package com.track.track.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "courses")
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String moduleCode;

    private String name;
    private String prof;
    private LocalDate examDate;
    private String examVenue;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
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

    public String getModuleCode() { 
        return moduleCode; 
    }

    public void setModuleCode(String moduleCode) { 
        this.moduleCode = moduleCode; 
    }
    
    public String getName() { 
        return name; 
    }

    public void setName(String name) { 
        this.name = name; 
    }

    public String getProf() { 
        return prof; 
    }

    public void setProf(String prof) { 
        this.prof = prof; 
    }

    public LocalDate getExamDate() { 
        return examDate; 
    }

    public void setExamDate(LocalDate examDate) { 
        this.examDate = examDate; 
    }

    public String getExamVenue() { 
        return examVenue; 
    }

    public void setExamVenue(String examVenue) { 
        this.examVenue = examVenue; 
    }

    public LocalDateTime getCreatedAt() { 
        return createdAt; 
    }
    
}