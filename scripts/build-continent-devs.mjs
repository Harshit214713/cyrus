#!/usr/bin/env node
/* ══ build-continent-devs.mjs — leaderboard locations -> continent hover counts
   The sign-in globe answers "who is here?" when you point at a landmass. The
   only people this site actually holds are the 220 contributors in
   data/crawl/leaderboard.jsonl, crawled from GitHub pull requests merged since
   2025-01-01 (see scripts/crawl-github.mjs, phase "authors"). GitHub shows a
   free-text location for each of them, and free text is messy: "Tokyo", "JP",
   "Montreal, CA", "Remote", "Earth", "BitCoin".

   This script resolves what it can and drops the rest with a count of every
   reason, so the number the globe prints is a real count of real accounts and
   nothing else. Rules, in order:
   1. a token in the string matches a city/country entry below -> that country;
      the tables are hand-written from the 101 distinct strings in the crawl,
      longest token first so "New York" wins over "York".
   2. a bot account is excluded - a bot is not a developer.
   3. unresolved strings are counted and named in the note, never guessed at.
     node scripts/build-continent-devs.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync } from "node:fs";

const IN = "data/crawl/leaderboard.jsonl";
const OUT = "public/data/continent-devs.json";

/* country -> continent, and the centroid the globe projects for it */
const COUNTRIES = {
  "United States": { c: "North America", lat: 39.8, lon: -98.6 },
  Canada: { c: "North America", lat: 56.1, lon: -106.3 },
  Mexico: { c: "North America", lat: 23.6, lon: -102.5 },
  "Costa Rica": { c: "North America", lat: 9.7, lon: -83.7 },
  Brazil: { c: "South America", lat: -12, lon: -52 },
  Argentina: { c: "South America", lat: -34.6, lon: -64 },
  Chile: { c: "South America", lat: -35.7, lon: -71.8 },
  Colombia: { c: "South America", lat: 4.6, lon: -74.1 },
  Ecuador: { c: "South America", lat: -1.8, lon: -78.2 },
  "United Kingdom": { c: "Europe", lat: 53.5, lon: -1.5 },
  Germany: { c: "Europe", lat: 51.1, lon: 10.4 },
  France: { c: "Europe", lat: 46.6, lon: 2.2 },
  Netherlands: { c: "Europe", lat: 52.1, lon: 5.3 },
  Portugal: { c: "Europe", lat: 39.6, lon: -8 },
  Spain: { c: "Europe", lat: 40.2, lon: -3.7 },
  Poland: { c: "Europe", lat: 51.9, lon: 19.1 },
  Russia: { c: "Europe", lat: 55.8, lon: 37.6 },
  Switzerland: { c: "Europe", lat: 46.8, lon: 8.2 },
  Nigeria: { c: "Africa", lat: 9.1, lon: 9.9 },
  Kenya: { c: "Africa", lat: 0, lon: 37.9 },
  Japan: { c: "Asia", lat: 36.2, lon: 138.3 },
  China: { c: "Asia", lat: 35, lon: 105 },
  "South Korea": { c: "Asia", lat: 36.5, lon: 127.9 },
  India: { c: "Asia", lat: 22.9, lon: 79.6 },
  Vietnam: { c: "Asia", lat: 16, lon: 108 },
  Jordan: { c: "Asia", lat: 30.6, lon: 36.2 },
  "United Arab Emirates": { c: "Asia", lat: 24, lon: 54 },
  Philippines: { c: "Asia", lat: 12.9, lon: 122.6 },
  Australia: { c: "Oceania", lat: -25.3, lon: 133.8 },
  "New Zealand": { c: "Oceania", lat: -41, lon: 172 },
};

