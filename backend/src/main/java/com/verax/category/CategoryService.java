package com.verax.category;

import com.verax.common.ApiException;
import com.verax.user.User;
import com.verax.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class CategoryService {

    public static final List<DefaultCategory> DEFAULTS = List.of(
            new DefaultCategory("fitness", "Body", "#f77737", "body", 0),
            new DefaultCategory("career", "Career", "#0095f6", "career", 1),
            new DefaultCategory("content", "Content", "#e1306c", "brand", 2),
            new DefaultCategory("appearance", "Appearance", "#fcaf45", "appearance", 3),
            new DefaultCategory("learning", "Learning", "#833ab4", "growth", 4),
            new DefaultCategory("personal", "Personal", "#f9ce34", "personal", 5),
            new DefaultCategory("finance", "Finance", "#405de6", "finance", 6),
            new DefaultCategory("health", "Health", "#ed4956", "health", 7),
            new DefaultCategory("relationships", "Relationships", "#c13584", "relationships", 8),
            new DefaultCategory("other", "Other", "#5b51d8", "other", 9)
    );

    private final CategoryRepository categories;
    private final UserRepository users;

    public CategoryService(CategoryRepository categories, UserRepository users) {
        this.categories = categories;
        this.users = users;
    }

    @Transactional
    public void createDefaultsFor(UUID userId) {
        User user = users.getReferenceById(userId);
        for (DefaultCategory def : DEFAULTS) {
            Category category = new Category();
            category.setUser(user);
            category.setName(def.name());
            category.setSlug(def.key());
            category.setColor(def.color());
            category.setIcon(def.icon());
            category.setSortOrder(def.sortOrder());
            category.setSystemKey(def.key());
            categories.save(category);
        }
    }

    public List<CategoryDtos.Response> list(UUID userId) {
        return categories.findByUserIdOrderBySortOrderAscNameAsc(userId).stream()
                .map(CategoryDtos.Response::from)
                .toList();
    }

    @Transactional
    public CategoryDtos.Response create(UUID userId, CategoryDtos.Upsert request) {
        String slug = slugify(request.name());
        if (categories.existsByUserIdAndSlug(userId, slug)) {
            throw ApiException.conflict("A category with that name already exists");
        }
        User user = users.getReferenceById(userId);
        Category category = new Category();
        category.setUser(user);
        category.setName(request.name().trim());
        category.setSlug(slug);
        category.setColor(request.color());
        category.setIcon(request.icon());
        category.setSortOrder(request.sortOrder() == null ? 50 : request.sortOrder());
        categories.save(category);
        return CategoryDtos.Response.from(category);
    }

    @Transactional
    public CategoryDtos.Response update(UUID userId, UUID id, CategoryDtos.Upsert request) {
        Category category = require(userId, id);
        if (request.name() != null && !request.name().isBlank()) {
            category.setName(request.name().trim());
            if (category.getSystemKey() == null) {
                category.setSlug(slugify(request.name()));
            }
        }
        if (request.color() != null) {
            category.setColor(request.color());
        }
        if (request.icon() != null) {
            category.setIcon(request.icon());
        }
        if (request.sortOrder() != null) {
            category.setSortOrder(request.sortOrder());
        }
        return CategoryDtos.Response.from(category);
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        Category category = require(userId, id);
        if (category.getSystemKey() != null) {
            throw ApiException.badRequest("Default categories cannot be deleted");
        }
        categories.delete(category);
    }

    public Category require(UUID userId, UUID id) {
        return categories.findByIdAndUserId(id, userId)
                .orElseThrow(() -> ApiException.notFound("Category not found"));
    }

    public Category bySystemKey(UUID userId, String key) {
        return categories.findByUserIdAndSystemKey(userId, key)
                .orElseThrow(() -> ApiException.notFound("Category not found: " + key));
    }

    public static String slugify(String name) {
        return name.trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
    }

    public record DefaultCategory(String key, String name, String color, String icon, int sortOrder) {
    }
}
