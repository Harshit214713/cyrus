/* ══ scripts/fetch-globe-locations.mjs — where the tracked organizations are ══
   node scripts/fetch-globe-locations.mjs [--offline]

   Reads, on the date written into the output:

     gh api users/<login>   for every organization login in the ORGS array of
                            src/data/orgs.ts (read through `npx tsx`, which
                            imports the module - no file under src/ is opened
                            for writing by this script), plus every owner login
                            in the `orgs` map of
                            public/data/program-projects/nsoc.json.

   GitHub puts a free-text `location` on an account profile. It is whatever the
   owner typed: "Bengaluru, India", "SF", "127.0.0.1", "🌍", or blank. This
   script keeps the raw string in scripts/.cache/globe-locations-cache.json so a
   re-run costs no requests, and maps it to a COUNTRY using only tables written
   into this file: an alias list of country names/ISO codes, a list of cities
   whose country is not in dispute, and a US-state abbreviation set. Anything
   that does not hit one of those tables is counted and dropped - an account
   that says "Remote" is not located anywhere, and guessing from a timezone or
   a blog domain would be inventing a row.

   Positions are approximate country centroids from the fixed table below, not
   the organization's street address: the point of the dataset is reach.

   Output: public/data/globe-locations.json
     { generated, source, note, accounts, withLocation, countries: [{country, orgs, lat, lon}] }
   sorted by orgs descending.                                              ═ */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import {
  ROOT, DATA, OUT_DIR, CACHE_DIR, READ_AT, OFFLINE, clean, readJson, writeJson, ghApi, mapLimit,
} from "./lib/shard.mjs";

const run = promisify(execFile);
const OUT = join(DATA, "globe-locations.json");
const CACHE = join(CACHE_DIR, "globe-locations-cache.json");

/* country code -> [display name, lat, lon]: approximate centroids, chosen so a
   dot lands inside the country on a globe, not so it points at a capital */