/* free-text tokens -> country. Hand-checked against the strings in the crawl. */
const TOKENS = [
  ["vietnam", "Vietnam"], ["ho chi minh", "Vietnam"], ["ha noi", "Vietnam"], ["hanoi", "Vietnam"],
  ["united arab emirates", "United Arab Emirates"], ["dubai", "United Arab Emirates"],
  ["london", "United Kingdom"], ["uk,", "United Kingdom"], ["england", "United Kingdom"],
  ["charleston", "United States"], ["montreal", "Canada"], ["quebec", "Canada"], ["toronto", "Canada"],
  ["vancouver", "Canada"], ["bc", "Canada"], ["germany", "Germany"], ["leipzig", "Germany"],
  ["hamburg", "Germany"], ["tubingen", "Germany"], ["tübingen", "Germany"], ["mps", "Germany"],
  ["france", "France"], ["grenoble", "France"], ["montpellier", "France"], ["pazanne", "France"],
  ["san francisco", "United States"], ["sf", "United States"], ["los angeles", "United States"],
  ["seattle", "United States"], ["bellevue", "United States"], ["atlanta", "United States"],
  ["miami", "United States"], ["texas", "United States"], ["austin", "United States"],
  ["tampa", "United States"], ["beaumont", "United States"], ["nyc", "United States"],
  ["new york", "United States"], ["philadelphia", "United States"], ["bellingham", "United States"],
  ["boulder", "United States"], ["colorado", "United States"], ["idaho", "United States"],
  ["hawaii", "United States"], ["lehi", "United States"], ["utah", "United States"],
  ["walnut creek", "United States"], ["ypsilanti", "United States"], ["north carolina", "United States"],
  ["indiana", "United States"], ["pennsylvania", "United States"], ["massachusetts", "United States"],
  ["usa", "United States"], ["us", "United States"],
  ["united states", "United States"], ["il,", "United States"], ["mi,", "United States"],  ["sc", "United States"], ["wa", "United States"], ["ga", "United States"], ["fl", "United States"],
  ["fl,", "United States"], ["tx", "United States"], ["ny", "United States"], ["ca", "United States"],
  ["portugal", "Portugal"], ["cordoba", "Spain"], ["cordoba, spain", "Spain"], ["spain", "Spain"],
  ["colima", "Mexico"], ["zapopan", "Mexico"], ["mexico", "Mexico"],
  ["argentina", "Argentina"], ["brazil", "Brazil"], ["goiania", "Brazil"], ["ceara", "Brazil"],
  ["santiago", "Chile"], ["chile", "Chile"], ["bogota", "Colombia"], ["colombia", "Colombia"],
  ["guayaquil", "Ecuador"], ["ecuador", "Ecuador"], ["netherlands", "Netherlands"],
  ["the hague", "Netherlands"], ["hague", "Netherlands"], ["amsterdam", "Netherlands"],
  ["poland", "Poland"], ["voronezh", "Russia"], ["russia", "Russia"],
  ["nigeria", "Nigeria"], ["lagos", "Nigeria"], ["kenya", "Kenya"], ["nairobi", "Kenya"],
  ["chicago", "United States"], ["goiania", "Brazil"], ["ceara", "Brazil"],
  /* "Head-Smashed-In Buffalo Jump" is a real place - a UNESCO site in Alberta,
     so the account that lists it as its home town is Canadian */
  ["buffalo jump", "Canada"],
  ["tokyo", "Japan"], ["japan", "Japan"], ["sapporo", "Japan"], ["jp", "Japan"],
  ["shanghai", "China"], ["china", "China"], ["seoul", "South Korea"], ["korea", "South Korea"],
  ["india", "India"], ["bengaluru", "India"], ["new delhi", "India"], ["delhi", "India"],
  ["mumbai", "India"], ["hyderabad", "India"], ["amman", "Jordan"], ["jordan", "Jordan"],
  ["australia", "Australia"], ["melbourne", "Australia"], ["adelaide", "Australia"],
  ["brisbane", "Australia"], ["queensland", "Australia"], ["perth", "Australia"],
  ["new zealand", "New Zealand"], ["wellington", "New Zealand"], ["manila", "Philippines"],
  ["philippines", "Philippines"], ["中国", "China"],
];
const TOKEN_MAP = Object.fromEntries(TOKENS);
const TOKEN_KEYS = Object.keys(TOKEN_MAP).sort((a, b) => b.length - a.length);
/* a two- or three-letter token ("us", "sf", "jp", "ca") must stand as its own
   word, otherwise "Russia" would answer for "us" and every fourth string would
   land in the wrong country */
