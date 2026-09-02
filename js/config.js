// ========= BRIAN'S HQ — every tunable lives here =========

export const CONFIG = {
  owner: "Brian",
  jerseyNumber: "23",
  photoCaption: "the crew",

  links: {
    etrade: "https://us.etrade.com/e/t/user/login",
    espn: "https://www.espn.com",
    shorts: "https://www.youtube.com/shorts",
    youtube: "https://www.youtube.com",
  },

  markets: {
    // CNBC public quote service: keyless, CORS `*`. Verified 200 + ACAO.
    url:
      "https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol" +
      "?symbols=.SPX%7C.IXIC%7C.DJI" +
      "&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json&events=1",
    refreshMs: 60_000,
    cacheKey: "markets.v1",
    // If CNBC ever changes: Finnhub free tier CORS-allows browser calls and the ETF
    // proxies SPY / QQQ / DIA track these three indices closely. Only parseMarkets()
    // in js/widgets/markets.js would need to change.
  },

  espn: {
    feeds: [
      { chip: "NFL", url: "https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=6" },
      { chip: "NBA", url: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news?limit=6" },
      { chip: "MLB", url: "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/news?limit=6" },
      { chip: "PGA", url: "https://site.api.espn.com/apis/site/v2/sports/golf/pga/news?limit=6" },
    ],
    count: 4,
    refreshMs: 15 * 60_000,
    cacheKey: "espn.v1",
  },

  // Shorts "damage" meter thresholds, in minutes. `full` is where the bar maxes
  // out and the alarm fires; the faces escalate to "call someone" just before it.
  shorts: { faces: [0, 5, 12, 20], full: 30 },
};
