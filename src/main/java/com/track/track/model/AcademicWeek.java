package com.track.track.model;

import java.time.LocalDate;

// NOT a JPA entity - a week row is computed on the fly from the single
// Week 1 start date stored in AcademicCalendarConfig, never persisted
// individually. See AcademicCalendarService.getWeeks().
public class AcademicWeek {

    private String weekLabel;   // "Week 1", "Recess", "Exam Week"
    private String weekType;    // "TEACHING", "RECESS", "EXAM"
    private Integer weekNumber; // 1-13 for teaching weeks, null for special
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer sortOrder;  // for ordering in the semester view

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