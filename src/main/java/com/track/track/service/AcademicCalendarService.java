package com.track.track.service;

import com.track.track.model.AcademicWeek;
import com.track.track.model.User;
import com.track.track.repository.AcademicWeekRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class AcademicCalendarService {

    private final AcademicWeekRepository academicWeekRepository;

    public AcademicCalendarService(AcademicWeekRepository academicWeekRepository) {
        this.academicWeekRepository = academicWeekRepository;
    }

    @Transactional
    public void clearWeeks(UUID userId) {
        academicWeekRepository.deleteByUserId(userId);
    }

    public List<AcademicWeek> getWeeksForUser(UUID userId) {
        return academicWeekRepository.findByUserIdOrderBySortOrder(userId);
    }

    // ── Generate weeks from manual entry (semester start + recess + exam dates) ──

    @Transactional
    public List<AcademicWeek> generateFromDates(UUID userId, User user,
            LocalDate semesterStart, LocalDate recessStart,
            LocalDate examStart, int totalTeachingWeeks, int totalExamWeeks) {

        academicWeekRepository.deleteByUserId(userId);
        List<AcademicWeek> weeks = new ArrayList<>();
        int sort = 0;
        int teachingWeek = 1;
        LocalDate current = semesterStart;

        while (teachingWeek <= totalTeachingWeeks) {
            LocalDate weekEnd = current.plusDays(6);
            AcademicWeek w = new AcademicWeek();
            w.setUser(user);
            w.setStartDate(current);
            w.setEndDate(weekEnd);
            w.setSortOrder(sort++);

            if (recessStart != null && !current.isBefore(recessStart) && current.isBefore(recessStart.plusWeeks(1))) {
                w.setWeekLabel("Recess");
                w.setWeekType("RECESS");
            } else {
                w.setWeekLabel("Week " + teachingWeek);
                w.setWeekType("TEACHING");
                w.setWeekNumber(teachingWeek);
                teachingWeek++;
            }

            weeks.add(w);
            current = current.plusWeeks(1);
        }

        // Add one row per exam week
        if (examStart != null) {
            LocalDate examCurrent = examStart;
            for (int i = 0; i < totalExamWeeks; i++) {
                AcademicWeek examWeek = new AcademicWeek();
                examWeek.setUser(user);
                examWeek.setStartDate(examCurrent);
                examWeek.setEndDate(examCurrent.plusDays(6));
                examWeek.setWeekLabel("Exam Week");
                examWeek.setWeekType("EXAM");
                examWeek.setSortOrder(sort++);
                weeks.add(examWeek);
                examCurrent = examCurrent.plusWeeks(1);
            }
        }

        return academicWeekRepository.saveAll(weeks);
    }

    // ── Build a compact week context string for Gemini task prompts ──

    public String buildWeekContext(UUID userId) {
        List<AcademicWeek> weeks = academicWeekRepository.findByUserIdOrderBySortOrder(userId);
        if (weeks.isEmpty()) return "";
        StringBuilder sb = new StringBuilder("Academic calendar week reference:\n");
        for (AcademicWeek w : weeks) {
            sb.append(String.format("  %s: %s to %s\n", w.getWeekLabel(), w.getStartDate(), w.getEndDate()));
        }
        return sb.toString();
    }
}