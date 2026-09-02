package com.verax.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

public final class JdbcUrls {
    private JdbcUrls() {}

    public record Target(String jdbc, String username, String password) {}

    public static Target parse(String url, String username, String password) {
        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException("DATABASE_URL is required");
        }
        String user = username == null ? "" : username;
        String pass = password == null ? "" : password;
        if (url.startsWith("jdbc:")) {
            return new Target(url, user, pass);
        }
        String scheme = url.startsWith("postgres://") ? "postgres://"
                : url.startsWith("postgresql://") ? "postgresql://"
                : null;
        if (scheme == null) {
            throw new IllegalArgumentException("Unsupported database URL");
        }
        URI uri = URI.create("http://" + url.substring(scheme.length()));
        String userInfo = uri.getUserInfo();
        if (userInfo != null) {
            int colon = userInfo.indexOf(':');
            if (colon < 0) {
                user = decode(userInfo);
            } else {
                user = decode(userInfo.substring(0, colon));
                pass = decode(userInfo.substring(colon + 1));
            }
        }
        String host = uri.getHost();
        int port = uri.getPort() > 0 ? uri.getPort() : 5432;
        String path = uri.getPath();
        String db = path == null || path.length() <= 1 ? "verax" : path.substring(1);
        boolean local = "localhost".equals(host) || "127.0.0.1".equals(host);
        StringBuilder jdbc = new StringBuilder("jdbc:postgresql://")
                .append(host).append(':').append(port).append('/').append(db);
        if (uri.getQuery() != null && !uri.getQuery().isBlank()) {
            jdbc.append('?').append(uri.getQuery());
        } else if (!local) {
            jdbc.append("?sslmode=require");
        }
        return new Target(jdbc.toString(), user, pass);
    }

    private static String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }
}