const COUNTRIES = {
  IN: ["India", 22.9, 79.6], US: ["United States", 39.5, -98.35], GB: ["United Kingdom", 53.5, -1.5],
  DE: ["Germany", 51.1, 10.4], FR: ["France", 46.6, 2.2], CA: ["Canada", 56.1, -106.3],
  AU: ["Australia", -25.3, 133.8], NL: ["Netherlands", 52.1, 5.3], CH: ["Switzerland", 46.8, 8.2],
  SE: ["Sweden", 62.0, 15.0], NO: ["Norway", 63.0, 9.0], DK: ["Denmark", 56.0, 9.2],
  FI: ["Finland", 64.0, 26.0], IS: ["Iceland", 64.9, -18.6], IE: ["Ireland", 53.4, -8.0],
  ES: ["Spain", 40.2, -3.7], PT: ["Portugal", 39.6, -8.0], IT: ["Italy", 42.8, 12.8],
  BE: ["Belgium", 50.6, 4.4], AT: ["Austria", 47.5, 14.1], PL: ["Poland", 51.9, 19.1],
  CZ: ["Czechia", 49.8, 15.5], HU: ["Hungary", 47.2, 19.5], RO: ["Romania", 45.8, 25.0],
  GR: ["Greece", 39.0, 22.0], HR: ["Croatia", 45.6, 15.5], SI: ["Slovenia", 46.1, 15.0],
  EE: ["Estonia", 58.7, 25.0], LV: ["Latvia", 56.9, 24.9], LT: ["Lithuania", 55.3, 24.0],
  UA: ["Ukraine", 48.7, 31.3], RU: ["Russia", 60.0, 90.0], TR: ["Turkey", 39.0, 35.2],
  IL: ["Israel", 31.3, 35.0], AE: ["United Arab Emirates", 24.0, 54.0], SA: ["Saudi Arabia", 24.0, 45.0],
  QA: ["Qatar", 25.3, 51.2], SG: ["Singapore", 1.35, 103.8], MY: ["Malaysia", 4.0, 102.0],
  ID: ["Indonesia", -2.5, 118.0], PH: ["Philippines", 12.0, 122.0], VN: ["Vietnam", 14.0, 108.0],
  TH: ["Thailand", 15.5, 101.0], TW: ["Taiwan", 23.7, 121.0], JP: ["Japan", 36.2, 138.3],
  KR: ["South Korea", 36.5, 127.9], CN: ["China", 35.0, 105.0], HK: ["Hong Kong", 22.3, 114.2],
  BD: ["Bangladesh", 23.7, 90.4], NP: ["Nepal", 28.4, 84.0], LK: ["Sri Lanka", 7.9, 80.7],
  PK: ["Pakistan", 30.4, 69.3], AF: ["Afghanistan", 33.9, 67.7], MN: ["Mongolia", 46.9, 103.8],
  ZA: ["South Africa", -29.0, 25.0], KE: ["Kenya", 0.0, 37.9], NG: ["Nigeria", 9.1, 8.7],
  GH: ["Ghana", 7.9, -1.0], UG: ["Uganda", 1.4, 32.3], TZ: ["Tanzania", -6.4, 34.9],
  EG: ["Egypt", 26.8, 30.8], MA: ["Morocco", 31.8, -6.0], DZ: ["Algeria", 28.0, 2.6],
  ET: ["Ethiopia", 9.1, 40.5], ZW: ["Zimbabwe", -19.0, 29.9], ZM: ["Zambia", -13.5, 27.8],
  BR: ["Brazil", -12.0, -52.0], AR: ["Argentina", -35.0, -64.0], MX: ["Mexico", 23.9, -102.5],
  CO: ["Colombia", 3.9, -73.0], CL: ["Chile", -35.7, -71.0], PE: ["Peru", -9.2, -75.0],
  UY: ["Uruguay", -32.8, -56.0], EC: ["Ecuador", -1.4, -78.5], VE: ["Venezuela", 7.1, -66.0],
  CR: ["Costa Rica", 9.9, -84.1], PA: ["Panama", 8.5, -80.0], CU: ["Cuba", 21.7, -79.4],
  NZ: ["New Zealand", -41.0, 174.0], FJ: ["Fiji", -17.7, 178.0], RS: ["Serbia", 44.0, 21.0],
  BG: ["Bulgaria", 42.8, 25.5], SK: ["Slovakia", 48.7, 19.7], MD: ["Moldova", 47.2, 28.5],
  GE: ["Georgia", 42.3, 43.4], AM: ["Armenia", 40.2, 45.0], AZ: ["Azerbaijan", 40.2, 47.6],
  KZ: ["Kazakhstan", 48.0, 67.0], UZ: ["Uzbekistan", 41.4, 64.6], JO: ["Jordan", 31.2, 36.5],
  LB: ["Lebanon", 33.9, 35.8], KW: ["Kuwait", 29.4, 47.8], OM: ["Oman", 21.5, 56.0],
};

/* words owners actually type for a country, normalized to lower case */
const ALIASES = {
  india: "IN", "india.": "IN", bharat: "IN", "republic of india": "IN",
  usa: "US", "u.s.": "US", "u.s.a.": "US", "united states": "US", "united states of america": "US",
  america: "US", "us": "US", "united states of america": "US",
  uk: "GB", "u.k.": "GB", "united kingdom": "GB", britain: "GB", "great britain": "GB", england: "GB",
  scotland: "GB", wales: "GB", london: "GB",
  germany: "DE", deutschland: "DE", france: "FR", france_: "FR", canada: "CA", australia: "AU",
  "new south wales": "AU", netherlands: "NL", holland: "NL", "new zealand": "NZ", sweden: "SE",
  norway: "NO", denmark: "DK", finland: "FI", iceland: "IS", ireland: "IE", spain: "ES",
  portugal: "PT", italy: "IT", belgium: "BE", austria: "AT", switzerland: "CH",
  poland: "PL", czechia: "CZ", "czech republic": "CZ", hungary: "HU", romania: "RO",
  greece: "GR", croatia: "HR", slovenia: "SI", estonia: "EE", latvia: "LV", lithuania: "LT",
  ukraine: "UA", russia: "RU", "russian federation": "RU", turkey: "TR", Türkiye: "TR",
  israel: "IL", singapore: "SG", malaysia: "MY", indonesia: "ID", philippines: "PH",
  vietnam: "VN", thailand: "TH", taiwan: "TW", japan: "JP", "south korea": "KR", korea: "KR",
  china: "CN", prc: "CN", hongkong: "HK", "hong kong": "HK", bangladesh: "BD", nepal: "NP",
  "sri lanka": "LK", pakistan: "PK", mongolia: "MN", "south africa": "ZA", kenya: "KE",
  nigeria: "NG", ghana: "GH", uganda: "UG", tanzania: "TZ", "united arab emirates": "AE", uae: "AE",
  saudi: "SA", qatar: "QA", egypt: "EG", morocco: "MA", algeria: "DZ", ethiopia: "ET",
  brazil: "BR", "south america": null, argentina: "AR", mexico: "MX", colombia: "CO",
  chile: "CL", peru: "PE", uruguay: "UY", ecuador: "EC", venezuela: "VE", "costa rica": "CR",
  panama: "PA", cuba: "CU", serbia: "RS", bulgaria: "BG", slovakia: "SK", moldova: "MD",
  georgia: "GE", armenia: "AM", azerbaijan: "AZ", kazakhstan: "KZ", uzbekistan: "UZ",
  jordan: "JO", lebanon: "LB", kuwait: "KW", oman: "OM", fiji: "FJ",
};

