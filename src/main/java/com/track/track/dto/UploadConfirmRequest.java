package com.track.track.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.track.track.model.TaskStatus;
import com.track.track.model.TaskType;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

// Request body for POST /api/upload/course/confirm.
// The client just echoes back the "courses" and "tasks" it received in a prior
// needsConfirmation response (see UploadController) — nothing was persisted at that
// point, so this is what actually saves them, once the user has agreed to add the
// missing module(s). @JsonIgnoreProperties so it's safe to pass the full CourseResponse/
// TaskResponse shape back (id, userId, createdAt etc.) without a deserialization error.
public class UploadConfirmRequest {

    private List<CourseItem> courses;
    private List<TaskItem> tasks;

    public List<CourseItem> getCourses() { return courses; }
    public void setCourses(List<CourseItem> courses) { this.courses = courses; }

    public List<TaskItem> getTasks() { return tasks; }
    public void setTasks(List<TaskItem> tasks) { this.tasks = tasks; }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CourseItem {
        private String moduleCode;
        private String name;
        private String prof;
        private LocalDate examDate;
        private String examVenue;

        public String getModuleCode() { return moduleCode; }
        public void setModuleCode(String moduleCode) { this.moduleCode = moduleCode; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getProf() { return prof; }
        public void setProf(String prof) { this.prof = prof; }
        public LocalDate getExamDate() { return examDate; }
        public void setExamDate(LocalDate examDate) { this.examDate = examDate; }
        public String getExamVenue() { return examVenue; }
        public void setExamVenue(String examVenue) { this.examVenue = examVenue; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TaskItem {
        private String title;
        private String moduleCode;
        private TaskType type;
        private LocalDate dueDate;
        private LocalTime dueTime;
        private String dueDateRaw;
        private TaskStatus status;
        private Float weightage;
        private Float confidence;
        private String note;

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getModuleCode() { return moduleCode; }
        public void setModuleCode(String moduleCode) { this.moduleCode = moduleCode; }
        public TaskType getType() { return type; }
        public void setType(TaskType type) { this.type = type; }
        public LocalDate getDueDate() { return dueDate; }
        public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
        public LocalTime getDueTime() { return dueTime; }
        public void setDueTime(LocalTime dueTime) { this.dueTime = dueTime; }
        public String getDueDateRaw() { return dueDateRaw; }
        public void setDueDateRaw(String dueDateRaw) { this.dueDateRaw = dueDateRaw; }
        public TaskStatus getStatus() { return status; }
        public void setStatus(TaskStatus status) { this.status = status; }
        public Float getWeightage() { return weightage; }
        public void setWeightage(Float weightage) { this.weightage = weightage; }
        public Float getConfidence() { return confidence; }
        public void setConfidence(Float confidence) { this.confidence = confidence; }
        public String getNote() { return note; }
        public void setNote(String note) { this.note = note; }
    }
}