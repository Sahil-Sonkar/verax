package com.verax.finance;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GoogleFinanceParserTest {

    @Test
    void readsEmbeddedQuoteAndMetrics() {
        String html = """
                <script>AF_initDataCallback({key: 'ds:3', hash: '8', data:[[[["/g/x",["RELIANCE","NSE"],"Reliance Industries Ltd",0,"INR",[1294.9,7.9,0.61,2,2,2],null,1287,"#987f4b","IN","/m/x",[],"Asia/Calcutta",19800,"/g/x",null,null,[],null,null,null,"RELIANCE:NSE"]]]], sideChannel: {}});</script>
                <div class="KxsRFb"><div class="SwQK7">Mkt. cap</div><div class="dO6ijd">17.38T</div></div>
                <div class="KxsRFb"><div class="SwQK7">Volume</div><div class="dO6ijd">34.87M</div></div>
                <div class="KxsRFb"><div class="SwQK7">P/E ratio</div><div class="dO6ijd">23.45</div></div>
                """;
        FinanceDtos.MarketQuote quote = GoogleFinanceParser.parse(html, "RELIANCE");
        assertNotNull(quote);
        assertEquals("RELIANCE", quote.ticker());
        assertEquals("NSE", quote.exchange());
        assertEquals(0, quote.ltp().compareTo(new BigDecimal("1294.9000")));
        assertEquals(0, quote.dayChange().compareTo(new BigDecimal("7.9000")));
        assertEquals(0, quote.lastClose().compareTo(new BigDecimal("1287.0000")));
        assertEquals("17.38T", quote.marketCapLabel());
        assertEquals("34.87M", quote.volumeLabel());
        assertEquals(0, quote.peRatio().compareTo(new BigDecimal("23.4500")));
        assertEquals("INR", quote.currency());
        assertEquals("google-finance", quote.source());
    }

    @Test
    void parsesCompactMarketCap() {
        assertEquals(0, GoogleFinanceParser.compactNumber("17.38T").compareTo(new BigDecimal("17380000000000.0000")));
        assertEquals(0, GoogleFinanceParser.compactNumber("34.87M").compareTo(new BigDecimal("34870000.0000")));
        assertTrue(GoogleFinanceParser.compactNumber("-") == null);
    }

    @Test
    void commodityCandidatesResolveGoldAndSilver() {
        assertEquals("GCW00:COMEX", PriceQuoteService.candidates("COMMODITY", "gold").get(0));
        assertEquals("SIW00:COMEX", PriceQuoteService.candidates("COMMODITY", "SILVER").get(0));
        assertEquals("RELIANCE:NSE", PriceQuoteService.candidates("IN_STOCK", "RELIANCE").get(0));
        assertEquals("AAPL:NASDAQ", PriceQuoteService.candidates("US_STOCK", "AAPL").get(0));
        assertEquals("BRK.B:NYSE", PriceQuoteService.candidates("US_STOCK", "BRK.B").get(0));
        assertEquals("BTC-USD", PriceQuoteService.candidates("CRYPTO", "bitcoin").get(0));
    }
}
