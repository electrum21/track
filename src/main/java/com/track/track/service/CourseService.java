package com.track.track.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.track.track.model.Course;
import com.track.track.model.Task;
import com.track.track.repository.CourseRepository;
import com.track.track.repository.TaskRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class CourseService {

    private static final String CATALOG_PATH = "data/ntu-modules.json";

    private final CourseRepository courseRepository;
    private final TaskRepository taskRepository;

    private List<Course> moduleCatalog = List.of();

    public CourseService(CourseRepository courseRepository, TaskRepository taskRepository) {
        this.courseRepository = courseRepository;
        this.taskRepository = taskRepository;
    }

    @PostConstruct
    public void loadModuleCatalog() {
        try (InputStream is = new ClassPathResource(CATALOG_PATH).getInputStream()) {
            ObjectMapper mapper = new ObjectMapper();
            List<Map<String, String>> raw = mapper.readValue(is, new TypeReference<List<Map<String, String>>>() {});
            moduleCatalog = raw.stream()
                    .map(entry -> {
                        Course course = new Course();
                        course.setModuleCode(entry.get("moduleCode"));
                        course.setName(entry.get("title"));
                        return course;
                    })
                    .sorted(Comparator.comparing(Course::getModuleCode))
                    .toList();
        } catch (Exception e) {
            throw new RuntimeException("Failed to load NTU module catalog from " + CATALOG_PATH, e);
        }
    }

    public List<Course> getModuleCatalog() {
        return moduleCatalog;
    }

    public List<Course> getCoursesByUser(UUID userId) {
        return courseRepository.findByUserId(userId);
    }

    public Optional<Course> getCourseByUserAndCode(UUID userId, String moduleCode) {
        return courseRepository.findByUserIdAndModuleCode(userId, moduleCode);
    }

    public Course saveCourse(Course course) {
        return courseRepository.save(course);
    }

    public Course updateCourse(UUID id, Course updated) {
        return courseRepository.findById(id).map(course -> {
            String oldCode = course.getModuleCode();
            String newCode = updated.getModuleCode();
            course.setModuleCode(newCode);
            course.setName(updated.getName());
            course.setProf(updated.getProf());
            course.setExamDate(updated.getExamDate());
            course.setExamVenue(updated.getExamVenue());
            Course saved = courseRepository.save(course);

            // If the module code changed, remap all tasks to the new code
            if (newCode != null && !newCode.equals(oldCode)) {
                List<Task> tasks = taskRepository.findByUserIdAndModuleCode(
                        course.getUser().getId(), oldCode);
                tasks.forEach(t -> t.setModuleCode(newCode));
                taskRepository.saveAll(tasks);
            }

            return saved;
        }).orElseThrow(() -> new RuntimeException("Course not found: " + id));
    }

    public void deleteCourse(UUID id) {
        courseRepository.deleteById(id);
    }

    // Creates a course only if it doesn't already exist for this user
    public Course getOrCreate(UUID userId, String moduleCode, com.track.track.model.User user) {
        return courseRepository.findByUserIdAndModuleCode(userId, moduleCode)
                .orElseGet(() -> {
                    Course course = new Course();
                    course.setUser(user);
                    course.setModuleCode(moduleCode);
                    return courseRepository.save(course);
                });
    }
}