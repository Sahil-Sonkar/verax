package com.verax.asset;

import com.verax.common.ApiException;
import com.verax.config.VeraxProperties;
import com.verax.user.User;
import com.verax.user.UserRepository;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class AssetService {

    private static final Set<String> ALLOWED = Set.of("image/jpeg", "image/png", "image/webp");

    private final AssetRepository assets;
    private final UserRepository users;
    private final Path root;

    public AssetService(AssetRepository assets, UserRepository users, VeraxProperties properties) {
        this.assets = assets;
        this.users = users;
        this.root = Path.of(properties.getUploadDir()).toAbsolutePath().normalize();
    }

    @Transactional
    public AssetDtos.Response upload(
            UUID userId,
            MultipartFile file,
            String kind,
            String category,
            LocalDate takenAt,
            String notes
    ) {
        if (file.isEmpty()) {
            throw ApiException.badRequest("File is required");
        }
        String contentType = file.getContentType() == null ? "application/octet-stream" : file.getContentType();
        if (!ALLOWED.contains(contentType)) {
            throw ApiException.badRequest("Only JPEG, PNG, or WebP images are supported");
        }
        try {
            Files.createDirectories(root);
            String key = userId + "/" + UUID.randomUUID();
            Path target = root.resolve(key);
            Files.createDirectories(target.getParent());
            file.transferTo(target);
            User user = users.getReferenceById(userId);
            Asset asset = new Asset();
            asset.setUser(user);
            asset.setKind(kind == null ? "PROGRESS_PHOTO" : kind);
            asset.setCategory(category);
            asset.setOriginalFilename(file.getOriginalFilename());
            asset.setContentType(contentType);
            asset.setStorageKey(key);
            asset.setTakenAt(takenAt == null ? LocalDate.now() : takenAt);
            asset.setNotes(notes);
            assets.save(asset);
            return AssetDtos.Response.from(asset);
        } catch (IOException ex) {
            throw ApiException.badRequest("Could not store file");
        }
    }

    public List<AssetDtos.Response> list(UUID userId, String kind) {
        return assets.findByUserIdAndKindOrderByTakenAtDescCreatedAtDesc(userId, kind).stream()
                .map(AssetDtos.Response::from)
                .toList();
    }

    public LoadedFile load(UUID userId, UUID id) {
        Asset asset = assets.findByIdAndUserId(id, userId)
                .orElseThrow(() -> ApiException.notFound("Photo not found"));
        Path path = root.resolve(asset.getStorageKey());
        return new LoadedFile(new FileSystemResource(path), asset.getContentType(), asset.getOriginalFilename());
    }

    public record LoadedFile(Resource resource, String contentType, String filename) {
        public MediaType mediaType() {
            return MediaType.parseMediaType(contentType);
        }
    }
}
