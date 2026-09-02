package com.verax.finance;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PriceQuoteService {

    private static final Logger log = LoggerFactory.getLogger(PriceQuoteService.class);
    private static final Duration CACHE_FOR = Duration.ofSeconds(45);
    private static final Map<String, String> COMMODITY = Map.ofEntries(
            Map.entry("gold", "GCW00:COMEX"),
            Map.entry("xau", "GCW00:COMEX"),
            Map.entry("xauusd", "GCW00:COMEX"),
            Map.entry("gc", "GCW00:COMEX"),
            Map.entry("gcw00", "GCW00:COMEX"),
            Map.entry("silver", "SIW00:COMEX"),
            Map.entry("xag", "SIW00:COMEX"),
            Map.entry("xagusd", "SIW00:COMEX"),
            Map.entry("si", "SIW00:COMEX"),
            Map.entry("siw00", "SIW00:COMEX"),
            Map.entry("crude", "CLW00:NYMEX"),
            Map.entry("oil", "CLW00:NYMEX"),
            Map.entry("wti", "CLW00:NYMEX"),
            Map.entry("cl", "CLW00:NYMEX"),
            Map.entry("copper", "HGW00:COMEX"),
            Map.entry("hg", "HGW00:COMEX")
    );
    private static final Map<String, String> CRYPTO = Map.ofEntries(
            Map.entry("btc", "BTC-USD"),
            Map.entry("bitcoin", "BTC-USD"),
            Map.entry("eth", "ETH-USD"),
            Map.entry("ethereum", "ETH-USD"),
            Map.entry("sol", "SOL-USD"),
            Map.entry("solana", "SOL-USD"),
            Map.entry("doge", "DOGE-USD"),
            Map.entry("xrp", "XRP-USD"),
            Map.entry("ada", "ADA-USD")
    );

    private final RestClient http;
    private final ConcurrentHashMap<String, Cached> cache = new ConcurrentHashMap<>();

    public PriceQuoteService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(6));
        factory.setReadTimeout(Duration.ofSeconds(8));
        this.http = RestClient.builder()
                .requestFactory(factory)
                .defaultHeader(
                        "User-Agent",
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                )
                .defaultHeader("Accept-Language", "en-US,en;q=0.9")
                .defaultHeader("Accept", "text/html,application/xhtml+xml")
                .build();
    }

    public FinanceDtos.QuoteView quote(String kind, String query) {
        FinanceDtos.MarketQuote live = liveQuote(kind, query);
        if (live == null || live.ltp() == null) {
            throw com.verax.common.ApiException.badRequest("Could not fetch a live price. Enter the value by hand.");
        }
        return new FinanceDtos.QuoteView(live.name(), live.symbol(), live.ltp(), live.currency(), live.source(), null);
    }

    public FinanceDtos.MarketQuote liveQuote(String kind, String query) {
        if (query == null || query.isBlank()) {
            throw com.verax.common.ApiException.badRequest("Query is required");
        }
        String type = kind == null ? "" : kind.trim().toUpperCase(Locale.ROOT);
        String q = query.trim();
        String cacheKey = type + "|" + q.toUpperCase(Locale.ROOT);
        Cached cached = cache.get(cacheKey);
        if (cached != null && cached.expiresAt().isAfter(Instant.now())) {
            return cached.quote();
        }
        FinanceDtos.MarketQuote quote = fetch(type, q);
        if (quote != null) {
            cache.put(cacheKey, new Cached(quote, Instant.now().plus(CACHE_FOR)));
        }
        return quote;
    }

    public FinanceDtos.MarketQuote quoteHolding(Holding holding) {
        String ticker = holding.getTicker() != null && !holding.getTicker().isBlank()
                ? holding.getTicker()
                : holding.getName();
        if (ticker == null || ticker.isBlank()) {
            return null;
        }
        try {
            String query = ticker;
            if (holding.getExchange() != null && !holding.getExchange().isBlank() && !ticker.contains(":")) {
                query = ticker.trim() + ":" + holding.getExchange().trim().toUpperCase(Locale.ROOT);
            }
            return liveQuote(holding.getKind(), query);
        } catch (Exception ex) {
            log.info("Quote failed for holding {}: {}", ticker, ex.getMessage());
            return null;
        }
    }

    public BigDecimal usdInr() {
        try {
            FinanceDtos.MarketQuote fx = liveQuote("FX", "USD-INR");
            return fx == null ? null : fx.ltp();
        } catch (Exception ex) {
            log.info("USD-INR quote failed: {}", ex.getMessage());
            return null;
        }
    }

    private FinanceDtos.MarketQuote fetch(String type, String query) {
        for (String symbol : candidates(type, query)) {
            FinanceDtos.MarketQuote quote = pull(symbol);
            if (quote != null) {
                return quote;
            }
        }
        return pullSearch(query);
    }

    private FinanceDtos.MarketQuote pull(String symbol) {
        if (symbol == null || symbol.isBlank()) {
            return null;
        }
        try {
            String html = http.get()
                    .uri(URI.create("https://www.google.com/finance/quote/" + symbol + "?hl=en"))
                    .retrieve()
                    .body(String.class);
            FinanceDtos.MarketQuote quote = GoogleFinanceParser.parse(html, symbol);
            if (quote == null || quote.ltp() == null) {
                return null;
            }
            return quote;
        } catch (Exception ex) {
            log.debug("Google Finance missed {}: {}", symbol, ex.getMessage());
            return null;
        }
    }

    private FinanceDtos.MarketQuote pullSearch(String query) {
        try {
            String html = http.get()
                    .uri(URI.create("https://www.google.com/finance?q=" + encPath(query) + "&hl=en"))
                    .retrieve()
                    .body(String.class);
            return GoogleFinanceParser.parse(html, query);
        } catch (Exception ex) {
            log.debug("Google Finance search missed {}: {}", query, ex.getMessage());
            return null;
        }
    }

    static List<String> candidates(String type, String query) {
        String raw = query.trim();
        String upper = raw.toUpperCase(Locale.ROOT).replace(" ", "");
        String lower = raw.toLowerCase(Locale.ROOT).trim();
        List<String> out = new ArrayList<>();
        if (upper.contains(":")) {
            out.add(upper.replace(".NS", "").replace(".BO", ""));
            return out;
        }
        if (upper.endsWith(".NS")) {
            out.add(upper.substring(0, upper.length() - 3) + ":NSE");
            return out;
        }
        if (upper.endsWith(".BO") || upper.endsWith(".BSE")) {
            String ticker = upper.replace(".BSE", "").replace(".BO", "");
            out.add(ticker + ":BOM");
            return out;
        }
        if (type.contains("GOLD") || type.contains("SILVER") || type.contains("COM")) {
            String mapped = COMMODITY.get(lower.replace(" ", ""));
            out.add(mapped != null ? mapped : (upper.contains(":") ? upper : upper + ":COMEX"));
            return out;
        }
        if (type.contains("CRYPTO")) {
            out.add(CRYPTO.getOrDefault(lower, upper.contains("-") ? upper : upper + "-USD"));
            return out;
        }
        if (type.contains("FX") || upper.contains("-")) {
            out.add(upper);
            return out;
        }
        if (type.contains("US")) {
            if (upper.contains(".")) {
                out.add(upper + ":NYSE");
                out.add(upper + ":NASDAQ");
            } else {
                out.add(upper + ":NASDAQ");
                out.add(upper + ":NYSE");
            }
            out.add(upper);
            return out;
        }
        out.add(upper + ":NSE");
        out.add(upper + ":BOM");
        out.add(upper);
        return out;
    }

    private static String encPath(String value) {
        return value.replace(" ", "+");
    }

    private record Cached(FinanceDtos.MarketQuote quote, Instant expiresAt) {
    }
}
