package com.verax.category;

import com.verax.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categories;
    private final CurrentUser currentUser;

    public CategoryController(CategoryService categories, CurrentUser currentUser) {
        this.categories = categories;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<CategoryDtos.Response> list() {
        return categories.list(currentUser.id());
    }

    @PostMapping
    public CategoryDtos.Response create(@Valid @RequestBody CategoryDtos.Upsert request) {
        return categories.create(currentUser.id(), request);
    }

    @PatchMapping("/{id}")
    public CategoryDtos.Response update(@PathVariable UUID id, @RequestBody CategoryDtos.Upsert request) {
        return categories.update(currentUser.id(), id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable UUID id) {
        categories.delete(currentUser.id(), id);
    }
}
