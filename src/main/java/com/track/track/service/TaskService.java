package com.track.track.service;

import com.track.track.model.Task;
import com.track.track.model.TaskStatus;
import com.track.track.repository.TaskRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class TaskService {

    // Dont allow anything outside of TaskService to access taskRepository
    // The repository should also never be reassigned
    private final TaskRepository taskRepository;

    public TaskService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    public List<Task> getTasksByUser(UUID userId) {
        return taskRepository.findByUserId(userId);
    }

    public List<Task> getTasksByUserAndStatus(UUID userId, TaskStatus status) {
        return taskRepository.findByUserIdAndStatus(userId, status);
    }

    public List<Task> getTasksByUserAndModule(UUID userId, String moduleCode) {
        return taskRepository.findByUserIdAndModuleCode(userId, moduleCode);
    }

    public Optional<Task> getTaskById(UUID id) {
        return taskRepository.findById(id);
    }

    public Task saveTask(Task task) {
        return taskRepository.save(task);
    }

    public List<Task> saveAll(List<Task> tasks) {
        return taskRepository.saveAll(tasks);
    }

    public Task updateTask(UUID id, Task updated) {
        return taskRepository.findById(id).map(task -> {
            task.setTitle(updated.getTitle());
            task.setModuleCode(updated.getModuleCode());
            task.setType(updated.getType());
            task.setDueDate(updated.getDueDate());
            task.setDueTime(updated.getDueTime());
            task.setStatus(updated.getStatus());
            task.setDueDateRaw(updated.getDueDateRaw());
            task.setConfidence(updated.getConfidence());
            task.setNote(updated.getNote());
            task.setWeightage(updated.getWeightage());
            return taskRepository.save(task);
        }).orElseThrow(() -> new RuntimeException("Task not found: " + id));
    }

    public void deleteTask(UUID id) {
        taskRepository.deleteById(id);
    }
}