const SHORT = TOKEN_KEYS.filter((k) => k.length <= 3 && /^[\x00-\x7f]+$/.test(k));
const LONG = TOKEN_KEYS.filter((k) => !(k.length <= 3 && /^[\x00-\x7f]+$/.test(k)));

const CONTINENTS = ["Africa", "Asia", "Europe", "North America", "South America", "Oceania"];

/* mirrors isBot() in src/lib/leaderboard.ts - keep the two in step */
const isBot = (login, avatar = "") =>
  /\[bot\]$/i.test(login) || /avatars\.githubusercontent\.com\/in\/\d+/.test(avatar) || /bot$/i.test(login);

const rows = readFileSync(IN, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));

const resolve = (loc) => {
  /* "Goiânia" must answer for the "goiania" token, so accents fold first */
  const s = String(loc || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!s.trim()) return null;
  for (const k of LONG) if (s.includes(k)) return TOKEN_MAP[k];
  for (const k of SHORT) {
    const re = new RegExp(`(^|[^a-z0-9])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`);
    if (re.test(s)) return TOKEN_MAP[k];
  }
  return null;
};

const humans = rows.filter((r) => !isBot(r.login, r.avatar));
const byCountry = {};
const unresolved = [];
for (const r of humans) {
  if (!r.location) continue;
  const c = resolve(r.location);
  if (!c) { unresolved.push(r.location); continue; }
  (byCountry[c] ??= []).push(r.login);
}

const conts = {};
for (const [country, logins] of Object.entries(byCountry)) {
  const cont = COUNTRIES[country].c;
  const slot = (conts[cont] ??= { devs: 0, countries: [] });
  slot.devs += logins.length;
  slot.countries.push({ country, devs: logins.length, lat: COUNTRIES[country].lat, lon: COUNTRIES[country].lon });
}
const continents = Object.entries(conts)
  .filter(([name]) => CONTINENTS.includes(name))
  .map(([name, v]) => {
    const sorted = v.countries.sort((a, b) => b.devs - a.devs || a.country.localeCompare(b.country));
    return { name, devs: v.devs, top: sorted[0], countries: sorted };
  })
  .sort((a, b) => b.devs - a.devs);

const located = Object.values(byCountry).reduce((n, a) => n + a.length, 0);

const out = {
  generated: new Date().toISOString().slice(0, 10),
  source: "data/crawl/leaderboard.jsonl - GitHub accounts of people who merged pull requests in the tracked languages, crawled 2026-10-21",
  note: `The globe's hover numbers count developers, not organizations: ${humans.length} human contributors are on the board, ${humans.filter((r) => r.location).length} of them wrote something in GitHub's location field, and ${located} of those strings resolve to a country with the hand-checked table in this script. ${unresolved.length} strings ("Remote", "Earth", "Worldwide", a bare city we did not map) are dropped rather than guessed, so every continent figure is a floor - the true number is at least that. Counts are the people we track, not everyone in that country.`,
  tracked: humans.length,
  withLocation: humans.filter((r) => r.location).length,
  located,
  dropped: unresolved.length,
  droppedExamples: [...new Set(unresolved)].slice(0, 8),
  continents,
};
writeFileSync(OUT, `${JSON.stringify(out, null, 1)}\n`);
console.log(`${OUT}: ${located} developers in ${Object.keys(byCountry).length} countries across ${continents.length} continents`);
console.log(continents.map((c) => `  ${c.name.padEnd(15)} ${String(c.devs).padStart(3)}  top ${c.top.country} ${c.top.devs}`).join("\n"));
console.log(`  dropped ${unresolved.length}: ${out.droppedExamples.join(", ")}`);