/* cities we only accept as a location when they are unambiguous */
const CITY = {
  bengaluru: "IN", bangalore: "IN", mumbai: "IN", pune: "IN", hyderabad: "IN", chennai: "IN",
  delhi: "IN", "new delhi": "IN", kolkata: "IN", gurugram: "IN", gurgaon: "IN", "noida": "IN",
  coimbatore: "IN", kochi: "IN", ahmedabad: "IN", jaipur: "IN",lucknow: "IN", patna: "IN",
  sanfrancisco: "US", sf: "US", "sfo": "US", nyc: "US", ny: "US", chicago: "US", boston: "US",
  seattle: "US", "new york": "US", "los angeles": "US", "mountain view": "US", "sunnyvale": "US",
  "san jose": "US", austin: "US", denver: "US", portland: "US", "salt lake city": "US",
 atlanta: "US", "washington": "US", "washington dc": "US", philadelphia: "US", minneapolis: "US",
  berlin: "DE", munich: "DE", hamburg: "DE", frankfurt: "DE", "cologne": "DE", "köln": "DE",
  paris: "FR", lyon: "FR", toulouse: "FR", amsterdam: "NL", rotterdam: "NL", brussels: "BE",
  vienna: "AT", zurich: "CH", geneva: "CH", rome: "IT", milan: "IT", madrid: "ES",
  barcelona: "ES", lisbon: "PT", stockholm: "SE", oslo: "NO", copenhagen: "DK",
  helsinki: "FI", dublin: "IE", tokyo: "JP", kyoto: "JP", seoul: "KR", beijing: "CN",
  shanghai: "CN", shenzhen: "CN", hangzhou: "CN", taipei: "TW", "hong kong": "HK",
  singapore: "SG", kuala: "MY", jakarta: "ID", manila: "PH", hanoi: "VN", "ho chi min": "VN",
  bangkok: "TH", dhaka: "BD", kathmandu: "NP", karachi: "PK", lahore: "PK", islamabad: "PK",
  moscow: "RU", "saint petersburg": "RU", kyiv: "UA", "kiev": "UA", ankara: "TR",
  istanbul: "TR", "tel aviv": "IL", jerusalem: "IL", dubai: "AE", cairo: "EG",
  capetown: "ZA", "cape town": "ZA", johannesburg: "ZA", nairobi: "KE", lagos: "NG",
  "são paulo": "BR", "sao paulo": "BR", riodejaneiro: "BR", "rio de janeiro": "BR",
  " buenos aires": "AR", buenosaires: "AR", mexicocity: "MX", bogota: "CO", santiago: "CL",
  lima: "PE", montevideo: "UY", toronto: "CA", vancouver: "CA", montreal: "CA", ottawa: "CA",
  sydney: "AU", melbourne: "AU", brisbane: "AU", auckland: "NZ", warsaw: "PL", krakow: "PL",
  prag: "CZ", "prague": "CZ", budapest: "HU", belgrade: "RS", sofia: "BG", bratislava: "SK",
  zagreb: "HR", ljubljana: "SI", tallinn: "EE", riga: "LV", vilnius: "LT", reykjavik: "IS",
  almaty: "KZ", tas: "UZ", taskent: "UZ",
};

