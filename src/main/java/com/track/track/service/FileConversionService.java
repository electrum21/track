package com.track.track.service;

import org.apache.poi.xslf.usermodel.*;
import org.apache.poi.xwpf.usermodel.*;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.*;
import java.util.List;

@Service
public class FileConversionService {

    public byte[] convertToPdf(MultipartFile file) throws Exception {
        String filename = file.getOriginalFilename();
        if (filename == null) throw new Exception("No filename");

        String lower = filename.toLowerCase();
        if (lower.endsWith(".pdf")) {
            return file.getBytes();
        } else if (lower.endsWith(".docx")) {
            return convertDocxToPdf(file.getInputStream());
        } else if (lower.endsWith(".pptx")) {
            return convertPptxToPdf(file.getInputStream());
        } else {
            throw new Exception("Unsupported file type: " + filename);
        }
    }

    private byte[] convertDocxToPdf(InputStream input) throws Exception {
        XWPFDocument doc = new XWPFDocument(input);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        PDDocument pdf = new PDDocument();
        PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

        for (XWPFParagraph para : doc.getParagraphs()) {
            String text = para.getText();
            if (text == null || text.isBlank()) continue;

            PDPage page = new PDPage();
            pdf.addPage(page);

            try (var stream = new org.apache.pdfbox.pdmodel.PDPageContentStream(pdf, page)) {
                stream.beginText();
                stream.setFont(font, 11);
                stream.setLeading(14);
                stream.newLineAtOffset(50, 750);

                for (String line : wrapText(text, 90)) {
                    stream.showText(sanitize(line));
                    stream.newLine();
                }
                stream.endText();
            }
        }

        if (pdf.getNumberOfPages() == 0) pdf.addPage(new PDPage());
        pdf.save(out);
        pdf.close();
        doc.close();
        return out.toByteArray();
    }

    private byte[] convertPptxToPdf(InputStream input) throws Exception {
        XMLSlideShow pptx = new XMLSlideShow(input);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        PDDocument pdf = new PDDocument();
        PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

        for (XSLFSlide slide : pptx.getSlides()) {
            PDPage page = new PDPage();
            pdf.addPage(page);

            try (var stream = new org.apache.pdfbox.pdmodel.PDPageContentStream(pdf, page)) {
                stream.beginText();
                stream.setFont(font, 11);
                stream.setLeading(16);
                stream.newLineAtOffset(50, 750);

                for (XSLFShape shape : slide.getShapes()) {
                    if (shape instanceof XSLFTextShape textShape) {
                        for (XSLFTextParagraph para : textShape.getTextParagraphs()) {
                            String text = para.getText();
                            if (text == null || text.isBlank()) continue;
                            for (String line : wrapText(text, 90)) {
                                stream.showText(sanitize(line));
                                stream.newLine();
                            }
                        }
                    }
                }
                stream.endText();
            }
        }

        if (pdf.getNumberOfPages() == 0) pdf.addPage(new PDPage());
        pdf.save(out);
        pdf.close();
        pptx.close();
        return out.toByteArray();
    }

    private String sanitize(String text) {
        if (text == null) return "";
        StringBuilder sb = new StringBuilder();
        for (char c : text.toCharArray()) {
            if (c == 0x09 || c == 0x0A || c == 0x0D) {
                sb.append(' '); // replace tab/LF/CR with space
            } else if (c >= 0x20 && c != 0x7F) {
                sb.append(c); // keep printable ASCII
            }
            // drop all other control characters
        }
        return sb.toString();
    }

    private List<String> wrapText(String text, int maxChars) {
        text = sanitize(text);
        if (text.isBlank()) return List.of();
        if (text.length() <= maxChars) return List.of(text);
        java.util.List<String> lines = new java.util.ArrayList<>();
        while (text.length() > maxChars) {
            int split = text.lastIndexOf(' ', maxChars);
            if (split == -1) split = maxChars;
            lines.add(text.substring(0, split));
            text = text.substring(split).trim();
        }
        if (!text.isBlank()) lines.add(text);
        return lines;
    }
}