/* ══ scripts/build-user-globe.mjs — country data for the sign-in globe ═════
   node scripts/build-user-globe.mjs

   For every organization that src/data/orgs.ts's ORGS array contains (REAL_ORGS
   filtered by programsOf, re-derived here from the same three TS data files so
   the set matches what the site actually renders), this reads the organization's
   REAL GitHub profile via `gh api orgs/{login}` and takes its free-text
   `location` string (with a country-code-TLD on `blog` as a weak fallback hint).
   Locations are normalized to a country; remote/empty/nonsense is dropped, never
   guessed. Each country is plotted at an approximate centroid from the table
   below - not the organization's street - and the note says so. Coverage (how
   many of the orgs have a usable location) is stated honestly in the note.

   gh api results are cached in scripts/.cache/user-globe-cache.json so re-runs
   cost no requests for orgs already read.                                    ═ */
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/data/user-globe.json");
const CACHE_FILE = join(ROOT, "scripts/.cache/user-globe-cache.json");
const GENERATED = new Date().toISOString().slice(0, 10);

/* ---------- the ORGS set, re-derived from the site's own TS data ---------- */
function orgsLogins() {
  const real = readFileSync(join(ROOT, "src/data/realOrgs.ts"), "utf8");
  const sec = (name) => {
    const i = real.indexOf("export const " + name);
    if (i < 0) throw new Error(`realOrgs.ts: ${name} not found`);
    const j = real.indexOf("export const", i + 10);
    return real.slice(i, j < 0 ? undefined : j);
  };
  const logins = [...sec("REAL_ORGS").matchAll(/^\s*\{ login: "([^"]+)"/gm)].map((m) => m[1]);
  const archived = new Set([...sec("ORG_PROGRAMS").matchAll(/^\s*"([^"]+)":\s*\[/gm)].map((m) => m[1].toLowerCase()));
  /* the same two topic sources programsOf uses: PROGRAM_REPOS programs + REPOS tags */
  const topic = new Set();
  const jsonLines = (file, re) => [...readFileSync(join(ROOT, "src/data", file), "utf8").matchAll(re)]
    .map((l) => { try { return JSON.parse(l[0].replace(/,\s*$/, "")); } catch { return null; } })
    .filter(Boolean);
  for (const r of jsonLines("programRepos.ts", /^\{.*\}$/gm)) {
    const owner = r.repo.split("/")[0].toLowerCase();
    for (const p of r.programs || []) if (["GSoC", "LFX", "Outreachy", "GSSoc", "Hacktoberfest"].includes(p)) topic.add(owner);
  }
  for (const r of jsonLines("repos.ts", /^\{.*\}$/gm)) {
    const owner = r.repo.split("/")[0].toLowerCase();
    for (const t of r.tags || []) {
      const tl = t.toLowerCase();
      if (["hacktoberfest", "gsoc", "lfx", "lf-mentoring", "outreachy", "gssoc"].includes(tl)) topic.add(owner);
    }
  }
  return logins.filter((l) => archived.has(l.toLowerCase()) || topic.has(l.toLowerCase()));
}

/* ---------- GitHub read, cached ---------- */
const cache = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, "utf8")) : {};
function saveCache() {
  mkdirSync(dirname(CACHE_FILE), { recursive: true });
  writeFileSync(CACHE_FILE + ".tmp", JSON.stringify(cache));
  renameSync(CACHE_FILE + ".tmp", CACHE_FILE);
}
async function ghOrg(login) {
  if (cache[login] !== undefined) return cache[login];
  let rec = null;
  try {
    const { stdout } = await run("gh", ["api", `orgs/${login}`], { maxBuffer: 8 * 1024 * 1024 });
    const j = JSON.parse(stdout);
    rec = { name: j.name || login, location: j.location || "", blog: j.blog || "" };
  } catch { rec = { name: login, location: "", blog: "", missing: true }; }
  cache[login] = rec;
  return rec;
}

