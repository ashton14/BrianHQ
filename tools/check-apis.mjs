// node tools/check-apis.mjs — are the live endpoints still up AND still CORS-open?
// Run this first whenever a tile looks wrong: it separates "our bug" from "their change".

const ORIGIN = "https://ashton14.github.io";
// CNBC gates this endpoint on User-Agent: Node fetch's default UA gets an empty
// {} with no CORS header, a real browser UA gets the quotes. We impersonate a
// browser here so this tool tests what the page actually experiences.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
let failures = 0;

async function probe(label, url, check) {
  try {
    const res = await fetch(url, { headers: { Origin: ORIGIN, "User-Agent": UA } });
    const acao = res.headers.get("access-control-allow-origin");
    const json = await res.json();
    const problems = [];
    if (!res.ok) problems.push(`HTTP ${res.status}`);
    if (!acao) problems.push("no access-control-allow-origin header — the browser will block this");
    problems.push(...(check(json) || []));
    if (problems.length) { console.error(`FAIL  ${label}\n      ${problems.join("\n      ")}`); failures++; }
    else console.log(`ok    ${label}  (ACAO: ${acao})`);
  } catch (err) {
    console.error(`FAIL  ${label}\n      ${err.message}`);
    failures++;
  }
}

const MARKETS =
  "https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol" +
  "?symbols=.SPX%7C.IXIC%7C.DJI&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json&events=1";

await probe("CNBC quotes", MARKETS, (j) => {
  const list = j?.FormattedQuoteResult?.FormattedQuote;
  if (!Array.isArray(list)) return ["FormattedQuoteResult.FormattedQuote is not an array"];
  const out = [];
  for (const sym of [".SPX", ".IXIC", ".DJI"]) {
    const q = list.find((x) => x.symbol === sym);
    if (!q) out.push(`missing ${sym}`);
    else for (const f of ["last", "change", "change_pct", "curmktstatus"])
      if (q[f] == null) out.push(`${sym} missing field ${f}`);
  }
  if (!out.length) console.log(`      ${list.map((q) => `${q.shortName} ${q.last} ${q.change_pct}`).join("  |  ")}`);
  return out;
});

for (const path of ["football/nfl", "basketball/nba", "baseball/mlb", "golf/pga"]) {
  await probe(`ESPN ${path}`, `https://site.api.espn.com/apis/site/v2/sports/${path}/news?limit=3`, (j) => {
    const a = j?.articles?.[0];
    if (!a) return ["no articles in payload"];
    const out = [];
    if (!a.headline) out.push("article missing headline");
    if (!a?.links?.web?.href) out.push("article missing links.web.href");
    if (!a.published) out.push("article missing published");
    if (!out.length) console.log(`      "${a.headline}"`);
    return out;
  });
}

console.log(failures ? `\n${failures} endpoint problem(s).\n` : "\nAll endpoints healthy.\n");
process.exit(failures ? 1 : 0);
