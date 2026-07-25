package com.track.track.controller;

import com.track.track.model.AcademicWeek;
import com.track.track.service.AcademicCalendarService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// The academic calendar is global and fully derived from a single Week 1
// start date stored directly in the DB (academic_calendar_config table).
// There is no write endpoint here - that value is set manually (e.g. via
// psql / Render's DB console), not through the app. This just reads it
// and computes the rest of the semester's weeks on every request.
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
}