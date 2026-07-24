package com.track.track.controller;

import com.track.track.model.AcademicWeek;
import com.track.track.service.AcademicCalendarService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

// The academic calendar is global — one shared set of weeks used by every
// user, not scoped per-user. Requests still require Firebase auth (enforced
// by SecurityConfig), but any authenticated user reads/writes the same rows.
@RestController
@RequestMapping("/api/calendar")
public class AcademicCalendarController {

    private final AcademicCalendarService academicCalendarService;

    public AcademicCalendarController(AcademicCalendarService academicCalendarService) {
        this.academicCalendarService = academicCalendarService;
    }

    @GetMapping("/weeks")
    public ResponseEntity<List<AcademicWeek>> getWeeks() {
        return ResponseEntity.ok(academicCalendarService.getWeeks());
    }

    @DeleteMapping("/weeks")
    public ResponseEntity<Void> clearCalendar() {
        academicCalendarService.clearWeeks();
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/weeks/manual")
    public ResponseEntity<List<AcademicWeek>> setupManual(@RequestBody Map<String, String> body) {
        try {
            LocalDate semStart   = LocalDate.parse(body.get("semesterStart"));
            LocalDate recessStart = body.containsKey("recessStart") && body.get("recessStart") != null
                    ? LocalDate.parse(body.get("recessStart")) : null;
            LocalDate examStart  = body.containsKey("examStart") && body.get("examStart") != null
                    ? LocalDate.parse(body.get("examStart")) : null;
            int teachingWeeks = body.containsKey("teachingWeeks")
                    ? Integer.parseInt(body.get("teachingWeeks")) : 13;
            int examWeeks = body.containsKey("examWeeks")
                    ? Integer.parseInt(body.get("examWeeks")) : 3;
            List<AcademicWeek> weeks = academicCalendarService.generateFromDates(
                    semStart, recessStart, examStart, teachingWeeks, examWeeks);
            return ResponseEntity.ok(weeks);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
}