package com.verax.recipe;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class FoodSearchServiceTest {

    @Test
    void parseServingReadsGramsAndMl() {
        RecipeDtos.ServingOption grams = FoodSearchService.parseServing("30 g");
        assertNotNull(grams);
        assertEquals(0, grams.amount().compareTo(new BigDecimal("30")));
        assertEquals("g", grams.unit());

        RecipeDtos.ServingOption ml = FoodSearchService.parseServing("250ml");
        assertNotNull(ml);
        assertEquals(0, ml.amount().compareTo(new BigDecimal("250")));
        assertEquals("ml", ml.unit());
    }

    @Test
    void parseServingConvertsLitersToMl() {
        RecipeDtos.ServingOption liter = FoodSearchService.parseServing("1 l");
        assertNotNull(liter);
        assertEquals(0, liter.amount().compareTo(new BigDecimal("1000")));
        assertEquals("ml", liter.unit());
    }

    @Test
    void parseServingRejectsJunk() {
        assertNull(FoodSearchService.parseServing("one cup"));
        assertNull(FoodSearchService.parseServing(""));
    }
}
