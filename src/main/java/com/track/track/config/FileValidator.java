package com.track.track.config;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Arrays;
import java.util.Set;

@Component
public class FileValidator {

    private static final long MAX_BYTES = 30L * 1024 * 1024; // 30 MB
    private static final int  MAX_PROMPT_CHARS = 50_000;

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
        "pdf", "docx", "pptx", "jpg", "jpeg", "png", "webp"
    );

    // Magic bytes
    private static final byte[] PDF_MAGIC  = { 0x25, 0x50, 0x44, 0x46 };              // %PDF
    private static final byte[] ZIP_MAGIC  = { 0x50, 0x4B, 0x03, 0x04 };              // PK.. (DOCX/PPTX are ZIP-based)
    private static final byte[] JPEG_MAGIC = { (byte)0xFF, (byte)0xD8, (byte)0xFF };  // JPEG SOI
    private static final byte[] PNG_MAGIC  = { (byte)0x89, 0x50, 0x4E, 0x47 };        // .PNG
    private static final byte[] WEBP_MAGIC = { 0x52, 0x49, 0x46, 0x46 };              // RIFF (WEBP)

    /**
     * Validates by file extension and magic bytes.
     * Avoids relying on Tika's MIME detection for ZIP-based Office formats (DOCX/PPTX),
     * which is unreliable with tika-core alone and produces false 415s on Render.
     */
    public void validate(MultipartFile file) {
        if (file == null || file.isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty.");

        if (file.getSize() > MAX_BYTES)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File exceeds the 30 MB limit.");

        String name = file.getOriginalFilename();
        if (name == null || !name.contains("."))
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "File type not allowed. Accepted: PDF, DOCX, PPTX, JPEG, PNG, WEBP.");

        String ext = name.substring(name.lastIndexOf('.') + 1).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(ext))
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "File type not allowed. Accepted: PDF, DOCX, PPTX, JPEG, PNG, WEBP.");

        // Confirm magic bytes match the declared extension (prevents renamed-file spoofing)
        byte[] header;
        try {
            byte[] bytes = file.getBytes();
            header = bytes.length >= 8 ? Arrays.copyOf(bytes, 8) : bytes;
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read file.");
        }

        boolean valid = switch (ext) {
            case "pdf"           -> startsWith(header, PDF_MAGIC);
            case "docx", "pptx"  -> startsWith(header, ZIP_MAGIC);  // both are ZIP-based formats
            case "jpg", "jpeg"   -> startsWith(header, JPEG_MAGIC);
            case "png"           -> startsWith(header, PNG_MAGIC);
            case "webp"          -> startsWith(header, WEBP_MAGIC);
            default              -> false;
        };

        if (!valid)
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "File type not allowed. Accepted: PDF, DOCX, PPTX, JPEG, PNG, WEBP.");
    }

    private boolean startsWith(byte[] data, byte[] magic) {
        if (data.length < magic.length) return false;
        for (int i = 0; i < magic.length; i++) {
            if (data[i] != magic[i]) return false;
        }
        return true;
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