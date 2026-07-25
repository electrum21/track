package com.track.track.service;

import com.track.track.model.AcademicWeek;
import com.track.track.repository.AcademicCalendarConfigRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class AcademicCalendarService {

    // NTU's standard semester pattern, applied on top of the single Week 1
    // start date stored in the DB: 7 teaching weeks → 1 recess week →
    // 6 teaching weeks → 3 exam weeks.
    private static final int WEEKS_BEFORE_RECESS = 7;
    private static final int WEEKS_AFTER_RECESS = 6;
    private static final int EXAM_WEEKS = 3;

    private final AcademicCalendarConfigRepository configRepository;

    public AcademicCalendarService(AcademicCalendarConfigRepository configRepository) {
        this.configRepository = configRepository;
    }

    // Reads the single config row (populated directly in the DB - there is
    // no write endpoint) and computes every week from it. Returns an empty
    // list if no config row exists yet.
    public List<AcademicWeek> getWeeks() {
        Optional<LocalDate> week1Start = configRepository.findAll().stream()
                .findFirst()
                .map(com.track.track.model.AcademicCalendarConfig::getWeek1Start);
        return week1Start.map(this::computeWeeks).orElseGet(ArrayList::new);
    }

    private List<AcademicWeek> computeWeeks(LocalDate week1Start) {
        List<AcademicWeek> weeks = new ArrayList<>();
        int sort = 0;
        LocalDate current = week1Start;

        for (int wk = 1; wk <= WEEKS_BEFORE_RECESS; wk++) {
            weeks.add(teachingWeek(current, wk, sort++));
            current = current.plusWeeks(1);
        }

        AcademicWeek recess = new AcademicWeek();
        recess.setStartDate(current);
        recess.setEndDate(current.plusDays(6));
        recess.setWeekLabel("Recess");
        recess.setWeekType("RECESS");
        recess.setSortOrder(sort++);
        weeks.add(recess);
        current = current.plusWeeks(1);

        for (int wk = WEEKS_BEFORE_RECESS + 1; wk <= WEEKS_BEFORE_RECESS + WEEKS_AFTER_RECESS; wk++) {
            weeks.add(teachingWeek(current, wk, sort++));
            current = current.plusWeeks(1);
        }

        for (int i = 0; i < EXAM_WEEKS; i++) {
            AcademicWeek exam = new AcademicWeek();
            exam.setStartDate(current);
            exam.setEndDate(current.plusDays(6));
            exam.setWeekLabel("Exam Week");
            exam.setWeekType("EXAM");
            exam.setSortOrder(sort++);
            weeks.add(exam);
            current = current.plusWeeks(1);
        }

        return weeks;
    }

    private AcademicWeek teachingWeek(LocalDate start, int weekNumber, int sortOrder) {
        AcademicWeek w = new AcademicWeek();
        w.setStartDate(start);
        w.setEndDate(start.plusDays(6));
        w.setWeekLabel("Week " + weekNumber);
        w.setWeekType("TEACHING");
        w.setWeekNumber(weekNumber);
        w.setSortOrder(sortOrder);
        return w;
    }

    // ── Build a compact week context string for Gemini task prompts ──

    public String buildWeekContext() {
        List<AcademicWeek> weeks = getWeeks();
        if (weeks.isEmpty()) return "";
        StringBuilder sb = new StringBuilder("Academic calendar week reference:\n");
        for (AcademicWeek w : weeks) {
            sb.append(String.format("  %s: %s to %s\n", w.getWeekLabel(), w.getStartDate(), w.getEndDate()));
        }
        return sb.toString();
    }
}