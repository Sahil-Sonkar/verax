package com.verax.category;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public final class CategoryDtos {

    private CategoryDtos() {
    }

    public record Upsert(
            @NotBlank @Size(max = 80) String name,
            String color,
            String icon,
            Integer sortOrder
    ) {
    }

    public record Response(
            UUID id,
            String name,
            String slug,
            String color,
            String icon,
            int sortOrder,
            String systemKey
    ) {
        public static Response from(Category category) {
            return new Response(
                    category.getId(),
                    category.getName(),
                    category.getSlug(),
                    category.getColor(),
                    category.getIcon(),
                    category.getSortOrder(),
                    category.getSystemKey()
            );
        }
    }
}