/* ---------- country table: ISO code -> display name + approximate centroid ---------- */
const COUNTRIES = {
  IN: ["India", 22.0, 79.0], US: ["United States", 39.8, -98.6], GB: ["United Kingdom", 54.0, -2.0],
  DE: ["Germany", 51.2, 10.4], FR: ["France", 46.6, 2.2], CA: ["Canada", 56.0, -106.0],
  AU: ["Australia", -25.0, 134.0], CN: ["China", 35.0, 105.0], JP: ["Japan", 36.0, 138.0],
  BR: ["Brazil", -10.0, -55.0], NL: ["Netherlands", 52.1, 5.3], ES: ["Spain", 40.0, -4.0],
  IT: ["Italy", 42.0, 12.5], PL: ["Poland", 52.0, 19.5], CH: ["Switzerland", 46.8, 8.2],
  SE: ["Sweden", 62.0, 15.0], NO: ["Norway", 62.0, 9.0], DK: ["Denmark", 56.0, 9.5],
  FI: ["Finland", 64.0, 26.0], IE: ["Ireland", 53.0, -8.0], BE: ["Belgium", 50.6, 4.7],
  AT: ["Austria", 47.3, 13.3], PT: ["Portugal", 39.6, -8.0], CZ: ["Czechia", 49.8, 15.5],
  IL: ["Israel", 31.4, 35.0], SG: ["Singapore", 1.35, 103.8], KR: ["South Korea", 36.0, 127.8],
  TW: ["Taiwan", 23.7, 121.0], VN: ["Vietnam", 16.0, 108.0], TH: ["Thailand", 15.0, 101.0],
  ID: ["Indonesia", -2.0, 118.0], MY: ["Malaysia", 4.0, 102.0], PH: ["Philippines", 13.0, 122.0],
  NZ: ["New Zealand", -41.0, 174.0], ZA: ["South Africa", -30.0, 25.0], NG: ["Nigeria", 9.1, 8.7],
  KE: ["Kenya", 0.0, 37.9], EG: ["Egypt", 26.8, 30.8], MA: ["Morocco", 32.0, -6.0],
  MX: ["Mexico", 23.6, -102.5], AR: ["Argentina", -34.0, -64.0], CL: ["Chile", -35.0, -71.0],
  CO: ["Colombia", 4.6, -74.1], PE: ["Peru", -9.2, -75.0], CR: ["Costa Rica", 9.9, -84.1],
  TR: ["Turkey", 39.0, 35.2], AE: ["United Arab Emirates", 24.0, 54.3], SA: ["Saudi Arabia", 24.0, 45.0],
  PK: ["Pakistan", 30.4, 69.3], BD: ["Bangladesh", 23.7, 90.4], LK: ["Sri Lanka", 7.9, 80.7],
  NP: ["Nepal", 28.4, 84.1], UA: ["Ukraine", 49.0, 32.0], RU: ["Russia", 60.0, 90.0],
  HU: ["Hungary", 47.0, 19.5], RO: ["Romania", 46.0, 25.0], GR: ["Greece", 39.0, 22.0],
  HR: ["Croatia", 45.1, 15.5], RS: ["Serbia", 44.0, 21.0], BG: ["Bulgaria", 42.7, 25.5],
  EE: ["Estonia", 58.9, 25.0], LV: ["Latvia", 57.0, 25.0], LT: ["Lithuania", 56.0, 24.0],
  IS: ["Iceland", 65.0, -18.0], CM: ["Cameroon", 3.9, 11.5], GH: ["Ghana", 7.9, -1.0],
  SN: ["Senegal", 14.5, -14.5], ET: ["Ethiopia", 9.1, 40.5],
};

/* US states: full names always -> US; two-letter abbreviations map to US only
   when they don't collide with a country code we carry (CA, IN, GA excluded). */
const US_STATES_FULL = ["alabama","alaska","arizona","arkansas","california","colorado","connecticut","delaware","florida","georgia","hawaii","idaho","illinois","indiana","iowa","kansas","kentucky","louisiana","maine","maryland","massachusetts","michigan","minnesota","mississippi","missouri","montana","nebraska","nevada","new hampshire","new jersey","new mexico","new york","north carolina","north dakota","ohio","oklahoma","oregon","pennsylvania","rhode island","south carolina","south dakota","tennessee","texas","utah","vermont","virginia","washington","west virginia","wisconsin","wyoming"];
const US_STATE_ABBR = new Set(["AL","AK","AZ","AR","CO","CT","DE","FL","HI","ID","IL","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"]);

