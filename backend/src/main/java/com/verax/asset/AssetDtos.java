package com.verax.asset;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public final class AssetDtos {

    private AssetDtos() {
    }

    public record Response(
            UUID id,
            String kind,
            String category,
            LocalDate takenAt,
            String notes,
            String url,
            Instant createdAt
    ) {
        public static Response from(Asset asset) {
            return new Response(
                    asset.getId(),
                    asset.getKind(),
                    asset.getCategory(),
                    asset.getTakenAt(),
                    asset.getNotes(),
                    "/api/photos/" + asset.getId() + "/file",
                    asset.getCreatedAt()
            );
        }
    }
}
