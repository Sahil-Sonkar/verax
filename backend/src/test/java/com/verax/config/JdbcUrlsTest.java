package com.verax.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class JdbcUrlsTest {

    @Test
    void keepsJdbc() {
        JdbcUrls.Target target = JdbcUrls.parse(
                "jdbc:postgresql://localhost:5432/verax",
                "sahil",
                ""
        );
        assertEquals("jdbc:postgresql://localhost:5432/verax", target.jdbc());
        assertEquals("sahil", target.username());
    }

    @Test
    void convertsPostgresUri() {
        JdbcUrls.Target target = JdbcUrls.parse(
                "postgres://verax:s3cret@db.internal:5432/verax",
                "",
                ""
        );
        assertEquals("jdbc:postgresql://db.internal:5432/verax?sslmode=require", target.jdbc());
        assertEquals("verax", target.username());
        assertEquals("s3cret", target.password());
    }
}
