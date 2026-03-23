package com.track.track.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "academic_weeks")
public class AcademicWeek {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private String weekLabel;   // "Week 1", "Recess", "Exam", "Study"
    private String weekType;    // "TEACHING", "RECESS", "EXAM"
    private Integer weekNumber; // 1-13 for teaching weeks, null for special
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer sortOrder;  // for ordering in the semester view

    public UUID getId() { 
        return id; 
    }

    public User getUser() { 
        return user; 
    }

    public void setUser(User user) { 
        this.user = user; 
    }

    public String getWeekLabel() { 
        return weekLabel; 
    }

    public void setWeekLabel(String weekLabel) { 
        this.weekLabel = weekLabel; 
    }

    public String getWeekType() { 
        return weekType; 
    }

    public void setWeekType(String weekType) { 
        this.weekType = weekType; 
    }

    public Integer getWeekNumber() { 
        return weekNumber; 
    }

    public void setWeekNumber(Integer weekNumber) { 
        this.weekNumber = weekNumber; 
    }

    public LocalDate getStartDate() { 
        return startDate; 
    }

    public void setStartDate(LocalDate startDate) { 
        this.startDate = startDate; 
    }

    public LocalDate getEndDate() { 
        return endDate; 
    }

    public void setEndDate(LocalDate endDate) { 
        this.endDate = endDate; 
    }

    public Integer getSortOrder() { 
        return sortOrder; 
    }

    public void setSortOrder(Integer sortOrder) { 
        this.sortOrder = sortOrder; 
    }
    
}