/* two-letter tokens that are US states, so "Denver, CO" is the United States
   and not Colombia */
const US_STATE = new Set(("AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS "
  + "MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC").split(" "));

/* the same states spelled out, because "Amherst, Massachusetts" is a location */
const US_STATE_NAMES = new Set(("alabama alaska arizona arkansas california colorado connecticut "
  + "delaware florida georgia hawaii idaho illinois indiana iowa kansas kentucky louisiana maine "
  + "maryland massachusetts michigan minnesota mississippi missouri montana nebraska nevada "
  + "newhampshire newjersey newmexico newyork northcarolina ohio oklahoma oregon pennsylvania "
  + "rhodeisland southcarolina tennessee texas utah vermont virginia washington westvirginia "
  + "wisconsin wyoming washingtondc").split(" "));

/** every city in CITY that resolves to the United States, used to read "City, ST" */
const US_CITY = new Set(Object.entries(CITY).filter(([, c]) => c === "US").map(([w]) => w));

/** free-text profile location -> ISO country code, or null when it says nothing */
export function countryOf(raw) {
  const s = clean(String(raw ?? ""))
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, " ")   /* flags and emoji */
    .replace(/\s+/g, " ").trim().toLowerCase();
  if (!s) return null;
  if (/^(remote|anywhere|worldwide|global|the internet|cyberspace|earth|planet|n\/a|na|none|-\s*)$/.test(s)) return null;
  if (/\d+\.\d+\.\d+\.\d+/.test(s)) return null;
  const parts = s.split(/[,;/|]/).map((p) => clean(p)).filter(Boolean);
  /* "<somewhere>, <two-letter US state>" is the American mailing format: only
     read it as the United States when the first part is a city we know there,
     because "CA", "CO", "GA" and "IN" are also country codes we do use */
  const tail = parts[parts.length - 1] ?? "";
  if (parts.length >= 2 && /^[a-z]{2}$/.test(tail) && US_STATE.has(tail.toUpperCase())) {
    const head = parts[0].replace(/[.]+$/, "");
    if (US_CITY.has(head) || US_CITY.has(head.replace(/\s+/g, ""))) return "US";
  }
  const all = [s, ...parts];
  /* country last is the convention ("Bengaluru, India"), so scan from the end */
  for (const p of [...all].reverse()) {
    const t = p.replace(/[.]+$/, "");
    if (COUNTRIES[t.toUpperCase()] && t.length === 2) return t.toUpperCase();
    if (ALIASES[t] !== undefined) return ALIASES[t];
    if (CITY[t]) return CITY[t];
    if (US_STATE_NAMES.has(t) || US_STATE_NAMES.has(t.replace(/\s+/g, ""))) return "US";
    if (t.length === 2 && US_STATE.has(t.toUpperCase()) && !COUNTRIES[t.toUpperCase()]) return "US";
  }
  /* a longer string that merely names a country or an unambiguous city somewhere */
  for (const p of [...all].reverse()) {
    for (const [w, code] of Object.entries(ALIASES)) if (w.length > 3 && code && new RegExp(`(^| )${w}( |$)`).test(p)) return code;
    for (const [w, code] of Object.entries(CITY)) if (w.length > 4 && new RegExp(`(^| )${w}( |$)`).test(p)) return code;
  }
  return null;
}

/** the logins to ask GitHub about: ORGS from src/data/orgs.ts plus nsoc's owners */
async function readLogins() {
  const code = "import('./src/data/orgs.ts').then(m=>process.stdout.write(JSON.stringify((m.ORGS||[]).map(o=>o.login).filter(Boolean))))";
  let logins = [];
  try {
    const { stdout } = await run("npx", ["tsx", "-e", code], { cwd: ROOT, maxBuffer: 16 * 1024 * 1024 });
    logins = JSON.parse(stdout.trim());
  } catch (e) {
    console.error(`could not import src/data/orgs.ts through tsx: ${String(e.message).slice(0, 160)}`);
  }
  const nsoc = readJson(join(OUT_DIR, "nsoc.json"), null);
  const extra = [];
  if (nsoc) {
    if (nsoc.orgs && typeof nsoc.orgs === "object") {
      for (const k of Object.keys(nsoc.orgs)) extra.push(k);
    } else {
      for (const r of (nsoc.list || nsoc.projects || [])) {
        const l = r.o ?? r.org ?? r.orgLogin;
        if (typeof l === "string" && /^[\w.-]+$/.test(l)) extra.push(l);
      }
    }
  }
  const seen = new Set();
  const out = [];
  for (const l of [...logins, ...extra]) {
    const k = clean(l).toLowerCase();
    if (!k || !/^[\w.-]+$/.test(k) || seen.has(k)) continue;
    seen.add(k);
    out.push({ login: k, from: logins.includes(l) ? "orgs" : "nsoc" });
  }
  return out;
}

