package com.track.track.service;

import com.track.track.model.AcademicWeek;
import com.track.track.model.User;
import com.track.track.repository.AcademicWeekRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class AcademicCalendarService {

    private final AcademicWeekRepository academicWeekRepository;
    private final DocumentService documentService;

    public AcademicCalendarService(AcademicWeekRepository academicWeekRepository,
                                   DocumentService documentService) {
        this.academicWeekRepository = academicWeekRepository;
        this.documentService = documentService;
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

    // ── Extract weeks from uploaded academic calendar file ──

    @Transactional
    public List<AcademicWeek> extractAndSaveFromFile(MultipartFile file, UUID userId, User user, String semester) throws Exception {
        // Delegate to DocumentService — handles file conversion (PPTX→PDF) and Gemini call
        List<AcademicWeek> weeks = documentService.extractAcademicWeeksFromFile(file, semester);
        weeks.forEach(w -> w.setUser(user));

        // Sanitize: deduplicate and ensure logical ordering
        weeks = sanitizeWeeks(weeks, user);

        // Replace all existing weeks for this user
        academicWeekRepository.deleteByUserId(userId);
        return academicWeekRepository.saveAll(weeks);
    }

    // ── Sanitize: deduplicate, merge duplicates, sort by date ────────────────

    private List<AcademicWeek> sanitizeWeeks(List<AcademicWeek> weeks, User user) {
        // 1. Drop entries with no start date
        weeks = weeks.stream()
                .filter(w -> w.getStartDate() != null)
                .collect(java.util.stream.Collectors.toCollection(java.util.ArrayList::new));

        // 2. Deduplicate by startDate — if two weeks share the same start date, keep
        //    the one with the more specific label (prefer "Week 7" over "Week")
        java.util.Map<LocalDate, AcademicWeek> byStart = new java.util.LinkedHashMap<>();
        for (AcademicWeek w : weeks) {
            byStart.merge(w.getStartDate(), w, (existing, incoming) -> {
                // Keep whichever has a more descriptive label
                boolean incomingBetter = incoming.getWeekLabel() != null
                        && existing.getWeekLabel() != null
                        && incoming.getWeekLabel().length() > existing.getWeekLabel().length();
                return incomingBetter ? incoming : existing;
            });
        }

        // 3. Deduplicate teaching weeks by weekNumber — keep the earliest start date
        java.util.Map<Integer, AcademicWeek> byWeekNum = new java.util.LinkedHashMap<>();
        List<AcademicWeek> nonTeaching = new java.util.ArrayList<>();
        for (AcademicWeek w : byStart.values()) {
            if ("TEACHING".equals(w.getWeekType()) && w.getWeekNumber() != null) {
                byWeekNum.merge(w.getWeekNumber(), w, (existing, incoming) ->
                        incoming.getStartDate().isBefore(existing.getStartDate()) ? incoming : existing);
            } else {
                nonTeaching.add(w);
            }
        }

        // 4. Combine, sort by startDate, reassign sortOrder
        List<AcademicWeek> result = new java.util.ArrayList<>();
        result.addAll(byWeekNum.values());
        result.addAll(nonTeaching);
        result.sort(java.util.Comparator.comparing(AcademicWeek::getStartDate));

        // 5. Reassign user and sortOrder
        for (int i = 0; i < result.size(); i++) {
            result.get(i).setUser(user);
            result.get(i).setSortOrder(i);
        }

        return result;
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