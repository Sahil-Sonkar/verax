package com.verax.finance;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class GoogleFinanceParser {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Pattern DS3 = Pattern.compile(
            "AF_initDataCallback\\(\\{key: 'ds:3'.*?data:(.*?), sideChannel:",
            Pattern.DOTALL
    );
    private static final Pattern METRIC = Pattern.compile(
            "class=\"SwQK7\">([^<]+)</div><div class=\"dO6ijd\">([^<]+)</div>"
    );
    private static final Pattern HEADER_PRICE = Pattern.compile(
            "class=\"N6SYTe\"><span jsname=\"Pdsbrc\"[^>]*>\\s*<span>([^<]+)</span>"
    );
    private static final Pattern HEADER_CHANGE = Pattern.compile(
            "class=\"DAicsd\".*?jsname=\"xnruHf\"[^>]*>\\s*<span>([^<]+)</span>.*?jsname=\"vY9t3b\"[^>]*>\\s*<span[^>]*>([^<]+)</span>",
            Pattern.DOTALL
    );

    private GoogleFinanceParser() {
    }

    static FinanceDtos.MarketQuote parse(String html, String fallbackQuery) {
        if (html == null || html.isBlank()) {
            return null;
        }
        FinanceDtos.MarketQuote fromJson = fromDs3(html, fallbackQuery);
        Map<String, String> metrics = metrics(html);
        if (fromJson != null) {
            return mergeMetrics(fromJson, metrics);
        }
        return fromHeader(html, fallbackQuery, metrics);
    }

    static boolean hasQuote(String html) {
        FinanceDtos.MarketQuote quote = parse(html, "");
        return quote != null && quote.ltp() != null && quote.ltp().signum() != 0;
    }

    private static FinanceDtos.MarketQuote fromDs3(String html, String fallbackQuery) {
        Matcher matcher = DS3.matcher(html);
        if (!matcher.find()) {
            return null;
        }
        try {
            JsonNode root = JSON.readTree(matcher.group(1));
            JsonNode row = root.path(0).path(0).path(0);
            if (!row.isArray() || row.size() < 6 || !row.get(5).isArray()) {
                return null;
            }
            JsonNode pair = row.get(1);
            String ticker = text(pair, 0);
            String exchange = text(pair, 1);
            String name = text(row, 2);
            String currency = text(row, 4);
            JsonNode px = row.get(5);
            BigDecimal ltp = decimal(px, 0);
            if (ltp == null) {
                return null;
            }
            BigDecimal dayChange = decimal(px, 1);
            BigDecimal dayChangePct = decimal(px, 2);
            BigDecimal lastClose = decimal(row, 7);
            String symbol = firstText(row, 21, 20);
            if (symbol == null || symbol.isBlank()) {
                symbol = join(ticker, exchange);
            }
            if (ticker == null || ticker.isBlank()) {
                ticker = symbol != null && symbol.contains("-") ? symbol : fallbackQuery;
            }
            if (currency == null || currency.isBlank()) {
                currency = inferCurrency(symbol, exchange);
            }
            if (name == null || name.isBlank()) {
                name = fallbackQuery;
            }
            return new FinanceDtos.MarketQuote(
                    name,
                    ticker,
                    exchange,
                    symbol,
                    ltp,
                    dayChange,
                    dayChangePct,
                    lastClose,
                    null,
                    null,
                    null,
                    null,
                    null,
                    currency,
                    "google-finance"
            );
        } catch (Exception ex) {
            return null;
        }
    }

    private static FinanceDtos.MarketQuote fromHeader(String html, String fallbackQuery, Map<String, String> metrics) {
        Matcher price = HEADER_PRICE.matcher(html);
        if (!price.find()) {
            return null;
        }
        BigDecimal ltp = money(price.group(1));
        if (ltp == null) {
            return null;
        }
        BigDecimal change = null;
        BigDecimal changePct = null;
        Matcher chg = HEADER_CHANGE.matcher(html);
        if (chg.find()) {
            change = money(chg.group(1));
            changePct = percent(chg.group(2));
        }
        BigDecimal lastClose = money(first(metrics, "Previous close", "Prev. close", "Last close"));
        if (lastClose == null && change != null) {
            lastClose = ltp.subtract(change);
        }
        String currency = price.group(1).contains("₹") ? "INR" : "USD";
        return mergeMetrics(
                new FinanceDtos.MarketQuote(
                        fallbackQuery,
                        fallbackQuery,
                        null,
                        fallbackQuery,
                        ltp,
                        change,
                        changePct,
                        lastClose,
                        null,
                        null,
                        null,
                        null,
                        null,
                        currency,
                        "google-finance"
                ),
                metrics
        );
    }

    private static FinanceDtos.MarketQuote mergeMetrics(FinanceDtos.MarketQuote quote, Map<String, String> metrics) {
        if (metrics.isEmpty()) {
            return quote;
        }
        String capLabel = first(metrics, "Mkt. cap", "Market cap", "Market Cap");
        String volumeLabel = first(metrics, "Volume", "Avg. vol.", "Avg Volume");
        String peLabel = first(metrics, "P/E ratio", "PE ratio", "P/E");
        BigDecimal lastClose = quote.lastClose() != null
                ? quote.lastClose()
                : money(first(metrics, "Previous close", "Prev. close", "Last close"));
        return new FinanceDtos.MarketQuote(
                quote.name(),
                quote.ticker(),
                quote.exchange(),
                quote.symbol(),
                quote.ltp(),
                quote.dayChange(),
                quote.dayChangePct(),
                lastClose,
                compactNumber(capLabel),
                capLabel,
                decimalOrNull(peLabel),
                compactNumber(volumeLabel),
                volumeLabel,
                quote.currency(),
                quote.source()
        );
    }

    private static Map<String, String> metrics(String html) {
        Map<String, String> map = new LinkedHashMap<>();
        Matcher matcher = METRIC.matcher(html);
        while (matcher.find()) {
            map.putIfAbsent(matcher.group(1).trim(), matcher.group(2).trim());
        }
        return map;
    }

    static BigDecimal compactNumber(String raw) {
        if (raw == null || raw.isBlank() || "-".equals(raw.trim())) {
            return null;
        }
        String value = raw.replace("₹", "").replace("$", "").replace(",", "").replace("%", "").trim();
        if (value.isEmpty()) {
            return null;
        }
        BigDecimal factor = BigDecimal.ONE;
        char suffix = Character.toUpperCase(value.charAt(value.length() - 1));
        if (suffix == 'T' || suffix == 'B' || suffix == 'M' || suffix == 'K') {
            factor = switch (suffix) {
                case 'T' -> new BigDecimal("1000000000000");
                case 'B' -> new BigDecimal("1000000000");
                case 'M' -> new BigDecimal("1000000");
                default -> new BigDecimal("1000");
            };
            value = value.substring(0, value.length() - 1).trim();
        }
        try {
            return new BigDecimal(value).multiply(factor).setScale(4, RoundingMode.HALF_UP);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    static BigDecimal money(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String value = raw.replace("₹", "").replace("$", "").replace(",", "").replace("+", "").trim();
        if (value.endsWith("%")) {
            return percent(value);
        }
        try {
            return new BigDecimal(value).setScale(4, RoundingMode.HALF_UP);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static BigDecimal percent(String raw) {
        if (raw == null) {
            return null;
        }
        String value = raw.replace("%", "").replace("+", "").replace(",", "").trim();
        try {
            return new BigDecimal(value).setScale(4, RoundingMode.HALF_UP);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static BigDecimal decimal(JsonNode node, int index) {
        if (node == null || !node.isArray() || index >= node.size() || node.get(index).isNull()) {
            return null;
        }
        try {
            return new BigDecimal(node.get(index).asText()).setScale(4, RoundingMode.HALF_UP);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static BigDecimal decimalOrNull(String raw) {
        if (raw == null || raw.isBlank() || "-".equals(raw.trim())) {
            return null;
        }
        return money(raw);
    }

    private static String text(JsonNode node, int index) {
        if (node == null || !node.isArray() || index >= node.size() || node.get(index).isNull()) {
            return null;
        }
        if (node.get(index).isTextual() || node.get(index).isNumber()) {
            return node.get(index).asText();
        }
        return null;
    }

    private static String firstText(JsonNode row, int... indexes) {
        for (int index : indexes) {
            String value = text(row, index);
            if (value != null && !value.isBlank() && value.contains(":")) {
                return value;
            }
        }
        for (int index : indexes) {
            String value = text(row, index);
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private static String first(Map<String, String> metrics, String... keys) {
        for (String key : keys) {
            if (metrics.containsKey(key)) {
                return metrics.get(key);
            }
        }
        return null;
    }

    private static String join(String ticker, String exchange) {
        if (ticker == null || ticker.isBlank()) {
            return exchange;
        }
        if (exchange == null || exchange.isBlank()) {
            return ticker;
        }
        return ticker + ":" + exchange;
    }

    private static String inferCurrency(String symbol, String exchange) {
        if (symbol != null && symbol.endsWith("-INR")) {
            return "INR";
        }
        if ("NSE".equals(exchange) || "BOM".equals(exchange) || "BSE".equals(exchange)) {
            return "INR";
        }
        return "USD";
    }
}
