package com.track.track.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;

// Single-row config: the Monday that Week 1 of the semester begins.
// Everything else (recess week, exam weeks) is calculated from it in
// AcademicCalendarService.
@Entity
@Table(name = "academic_calendar_config")
public class AcademicCalendarConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private LocalDate week1Start;

    public UUID getId() {
        return id;
    }

    public LocalDate getWeek1Start() {
        return week1Start;
    }

    public void setWeek1Start(LocalDate week1Start) {
        this.week1Start = week1Start;
    }
}