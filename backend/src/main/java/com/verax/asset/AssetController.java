package com.verax.asset;

import com.verax.security.CurrentUser;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/photos")
public class AssetController {

    private final AssetService assets;
    private final CurrentUser currentUser;

    public AssetController(AssetService assets, CurrentUser currentUser) {
        this.assets = assets;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<AssetDtos.Response> list(@RequestParam(defaultValue = "PROGRESS_PHOTO") String kind) {
        return assets.list(currentUser.id(), kind);
    }

    @PostMapping
    public AssetDtos.Response upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "PROGRESS_PHOTO") String kind,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate takenAt,
            @RequestParam(required = false) String notes
    ) {
        return assets.upload(currentUser.id(), file, kind, category, takenAt, notes);
    }

    @GetMapping("/{id}/file")
    public ResponseEntity<org.springframework.core.io.Resource> file(@PathVariable UUID id) {
        AssetService.LoadedFile loaded = assets.load(currentUser.id(), id);
        return ResponseEntity.ok()
                .contentType(loaded.mediaType())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .body(loaded.resource());
    }
}
