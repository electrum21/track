package com.track.track.dto;

import com.track.track.model.Course;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class CourseResponse {

    private UUID id;
    private UUID userId;
    private String moduleCode;
    private String name;
    private String prof;
    private LocalDate examDate;
    private String examVenue;
    private LocalDateTime createdAt;

    private CourseResponse() {}

    public static CourseResponse from(Course course) {
        CourseResponse dto = new CourseResponse();
        dto.id = course.getId();
        dto.userId = course.getUser().getId();
        dto.moduleCode = course.getModuleCode();
        dto.name = course.getName();
        dto.prof = course.getProf();
        dto.examDate = course.getExamDate();
        dto.examVenue = course.getExamVenue();
        dto.createdAt = course.getCreatedAt();
        return dto;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getModuleCode() { return moduleCode; }
    public String getName() { return name; }
    public String getProf() { return prof; }
    public LocalDate getExamDate() { return examDate; }
    public String getExamVenue() { return examVenue; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}