/* country-name aliases (whole lowercase phrases matched anywhere in the string) */
const NAME_ALIAS = {
  india: "IN", "भारत": "IN", bharat: "IN",
  "united states": "US", usa: "US", "u.s.": "US", "u.s.a.": "US", us: "US", america: "US",
  "united kingdom": "GB", uk: "GB", england: "GB", scotland: "GB", wales: "GB", "great britain": "GB",
  germany: "DE", deutschland: "DE", france: "FR", canada: "CA", australia: "AU", china: "CN",
  japan: "JP", brazil: "BR", brasil: "BR", netherlands: "NL", holland: "NL", nl: "NL",
  spain: "ES", espana: "ES", italy: "IT", italia: "IT", poland: "PL", polska: "PL",
  switzerland: "CH", sweden: "SE", norway: "NO", denmark: "DK", finland: "FI", ireland: "IE",
  belgium: "BE", austria: "AT", portugal: "PT", "czech republic": "CZ", czechia: "CZ", "czech": "CZ",
  israel: "IL", singapore: "SG", "south korea": "KR", korea: "KR", taiwan: "TW", vietnam: "VN",
  thailand: "TH", indonesia: "ID", malaysia: "MY", philippines: "PH", "new zealand": "NZ",
  "south africa": "ZA", nigeria: "NG", kenya: "KE", egypt: "EG", morocco: "MA", mexico: "MX",
  argentina: "AR", chile: "CL", colombia: "CO", peru: "PE", "costa rica": "CR", turkey: "TR",
  "united arab emirates": "AE", "uae": "AE", "saudi arabia": "SA", pakistan: "PK",
  bangladesh: "BD", "sri lanka": "LK", nepal: "NP", ukraine: "UA", russia: "RU",
  hungary: "HU", romania: "RO", greece: "GR", croatia: "HR", serbia: "RS", bulgaria: "BG",
  estonia: "EE", latvia: "LV", lithuania: "LT", iceland: "IS",
};

