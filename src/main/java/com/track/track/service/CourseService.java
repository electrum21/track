package com.track.track.service;

import com.track.track.model.Course;
import com.track.track.model.Task;
import com.track.track.repository.CourseRepository;
import com.track.track.repository.TaskRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CourseService {

    private final CourseRepository courseRepository;
    private final TaskRepository taskRepository;

    public CourseService(CourseRepository courseRepository, TaskRepository taskRepository) {
        this.courseRepository = courseRepository;
        this.taskRepository = taskRepository;
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
