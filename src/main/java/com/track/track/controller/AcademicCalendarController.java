package com.track.track.controller;

import com.track.track.config.FileValidator;
import com.track.track.model.AcademicWeek;
import com.track.track.model.User;
import com.track.track.service.AcademicCalendarService;
import com.track.track.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/calendar")
public class AcademicCalendarController {

    private final AcademicCalendarService academicCalendarService;
    private final UserService userService;
    private final FileValidator fileValidator;

    public AcademicCalendarController(AcademicCalendarService academicCalendarService,
                                      UserService userService,
                                      FileValidator fileValidator) {
        this.academicCalendarService = academicCalendarService;
        this.userService = userService;
        this.fileValidator = fileValidator;
    }

    private User getUserFromRequest(HttpServletRequest request) {
        String uid   = (String) request.getAttribute("firebaseUid");
        String email = (String) request.getAttribute("firebaseEmail");
        String name  = (String) request.getAttribute("firebaseName");
        return userService.findOrCreateByFirebaseUid(uid, email != null ? email : "", name != null ? name : "");
    }

    @GetMapping("/weeks")
    public ResponseEntity<List<AcademicWeek>> getWeeks(HttpServletRequest request) {
        User user = getUserFromRequest(request);
        return ResponseEntity.ok(academicCalendarService.getWeeksForUser(user.getId()));
    }

    @PostMapping("/weeks/upload")
    public ResponseEntity<List<AcademicWeek>> uploadCalendar(
            HttpServletRequest request,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "semester", defaultValue = "1") String semester) {
        fileValidator.validate(file);
        try {
            User user = getUserFromRequest(request);
            List<AcademicWeek> weeks = academicCalendarService.extractAndSaveFromFile(file, user.getId(), user, semester);
            return ResponseEntity.ok(weeks);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    @DeleteMapping("/weeks")
    public ResponseEntity<Void> clearCalendar(HttpServletRequest request) {
        User user = getUserFromRequest(request);
        academicCalendarService.clearWeeks(user.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/weeks/manual")
    public ResponseEntity<List<AcademicWeek>> setupManual(
            HttpServletRequest request,
            @RequestBody Map<String, String> body) {
        try {
            User user = getUserFromRequest(request);
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
                    user.getId(), user, semStart, recessStart, examStart, teachingWeeks, examWeeks);
            return ResponseEntity.ok(weeks);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
}