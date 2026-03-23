package com.track.track.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.track.track.model.Course;
import com.track.track.model.Task;
import com.track.track.model.TaskStatus;
import com.track.track.model.TaskType;
import org.springframework.beans.factory.annotation.Value;
import com.track.track.model.AcademicWeek;
import com.track.track.service.FileConversionService;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
public class DocumentService {

    @Value("${gemini.api.key}")
    private String apiKey;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final FileConversionService fileConversionService;

    public DocumentService(FileConversionService fileConversionService) {
        this.restClient = RestClient.create();
        this.objectMapper = new ObjectMapper();
        this.fileConversionService = fileConversionService;
    }

    // ── existing: extract tasks only (used by Dashboard upload) ─────────────

    public List<Task> extractTasksFromFile(MultipartFile file) throws Exception {
        return extractTasksFromFile(file, "");
    }

    public List<Task> extractTasksFromFile(MultipartFile file, String weekContext) throws Exception {
        String jsonText = callGemini(file, buildTaskPrompt(weekContext));
        return parseTasksFromJson(objectMapper.readTree(jsonText));
    }

    // ── new: extract course info + tasks together (used by Course page upload) ─

    public record CourseAndTasks(List<Course> courses, List<Task> tasks) {}

    public CourseAndTasks extractCourseAndTasksFromFile(MultipartFile file) throws Exception {
        return extractCourseAndTasksFromFile(file, "");
    }

    public CourseAndTasks extractCourseAndTasksFromFile(MultipartFile file, String weekContext) throws Exception {
        String jsonText = callGemini(file, buildCourseAndTaskPrompt(weekContext));
        JsonNode root = objectMapper.readTree(jsonText);

        // Parse courses array
        List<Course> courses = new ArrayList<>();
        JsonNode coursesNode = root.path("courses");
        if (coursesNode.isArray()) {
            for (JsonNode courseNode : coursesNode) {
                String moduleCode = nullableText(courseNode, "moduleCode");
                if (moduleCode == null || moduleCode.isBlank()) continue; // skip courses with no code
                Course course = new Course();
                course.setModuleCode(moduleCode);
                course.setName(nullableText(courseNode, "name"));
                course.setProf(nullableText(courseNode, "prof"));
                course.setExamVenue(nullableText(courseNode, "examVenue"));
                String examDateStr = courseNode.path("examDate").asText(null);
                if (isValidDateString(examDateStr)) {
                    try { course.setExamDate(LocalDate.parse(examDateStr.substring(0, 10))); } catch (Exception ignored) {}
                }
                courses.add(course);
            }
        }

        // Parse tasks
        List<Task> tasks = new ArrayList<>();
        JsonNode tasksNode = root.path("tasks");
        if (tasksNode.isArray()) {
            tasks = parseTasksFromJson(tasksNode);
        }

        // For any task with no moduleCode, try to inherit from the single course if there's only one
        if (courses.size() == 1) {
            String code = courses.get(0).getModuleCode();
            tasks.forEach(t -> { if (t.getModuleCode() == null || t.getModuleCode().isBlank()) t.setModuleCode(code); });
        }

        return new CourseAndTasks(courses, tasks);
    }

    // ── academic calendar extraction ─────────────────────────────────────────

    public List<AcademicWeek> extractAcademicWeeksFromFile(MultipartFile file, String semester) throws Exception {
        String jsonText = callGemini(file, buildCalendarPrompt(semester));
        JsonNode weeksArray = objectMapper.readTree(jsonText);
        List<AcademicWeek> weeks = new ArrayList<>();
        int sort = 0;
        for (JsonNode node : weeksArray) {
            AcademicWeek w = new AcademicWeek();
            w.setWeekLabel(nullableText(node, "weekLabel") != null ? node.path("weekLabel").asText("Week") : "Week");
            w.setWeekType(node.path("weekType").asText("TEACHING"));
            if (!node.path("weekNumber").isNull() && !node.path("weekNumber").isMissingNode())
                w.setWeekNumber(node.path("weekNumber").asInt());
            String start = node.path("startDate").asText(null);
            String end = node.path("endDate").asText(null);
            if (isValidDateString(start)) {
                try { w.setStartDate(LocalDate.parse(start.substring(0, 10))); } catch (Exception ignored) {}
            }
            if (isValidDateString(end)) {
                try { w.setEndDate(LocalDate.parse(end.substring(0, 10))); } catch (Exception ignored) {}
            }
            w.setSortOrder(sort++);
            weeks.add(w);
        }
        return weeks;
    }