async function main() {
  const cache = readJson(CACHE, { version: 1, users: {} });
  if (cache.version !== 1 || !cache.users) { cache.version = 1; cache.users = {}; }

  const accounts = await readLogins();
  console.log(`${accounts.length} accounts to read (${accounts.filter((a) => a.from === "nsoc").length} from nsoc.json)`);

  let fetched = 0;
  const users = await mapLimit(accounts, 5, async (a) => {
    if (Object.prototype.hasOwnProperty.call(cache.users, a.login)) return { ...a, rec: cache.users[a.login] };
    if (OFFLINE) return { ...a, rec: null };
    let rec = null;
    try {
      const r = await ghApi(`users/${a.login}`);
      rec = { location: clean(r.location), name: clean(r.name || r.login), type: r.type || "" };
      fetched += 1;
    } catch { rec = { missing: true }; fetched += 1; }
    cache.users[a.login] = rec;
    await new Promise((r) => setTimeout(r, 50));
    return { ...a, rec };
  });
  writeJson(CACHE, cache);

  const byCountry = new Map();
  let withLocation = 0, blank = 0, unmapped = 0, missing = 0;
  const unmappedList = [];
  for (const u of users) {
    const rec = u.rec || {};
    if (rec.missing) { missing += 1; continue; }
    if (!rec.location) { blank += 1; continue; }
    const code = countryOf(rec.location);
    if (!code) { unmapped += 1; if (unmappedList.length < 12) unmappedList.push(`${u.login}: "${rec.location}"`); continue; }
    withLocation += 1;
    const cur = byCountry.get(code) || { code, orgs: 0, sample: [] };
    cur.orgs += 1;
    if (cur.sample.length < 3) cur.sample.push(u.login);
    byCountry.set(code, cur);
  }

  const countries = [...byCountry.values()]
    .sort((a, b) => b.orgs - a.orgs || COUNTRIES[a.code][0].localeCompare(COUNTRIES[b.code][0]))
    .map((c) => ({
      country: COUNTRIES[c.code][0], code: c.code, orgs: c.orgs,
      lat: COUNTRIES[c.code][1], lon: COUNTRIES[c.code][2], sample: c.sample,
    }));

  writeJson(OUT, {
    generated: READ_AT,
    source: "gh api users/<login> - the free-text `location` each account publishes on GitHub, for every login in src/data/orgs.ts ORGS plus the owner logins in public/data/program-projects/nsoc.json",
    note: `${withLocation} of ${users.length} tracked accounts published a location that maps to a country; ${blank} left the field ` +
      `empty, ${unmapped} wrote something we could not resolve to a country (${unmappedList.slice(0, 4).map((s) => s.replace(/^[\w.-]+: /, "")).join("; ")}) and are dropped rather than ` +
      `guessed, ${missing} account(s) no longer resolve at all. The mapping is tables inside scripts/fetch-globe-locations.mjs - ` +
      `country names and ISO codes owners typed, cities whose country is not in dispute, US state abbreviations - applied to GitHub's ` +
      `raw string, which is kept verbatim in the script's cache. Positions are approximate country centroids from that same table, not ` +
      `street addresses: the globe shows which countries the tracked ecosystem reaches, not where a specific office is. "Remote", ` +
      `"Worldwide" and emoji are not locations and are not counted as one.`,
    accounts: users.length,
    withLocation,
    countries,
  });

  console.log(`${withLocation} accounts with a country across ${countries.length} countries; ${fetched} GitHub reads this run`);
  console.log(countries.slice(0, 12).map((c) => `${c.country} ${c.orgs}`).join(" | "));
  if (unmappedList.length) console.log(`dropped as unresolvable (sample): ${unmappedList.join(", ")}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