/* city / region -> country. Matched only as a standalone comma segment. */
const CITY = {
  hyderabad: "IN", bengaluru: "IN", bangalore: "IN", mumbai: "IN", delhi: "IN", "new delhi": "IN",
  pune: "IN", kolkata: "IN", chennai: "IN", ahmedabad: "IN", kochi: "IN", cochin: "IN",
  thiruvananthapuram: "IN", trivandrum: "IN", noida: "IN", gurgaon: "IN", gurugram: "IN",
  indore: "IN", jaipur: "IN", bhubaneswar: "IN", visakhapatnam: "IN", manipal: "IN", goa: "IN",
  "san francisco": "US", sf: "US", sfba: "US", oakland: "US", "mountain view": "US",
  "san jose": "US", sunnyvale: "US", "santa clara": "US", palo: null, "palo alto": "US",
  "redwood city": "US", "menlo park": "US", seattle: "US", bellevue: "US", portland: "US",
  la: "US", "los angeles": "US", "san diego": "US", sacramento: "US", denver: "US",
  "new york": "US", nyc: "US", ny: "US", boston: "US", chicago: "US", austin: "US",
  dallas: "US", houston: "US", atlanta: "US", washington: null, "dc": "US", "washington, dc": "US",
  "washington dc": "US", philadelphia: "US", "salt lake city": "US", "salt lake": "US",
  minneapolis: "US", detroit: "US", miami: "US", orlando: "US", "north carolina": "US",
  "research triangle park": "US", "silicon valley": "US", "california": "US",
  london: "GB", manchester: "GB", edinburgh: "GB", cambridge: "GB", oxford: "GB", bristol: "GB",
  leeds: "GB", birmingham: "GB", "united kingdom": null,
  berlin: "DE", munich: "DE", munchen: "DE", hamburg: "DE", frankfurt: "DE", cologne: "DE",
  koblenz: "DE", heidelberg: "DE", gottingen: "DE", goettingen: "DE", aachen: "DE",
  stuttgart: "DE", karlsruhe: "DE", dresden: "DE", leipzig: "DE", ulm: "DE", dusseldorf: "DE",
  munster: "DE",
  paris: "FR", lyon: "FR", toulouse: "FR", nice: "FR", bordeaux: "FR", saclay: "FR",
  grenoble: "FR", nantes: "FR", "ile-de-france": "FR", "ile de france": "FR",
  toronto: "CA", vancouver: "CA", montreal: "CA", ottawa: "CA", waterloo: "CA", calgary: "CA",
  "vancouver, bc": "CA", "british columbia": "CA",
  sydney: "AU", melbourne: "AU", brisbane: "AU", perth: "AU", adelaide: "AU", canberra: "AU",
  amsterdam: "NL", rotterdam: "NL", utrecht: "NL", delft: "NL", eindhoven: "NL",
  madrid: "ES", barcelona: "ES", seville: "ES", valencia: "ES", bilbao: "ES",
  rome: "IT", milan: "IT", milano: "IT", turin: "IT", torino: "IT", bologna: "IT",
  warsaw: "PL", poland: null, krakow: "PL", kraków: "PL", wroclaw: "PL", wrocław: "PL", gdansk: "PL",
  zurich: "CH", zürich: "CH", geneva: "CH", genève: "CH", lausanne: "CH", basel: "CH",
  stockholm: "SE", uppsala: "SE", uppsala: "SE", goteborg: "SE", göteborg: "SE", malmo: "SE",
  malmö: "SE", oslo: "NO", copenhagen: "DK", københavn: "DK", aarhus: "DK", aarhus: "DK",
  helsinki: "FI", espoo: "FI", dublin: "IE", cork: "IE", brussels: "BE", bruussels: "BE",
  antwerp: "BE", ghent: "BE", vienna: "AT", wien: "AT", lisbon: "PT", porto: "PT",
  prague: "CZ", Praha: "CZ", "czech republic": null, budapest: "HU", bucharest: "RO",
  athens: "GR", zagreb: "HR", belgrade: "RS", tallinn: "EE", riga: "LV", vilnius: "LT",
  "tel aviv": "IL", jerusalem: "IL", haifa: "IL", singapore: null, seoul: "KR", tokyo: "JP",
  kyoto: "JP", osaka: "JP", beijing: "CN", shanghai: "CN", shenzhen: "CN", hangzhou: "CN",
  guangzhou: "CN", chengdu: "CN", wuhan: "CN", nanjing: "CN", xiamen: "CN", taipei: "TW",
  hanoi: "VN", "ho chi minh": "VN", "ho chi minh city": "VN", danang: "VN", bangkok: "TH",
  jakarta: "ID", bandung: "ID", surabaya: "ID", "kuala lumpur": "MY", manila: "PH",
  auckland: "NZ", wellington: "NZ", "cape town": "ZA", johannesburg: "ZA", durban: "ZA",
  lagos: "NG", abuja: "NG", nairobi: "KE", cairo: "EG", casablanca: "MA", rabat: "MA",
  "mexico city": "MX", monterrey: "MX", guadalajara: "MX", "buenos aires": "AR", cordoba: "AR",
  santiago: "CL", bogota: "CO", "bogotá": "CO", medellin: "CO", lima: "PE", istanbul: "TR",
  ankara: "TR", dubai: "AE", "abu dhabi": "AE", riyadh: "SA", jeddah: "SA", karachi: "PK",
  lahore: "PK", islamabad: "PK", dhaka: "BD", colombo: "LK", kathmandu: "NP", kyiv: "UA",
  kiev: "UA", moscow: "RU", "saint petersburg": "RU", reykjavik: "IS", "reykjavík": "IS",
  sofia: "BG", budapest: null,
};
delete CITY.palo; delete CITY.washington; delete CITY["united kingdom"]; delete CITY.poland;
delete CITY["czech republic"]; delete CITY.singapore; delete CITY.budapest;

/* country-code TLDs usable as a weak hint from the org's blog field */
const CCTLD = { ".de": "DE", ".fr": "FR", ".in": "IN", ".nl": "NL", ".uk": "GB", ".jp": "JP", ".cn": "CN", ".br": "BR", ".ca": "CA", ".au": "AU", ".ch": "CH", ".se": "SE", ".no": "NO", ".fi": "FI", ".es": "ES", ".it": "IT", ".pl": "PL", ".sg": "SG", ".kr": "KR", ".il": "IL", ".mx": "MX", ".za": "ZA", ".nz": "NZ" };