    private String buildCalendarPrompt(String semester) {
        String semContext = (semester != null && !semester.isBlank())
            ? "This is Semester " + semester + " of the academic year. "
            : "";
        return semContext
            + "Extract the academic calendar week structure from this document.\n"
            + "Return a JSON array where each object represents one week with:\n"
            + "- weekLabel (string, e.g. \"Week 1\", \"Recess Week\", \"Exam Week\")\n"
            + "- weekType (one of: \"TEACHING\", \"RECESS\", \"EXAM\")\n"
            + "- weekNumber (integer for teaching weeks e.g. 1, 2, 3 — null for recess/exam)\n"
            + "- startDate (ISO 8601 YYYY-MM-DD, Monday of the week)\n"
            + "- endDate (ISO 8601 YYYY-MM-DD, Sunday of the week)\n"
            + "Order by date ascending. Include all weeks from semester start to end of exams.";
    }

    // ── shared Gemini caller ─────────────────────────────────────────────────

    private String callGemini(MultipartFile file, String prompt) throws Exception {
        // Convert PPTX/DOCX to PDF — Gemini only supports PDF and images
        byte[] fileBytes = fileConversionService.convertToPdf(file);
        String base64File = Base64.getEncoder().encodeToString(fileBytes);
        // Always send as PDF after conversion
        String originalMime = file.getContentType() != null ? file.getContentType() : "application/pdf";
        String mimeType = (originalMime.contains("pdf") || originalMime.contains("image")) ? originalMime : "application/pdf";

        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(
                    Map.of("inline_data", Map.of("mime_type", mimeType, "data", base64File)),
                    Map.of("text", prompt)
                ))
            ),
            "generationConfig", Map.of("response_mime_type", "application/json")
        );

        String geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;

        String response = restClient.post()
                .uri(geminiUrl)
                .header("Content-Type", "application/json")
                .body(requestBody)
                .retrieve()
                .body(String.class);

        JsonNode root = objectMapper.readTree(response);
        return root.path("candidates").get(0)
                .path("content").path("parts").get(0)
                .path("text").asText();
    }

    // ── prompts ──────────────────────────────────────────────────────────────

    private String buildTaskPrompt(String weekContext) {
        int currentYear = java.time.Year.now().getValue();
        String weekSection = (weekContext != null && !weekContext.isBlank())
            ? "Academic week reference (use to resolve week-based dates):\n" + weekContext
            : "";
        return "Extract all assignments, projects, quizzes, and exams from this document.\n"
            + "The current year is " + currentYear + ". Use this year for any dates that don't explicitly state a year.\n"
            + (weekSection.isBlank() ? "" : weekSection + "\n")
            + "Return a JSON array where each object has:\n"
            + "- title (string)\n"
            + "- moduleCode (string or null)\n"
            + "- type (ASSIGNMENT, PROJECT, EXAM, or QUIZ)\n"
            + "- dueDateRaw (text exactly as it appears in the document)\n"
            + "- dueDateResolved (ISO 8601 date YYYY-MM-DD, or null if missing)\n"
            + "- dueTime (24-hour time HH:mm, e.g. \"17:00\", or null if not specified)\n"
            + "- weightage (percentage as a number e.g. 15.0, or null if not found)\n"
            + "- confidence (number 0.0-1.0)\n"
            + "- note (brief explanation if details are unclear)";
    }

    private String buildCourseAndTaskPrompt(String weekContext) {
        int currentYear = java.time.Year.now().getValue();
        String weekSection = (weekContext != null && !weekContext.isBlank())
            ? "Academic week reference (use to resolve week-based dates):\n" + weekContext
            : "";
        return "Extract course information and all assessed tasks from this document.\n"
            + "The current year is " + currentYear + ". Use this year for any dates that don't explicitly state a year.\n"
            + (weekSection.isBlank() ? "" : weekSection + "\n")
            + "This document may contain ONE course (e.g. syllabus) or MULTIPLE courses (e.g. timetable). Handle both.\n"
            + "Return a JSON object with exactly two fields:\n"
            + "\"courses\": array of course objects, each with:\n"
            + "  - moduleCode (required, skip if unknown)\n"
            + "  - name (full course name, or null)\n"
            + "  - prof (professor name, or null)\n"
            + "  - examDate (ISO 8601 YYYY-MM-DD, or null)\n"
            + "  - examVenue (exam location, or null)\n"
            + "\"tasks\": array of task objects, each with:\n"
            + "  - title (string)\n"
            + "  - moduleCode (string matching a course code above, or null)\n"
            + "  - type (ASSIGNMENT, PROJECT, EXAM, or QUIZ)\n"
            + "  - dueDateRaw (text as it appears, or null)\n"
            + "  - dueDateResolved (ISO 8601 YYYY-MM-DD, or null)\n"
            + "  - dueTime (HH:mm, or null)\n"
            + "  - weightage (number e.g. 15.0, or null)\n"
            + "  - confidence (0.0-1.0)\n"
            + "  - note (brief explanation if unclear)\n"
            + "If no tasks found, return empty array for \"tasks\".";
    }

    // ── parsers ──────────────────────────────────────────────────────────────

    private List<Task> parseTasksFromJson(JsonNode tasksArray) {
        List<Task> tasks = new ArrayList<>();
        for (JsonNode item : tasksArray) {
            Task task = new Task();
            task.setTitle(item.path("title").asText("Untitled Task"));
            task.setModuleCode(nullableText(item, "moduleCode"));
            task.setDueDateRaw(nullableText(item, "dueDateRaw"));
            task.setNote(nullableText(item, "note"));
            task.setConfidence((float) item.path("confidence").asDouble(0.0));

            try {
                task.setType(TaskType.valueOf(item.path("type").asText("ASSIGNMENT").toUpperCase()));
            } catch (Exception e) {
                task.setType(TaskType.ASSIGNMENT);
            }

            String dateStr = item.path("dueDateResolved").asText(null);
            if (isValidDateString(dateStr)) {
                try {
                    task.setDueDate(LocalDate.parse(dateStr.substring(0, 10)));
                    task.setStatus(TaskStatus.CONFIRMED);
                } catch (Exception e) {
                    task.setStatus(TaskStatus.PENDING_DATE);
                }
            } else {
                task.setStatus(TaskStatus.PENDING_DATE);
            }

            String dueTimeStr = item.path("dueTime").asText(null);
            if (isValidDateString(dueTimeStr)) {
                try { task.setDueTime(LocalTime.parse(dueTimeStr)); } catch (Exception ignored) {}
            }

            if (!item.path("weightage").isMissingNode() && !item.path("weightage").isNull()) {
                task.setWeightage((float) item.path("weightage").asDouble());
            }

            tasks.add(task);
        }
        return tasks;
    }

    private String nullableText(JsonNode node, String field) {
        JsonNode n = node.path(field);
        if (n.isMissingNode() || n.isNull()) return null;
        String val = n.asText(null);
        return (val == null || val.equalsIgnoreCase("null") || val.isBlank()) ? null : val;
    }

    private boolean isValidDateString(String s) {
        return s != null && !s.equalsIgnoreCase("null") && !s.isBlank();
    }
}