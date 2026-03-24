package com.track.track.config;

import org.apache.tika.Tika;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Set;

@Component
public class FileValidator {

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",   // .docx
        "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
        "image/jpeg",
        "image/png",
        "image/webp"
    );

    private static final long MAX_BYTES = 30L * 1024 * 1024; // 30 MB
    private static final int  MAX_PROMPT_CHARS = 50_000;

    private final Tika tika = new Tika();

    /**
     * Validates size and MIME type by magic bytes (not the Content-Type header).
     * Throws ResponseStatusException on any violation so controllers need no try/catch.
     */
    public void validate(MultipartFile file) {
        if (file == null || file.isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty.");

        if (file.getSize() > MAX_BYTES)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "File exceeds the 30 MB limit.");

        String detected;
        try {
            detected = tika.detect(file.getInputStream());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read file.");
        }

        if (!ALLOWED_MIME_TYPES.contains(detected))
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "File type not allowed. Accepted: PDF, DOCX, PPTX, JPEG, PNG, WEBP.");
    }

    /**
     * Truncates extracted text and strips basic prompt-injection patterns
     * before it is forwarded to the AI.
     */
    public String sanitiseExtractedText(String text) {
        if (text == null) return "";
        if (text.length() > MAX_PROMPT_CHARS)
            text = text.substring(0, MAX_PROMPT_CHARS);
        // Strip common prompt-injection attempts
        text = text.replaceAll("(?i)(ignore (previous|above|all) instructions?)", "[removed]");
        text = text.replaceAll("(?i)(system\\s*:|<\\|im_start\\|>|<\\|im_end\\|>)", "[removed]");
        return text;
    }
}