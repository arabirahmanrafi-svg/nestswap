package com.nestswap.service;

import com.nestswap.web.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

/**
 * Saves listing photos to a folder on disk. Swap this class for S3 / Cloudinary later
 * without touching anything else.
 */
@Service
public class StorageService {

    private final Path root;

    public StorageService(@Value("${app.upload-dir}") String uploadDir) throws IOException {
        this.root = Path.of(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    /** Validates the file really is an image and stores it under a random name. Returns that name. */
    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) throw ApiException.badRequest("One of the photos is empty.");
        String ext = detectImageExtension(file);
        String name = UUID.randomUUID() + "." + ext;
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, root.resolve(name), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IllegalStateException("Could not save photo", e);
        }
        return name;
    }

    public void delete(String fileName) {
        try {
            Path target = root.resolve(fileName).normalize();
            if (target.startsWith(root)) Files.deleteIfExists(target);
        } catch (IOException ignored) {
            // A leftover file is harmless; don't fail the user's request over it.
        }
    }

    /**
     * Checks the first bytes of the file ("magic numbers") instead of trusting the
     * file name or the browser's content type, so nobody can upload a script named photo.jpg.
     */
    private String detectImageExtension(MultipartFile file) {
        byte[] h = new byte[12];
        int n;
        try (InputStream in = file.getInputStream()) {
            n = in.readNBytes(h, 0, h.length);
        } catch (IOException e) {
            throw ApiException.badRequest("Could not read one of the photos.");
        }
        if (n >= 3 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) return "jpg";
        if (n >= 4 && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G') return "png";
        if (n >= 3 && h[0] == 'G' && h[1] == 'I' && h[2] == 'F') return "gif";
        if (n >= 12 && h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F'
                && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P') return "webp";
        throw ApiException.badRequest("Photos must be JPG, PNG, WEBP or GIF. (iPhone HEIC photos: export as JPG first.)");
    }
}
