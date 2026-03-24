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

    public AgentService(TaskRepository taskRepository,
                        CourseRepository courseRepository) {
        this.restClient = RestClient.create();
        this.objectMapper = new ObjectMapper();
        this.taskRepository = taskRepository;
        this.courseRepository = courseRepository;
    }

    public Map<String, Object> chat(String userMessage,
                                     List<Map<String, String>> history,
                                     User user) throws Exception {
        // Fetch user context — exclude completed tasks to keep prompt lean
        List<Task> tasks = taskRepository.findByUserId(user.getId())
                .stream()
                .filter(t -> t.getStatus() != TaskStatus.COMPLETED)
                .toList();
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

        return parseResponse(response, tasks);
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
        sb.append("\nUSER'S TASKS (incomplete only):\n");
        for (Task t : tasks) {
            sb.append(String.format("- [ID:%s] %s | Module: %s | Due: %s %s | Status: %s | Weightage: %s%%\n",
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
        return """
            You are Track, an intelligent academic deadline assistant.
            Today's date is: %s.

            You have access to the user's academic data below.
            Respond to the user's message helpfully.

            Always respond with a JSON object with these fields:
            - "message": string — your conversational reply
            - "suggestions": array or null — list of suggested actions (only if user asks to make changes), each with:
                - "type": one of: create_task, update_task, delete_task, create_course
                - "data": object with relevant fields
            - "data": array or null — structured data to display (e.g. list of tasks for read queries)

            For create_task data: title, moduleCode, type (ASSIGNMENT/PROJECT/EXAM/QUIZ),
            dueDate (YYYY-MM-DD), dueTime (HH:mm), weightage (number), note, status (CONFIRMED/PENDING_DATE)

            For update_task data: id (the UUID from [ID:...] in the task list), and any fields to update.
            Valid status values: CONFIRMED, COMPLETED, NEEDS_REVIEW, PENDING_DATE

            For delete_task data: id (the UUID from [ID:...] in the task list)

            For create_course data: moduleCode, name, prof, examDate (YYYY-MM-DD), examVenue

            Only include suggestions if the user explicitly asks to make changes.
            For read-only questions (what's due, summarize, etc.), set suggestions to null.
            Be conversational and helpful — give concrete answers, not vague responses.

            %s

            CONVERSATION HISTORY:
            %s

            USER: %s
            """.formatted(LocalDate.now(), context, formatHistory(history), userMessage);
    }

    private String formatHistory(List<Map<String, String>> history) {
        if (history == null || history.isEmpty()) return "None";
        StringBuilder sb = new StringBuilder();
        for (Map<String, String> msg : history) {
            sb.append(msg.get("role").toUpperCase()).append(": ").append(msg.get("content")).append("\n");
        }
        return sb.toString();
    }

    private Map<String, Object> parseResponse(String response, List<Task> tasks) throws Exception {
        JsonNode root = objectMapper.readTree(response);
        String jsonText = root.path("candidates").get(0)
            .path("content").path("parts").get(0)
            .path("text").asText();

        JsonNode parsed = objectMapper.readTree(jsonText);
        String message = parsed.path("message").asText("I couldn't process that request.");
        JsonNode suggestions = parsed.path("suggestions");
        JsonNode data = parsed.path("data");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", message);

        // Return suggestions for frontend to confirm — do NOT execute automatically
        if (!suggestions.isNull() && suggestions.isArray() && suggestions.size() > 0) {
            List<Map<String, Object>> suggestionList = new ArrayList<>();
            for (JsonNode s : suggestions) {
                String type = s.path("type").asText();
                JsonNode actionData = s.path("data");
                Map<String, Object> suggestion = new LinkedHashMap<>();
                suggestion.put("type", type);
                suggestion.put("data", objectMapper.convertValue(actionData, Map.class));
                suggestion.put("label", buildSuggestionLabel(type, actionData, tasks));
                suggestionList.add(suggestion);
            }
            if (!suggestionList.isEmpty()) {
                result.put("suggestions", suggestionList);
            }
        }

        if (!data.isNull() && data.isArray()) {
            result.put("data", objectMapper.convertValue(data, List.class));
        }

        return result;
    }

    private String buildSuggestionLabel(String type, JsonNode data, List<Task> tasks) {
        return switch (type) {
            case "create_task" -> "Create task: " + data.path("title").asText("Untitled")
                + (data.has("moduleCode") && !data.path("moduleCode").asText().equals("null")
                    ? " (" + data.path("moduleCode").asText() + ")" : "")
                + (data.has("dueDate") && !data.path("dueDate").asText().equals("null")
                    ? " — due " + data.path("dueDate").asText() : "");
            case "update_task" -> {
                String id = data.path("id").asText();
                String taskTitle = tasks.stream()
                    .filter(t -> t.getId().toString().equals(id))
                    .findFirst()
                    .map(Task::getTitle)
                    .orElse("Unknown task");
                yield "Update \"" + taskTitle + "\": " + buildChangesSummary(data);
            }
            case "delete_task" -> {
                String id = data.path("id").asText();
                String taskTitle = tasks.stream()
                    .filter(t -> t.getId().toString().equals(id))
                    .findFirst()
                    .map(Task::getTitle)
                    .orElse("Unknown task");
                yield "Delete task: \"" + taskTitle + "\"";
            }
            case "create_course" -> "Create course: " + data.path("moduleCode").asText();
            default -> type;
        };
    }

    private String buildChangesSummary(JsonNode data) {
        List<String> changes = new ArrayList<>();
        if (data.has("status")) changes.add("status → " + data.path("status").asText());
        if (data.has("dueDate")) changes.add("due date → " + data.path("dueDate").asText());
        if (data.has("title")) changes.add("title → " + data.path("title").asText());
        if (data.has("weightage")) changes.add("weightage → " + data.path("weightage").asText() + "%");
        if (data.has("moduleCode")) changes.add("module → " + data.path("moduleCode").asText());
        if (data.has("dueTime")) changes.add("time → " + data.path("dueTime").asText());
        return changes.isEmpty() ? "no changes" : String.join(", ", changes);
    }
}