function normalizeCountry(location, blog) {
  const raw = String(location || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const s = raw;
  if (!s) return ccTldHint(blog);
  if (/^(remote|worldwide|everywhere|global|the internet|earth|planet|anywhere|virtual|home|n\/a|na|none|-+|🌍|🌎|🌏)$/.test(s)) return null;
  const parts = s.split(/[,;|/]| and (?=[a-z])/).map((p) => p.trim()).filter(Boolean);
  /* 1. full-country phrase anywhere in the string */
  for (const [name, code] of Object.entries(NAME_ALIAS)) {
    if (name.length > 2 && new RegExp(`(^|[^a-z])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`).test(s)) {
      if (COUNTRIES[code]) return code;
    } else if (parts.includes(name) && COUNTRIES[code]) return code;
  }
  /* 1b. spelled-out US state anywhere in the string */
  for (const st of US_STATES_FULL) {
    if (new RegExp(`(^|[^a-z])${st}([^a-z]|$)`).test(s)) return "US";
  }
  /* 2. right-to-left segment match (city, US-state abbr, or 2-letter code) */
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i].replace(/[^\w -]/g, "").trim();
    if (!p) continue;
    if (CITY[p] && COUNTRIES[CITY[p]]) return CITY[p];
    if (p.length === 2 && /^[a-z]{2}$/.test(p)) {
      const up = p.toUpperCase();
      if (US_STATE_ABBR.has(up) && !COUNTRIES[up]) return "US";
      if (COUNTRIES[up]) return up;
    }
    const first = p.split(/\s+/)[0];
    if (CITY[first] && COUNTRIES[CITY[first]]) return CITY[first];
  }
  /* 3. last resort: a unique known city appearing anywhere in the text */
  const hits = new Set();
  for (const [city, code] of Object.entries(CITY)) {
    if (!code || city.includes(" ") || city.length <= 4) continue;
    if (new RegExp(`(^|[^a-z])${city}([^a-z]|$)`).test(s)) hits.add(code);
  }
  if (hits.size === 1) return [...hits][0];
  return ccTldHint(blog);
}
function ccTldHint(blog) {
  const b = String(blog || "").toLowerCase();
  const m = b.match(/\.(de|fr|in|nl|uk|jp|cn|br|ca|au|ch|se|no|fi|es|it|pl|sg|kr|il|mx|za|nz)(?:\/|$)/);
  if (m && !/\.(com|org|net|io|dev|app|ai)\./.test(b) && COUNTRIES[m[1].toUpperCase()]) return m[1].toUpperCase();
  return null;
}

/* ---------- main ---------- */
const main = async () => {
  const logins = orgsLogins();
  console.log(`ORGS array: ${logins.length} organizations to read`);
  const results = [];
  const CONC = 6;
  for (let i = 0; i < logins.length; i += CONC) {
    const batch = await Promise.all(logins.slice(i, i + CONC).map(async (l) => [l, await ghOrg(l)]));
    results.push(...batch);
    saveCache();
    process.stdout.write(`  ${Math.min(i + CONC, logins.length)}/${logins.length}\r`);
  }
  console.log();

  const byCountry = new Map();
  let usable = 0, missing = 0;
  for (const [login, rec] of results) {
    if (rec?.missing) { missing += 1; continue; }
    const code = normalizeCountry(rec?.location, rec?.blog);
    if (!code) continue;
    usable += 1;
    const e = byCountry.get(code) ?? [];
    e.push(rec.name || login);
    byCountry.set(code, e);
  }

  const countries = [...byCountry.entries()]
    .map(([code, names]) => {
      const [name, lat, lon] = COUNTRIES[code];
      return { name, code, orgs: names.length, lat, lon, sample: names.slice(0, 3) };
    })
    .sort((a, b) => b.orgs - a.orgs || a.name.localeCompare(b.name));

  const out = {
    generated: GENERATED,
    source: "gh api orgs/{login} - the real `location` string on every GitHub organization profile that src/data/orgs.ts ORGS contains (country-code TLD of the org's blog URL as a weak fallback)",
    note: `${usable} of ${logins.length} organizations in the ORGS array published a location we could map to a country (${missing} accounts no longer resolve at all); the rest are blank, remote, or nonsense and are dropped rather than guessed. Positions are approximate country centroids from a fixed table in scripts/build-user-globe.mjs, not the organizations' street addresses - the globe shows reach, not precision. Sample names are the first organization names read from GitHub profiles, not a curated list.`,
    countries,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT + ".tmp", JSON.stringify(out, null, 1));
  renameSync(OUT + ".tmp", OUT);
  console.log(`wrote ${OUT}: ${countries.length} countries, ${usable}/${logins.length} orgs resolved`);
};

main().catch((e) => { console.error(e); process.exit(1); });
