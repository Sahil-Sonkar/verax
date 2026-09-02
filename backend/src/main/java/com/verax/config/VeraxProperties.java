package com.verax.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "verax")
public class VeraxProperties {

    private String appName = "Verax";
    private String uploadDir = "./uploads";
    private boolean seed = true;
    private double streakThreshold = 0.5;
    private String usdaApiKey = "DEMO_KEY";
    private String ninjasApiKey = "";
    private final Jwt jwt = new Jwt();
    private final Oauth oauth = new Oauth();

    public String getAppName() {
        return appName;
    }

    public void setAppName(String appName) {
        this.appName = appName;
    }

    public String getUploadDir() {
        return uploadDir;
    }

    public void setUploadDir(String uploadDir) {
        this.uploadDir = uploadDir;
    }

    public boolean isSeed() {
        return seed;
    }

    public void setSeed(boolean seed) {
        this.seed = seed;
    }

    public double getStreakThreshold() {
        return streakThreshold;
    }

    public void setStreakThreshold(double streakThreshold) {
        this.streakThreshold = streakThreshold;
    }

    public Jwt getJwt() {
        return jwt;
    }

    public Oauth getOauth() {
        return oauth;
    }

    public String getUsdaApiKey() {
        return usdaApiKey == null || usdaApiKey.isBlank() ? "DEMO_KEY" : usdaApiKey;
    }

    public void setUsdaApiKey(String usdaApiKey) {
        this.usdaApiKey = usdaApiKey;
    }

    public String getNinjasApiKey() {
        return ninjasApiKey == null ? "" : ninjasApiKey.trim();
    }

    public void setNinjasApiKey(String ninjasApiKey) {
        this.ninjasApiKey = ninjasApiKey;
    }

    public static class Jwt {
        private String secret;
        private Duration ttl = Duration.ofDays(7);

        public String getSecret() {
            return secret;
        }

        public void setSecret(String secret) {
            this.secret = secret;
        }

        public Duration getTtl() {
            return ttl;
        }

        public void setTtl(Duration ttl) {
            this.ttl = ttl;
        }
    }

    public static class Oauth {
        private String googleClientId = "";
        private String googleClientSecret = "";
        private String appleClientId = "";

        public String getGoogleClientId() {
            return googleClientId;
        }

        public void setGoogleClientId(String googleClientId) {
            this.googleClientId = googleClientId;
        }

        public String getGoogleClientSecret() {
            return googleClientSecret;
        }

        public void setGoogleClientSecret(String googleClientSecret) {
            this.googleClientSecret = googleClientSecret;
        }

        public String getAppleClientId() {
            return appleClientId;
        }

        public void setAppleClientId(String appleClientId) {
            this.appleClientId = appleClientId;
        }

        public boolean googleEnabled() {
            return googleClientId != null && !googleClientId.isBlank();
        }

        public boolean googleCalendarEnabled() {
            return googleEnabled() && googleClientSecret != null && !googleClientSecret.isBlank();
        }

        public boolean appleEnabled() {
            return appleClientId != null && !appleClientId.isBlank();
        }
    }
}
