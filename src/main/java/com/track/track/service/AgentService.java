package com.track.track.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.track.track.model.*;
import com.track.track.repository.CourseRepository;
import com.track.track.repository.TaskRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

@Service
public class AgentService {

    @Value("${gemini.api.key}")
    private String apiKey;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final TaskRepository taskRepository;
    private final CourseRepository courseRepository;
    private final TaskService taskService;
    private final CourseService courseService;

    public AgentService(TaskRepository taskRepository, CourseRepository courseRepository, TaskService taskService, CourseService courseService) {
        this.restClient = RestClient.create();
        this.objectMapper = new ObjectMapper();
        this.taskRepository = taskRepository;
        this.courseRepository = courseRepository;
        this.taskService = taskService;
        this.courseService = courseService;
    }

    public Map<String, Object> chat(String userMessage, List<Map<String, String>> history, User user) throws Exception {
        // Fetch user context
        List<Task> tasks = taskRepository.findByUserId(user.getId());
        List<Course> courses = courseRepository.findByUserId(user.getId());

        String context = buildContext(tasks, courses);
        String prompt = buildPrompt(context, history, userMessage);

        String geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;

        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(Map.of("text", prompt)))
            ),
            "generationConfig", Map.of(
                "response_mime_type", "application/json"
            )
        );

        String response = restClient.post()
            .uri(geminiUrl)
            .header("Content-Type", "application/json")
            .body(requestBody)
            .retrieve()
            .body(String.class);

        return parseAndExecute(response, user, tasks, courses);
    }

    private String buildContext(List<Task> tasks, List<Course> courses) {
        StringBuilder sb = new StringBuilder();
        sb.append("USER'S COURSES:\n");
        for (Course c : courses) {
            sb.append(String.format("- %s: %s, Prof: %s, Exam: %s\n",
                c.getModuleCode(),
                c.getName() != null ? c.getName() : "unnamed",
                c.getProf() != null ? c.getProf() : "unknown",
                c.getExamDate() != null ? c.getExamDate() : "no date"));
        }
        sb.append("\nUSER'S TASKS:\n");
        for (Task t : tasks) {
            sb.append(String.format("- [%s] %s | Module: %s | Due: %s %s | Status: %s | Weightage: %s%%\n",
                t.getId(),
                t.getTitle(),
                t.getModuleCode() != null ? t.getModuleCode() : "none",
                t.getDueDate() != null ? t.getDueDate() : "no date",
                t.getDueTime() != null ? t.getDueTime() : "",
                t.getStatus(),
                t.getWeightage() != null ? t.getWeightage() : "?"));
        }
        return sb.toString();
    }

    private String buildPrompt(String context, List<Map<String, String>> history, String userMessage) {
        StringBuilder sb = new StringBuilder();
        sb.append("""
            You are Track, an intelligent academic deadline assistant.
            Today's date is: %s.
            
            You have access to the user's academic data below.
            Respond to the user's message helpfully. If they ask you to perform an action
            (create, update, delete tasks or courses), include an "action" in your response.
            
            Always respond with a JSON object with these fields:
            - "message": string — your conversational reply to the user
            - "action": object or null — if an action is needed, include:
                - "type": one of: create_task, update_task, delete_task, create_course, none
                - "data": object with the relevant fields for the action
            - "data": array or null — any structured data to display (e.g. list of tasks)
            
            For create_task, data fields: title, moduleCode, type (ASSIGNMENT/PROJECT/EXAM/QUIZ),
            dueDate (YYYY-MM-DD), dueTime (HH:mm), weightage (number), note, status (CONFIRMED/PENDING_DATE)
            
            For update_task, data fields: id (task UUID), and any fields to update
            
            For delete_task, data fields: id (task UUID)
            
            For create_course, data fields: moduleCode, name, prof, examDate (YYYY-MM-DD), examVenue
            
            %s
            
            CONVERSATION HISTORY:
            %s
            
            USER: %s
            """.formatted(
                LocalDate.now(),
                context,
                formatHistory(history),
                userMessage
            ));
        return sb.toString();
    }

    private String formatHistory(List<Map<String, String>> history) {
        if (history == null || history.isEmpty()) return "None";
        StringBuilder sb = new StringBuilder();
        for (Map<String, String> msg : history) {
            sb.append(msg.get("role").toUpperCase()).append(": ").append(msg.get("content")).append("\n");
        }
        return sb.toString();
    }

    private Map<String, Object> parseAndExecute(String response,
                                                  User user,
                                                  List<Task> tasks,
                                                  List<Course> courses) throws Exception {
        JsonNode root = objectMapper.readTree(response);
        String jsonText = root.path("candidates").get(0)
            .path("content").path("parts").get(0)
            .path("text").asText();

        JsonNode parsed = objectMapper.readTree(jsonText);
        String message = parsed.path("message").asText("I couldn't process that request.");
        JsonNode action = parsed.path("action");
        JsonNode data = parsed.path("data");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", message);

        if (!action.isNull() && action.has("type")) {
            String type = action.path("type").asText();
            JsonNode actionData = action.path("data");
            String actionResult = executeAction(type, actionData, user);
            result.put("actionType", type);
            result.put("actionResult", actionResult);
        }

        if (!data.isNull() && data.isArray()) {
            result.put("data", objectMapper.convertValue(data, List.class));
        }

        return result;
    }

    private String executeAction(String type, JsonNode data, User user) {
        try {
            switch (type) {
                case "create_task" -> {
                    Task task = new Task();
                    task.setUser(user);
                    task.setTitle(data.path("title").asText("Untitled"));
                    task.setModuleCode(data.path("moduleCode").asText(null));
                    task.setNote(data.path("note").asText(null));
                    if (!data.path("type").isMissingNode()) {
                        try { task.setType(TaskType.valueOf(data.path("type").asText())); }
                        catch (Exception e) { task.setType(TaskType.ASSIGNMENT); }
                    }
                    if (!data.path("dueDate").isMissingNode() && !data.path("dueDate").asText().equals("null")) {
                        try { task.setDueDate(LocalDate.parse(data.path("dueDate").asText())); }
                        catch (Exception ignored) {}
                    }
                    if (!data.path("dueTime").isMissingNode() && !data.path("dueTime").asText().equals("null")) {
                        try { task.setDueTime(LocalTime.parse(data.path("dueTime").asText())); }
                        catch (Exception ignored) {}
                    }
                    if (!data.path("weightage").isMissingNode()) {
                        task.setWeightage((float) data.path("weightage").asDouble());
                    }
                    task.setStatus(TaskStatus.CONFIRMED);
                    taskService.saveTask(task);
                    return "Task created: " + task.getTitle();
                }
                case "update_task" -> {
                    String idStr = data.path("id").asText();
                    UUID id = UUID.fromString(idStr);
                    return taskService.getTaskById(id).map(task -> {
                        if (data.has("title")) task.setTitle(data.path("title").asText());
                        if (data.has("moduleCode")) task.setModuleCode(data.path("moduleCode").asText());
                        if (data.has("status")) {
                            try { task.setStatus(TaskStatus.valueOf(data.path("status").asText())); }
                            catch (Exception ignored) {}
                        }
                        if (data.has("dueDate")) {
                            try { task.setDueDate(LocalDate.parse(data.path("dueDate").asText())); }
                            catch (Exception ignored) {}
                        }
                        if (data.has("weightage")) {
                            task.setWeightage((float) data.path("weightage").asDouble());
                        }
                        taskService.saveTask(task);
                        return "Task updated: " + task.getTitle();
                    }).orElse("Task not found");
                }
                case "delete_task" -> {
                    UUID id = UUID.fromString(data.path("id").asText());
                    taskService.deleteTask(id);
                    return "Task deleted";
                }
                case "create_course" -> {
                    Course course = new Course();
                    course.setUser(user);
                    course.setModuleCode(data.path("moduleCode").asText());
                    course.setName(data.path("name").asText(null));
                    course.setProf(data.path("prof").asText(null));
                    course.setExamVenue(data.path("examVenue").asText(null));
                    if (data.has("examDate") && !data.path("examDate").asText().equals("null")) {
                        try { course.setExamDate(LocalDate.parse(data.path("examDate").asText())); }
                        catch (Exception ignored) {}
                    }
                    courseService.saveCourse(course);
                    return "Course created: " + course.getModuleCode();
                }
                default -> { return "No action taken"; }
            }
        } catch (Exception e) {
            return "Action failed: " + e.getMessage();
        }
    }
}