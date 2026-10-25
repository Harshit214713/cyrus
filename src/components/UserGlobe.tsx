"use client"
/* ══ UserGlobe.tsx — the sign-in sheet's left panel: "who builds open source" ═
   A large dotted globe rising in the panel (in the spirit of coddy.tech's
   hero): a halftone point lattice over hand-authored simplified continent
   polygons, a robot standing on the far side of the world with both hands on
   it, and one card that appears where the robot stops.

   The robot is not standing behind the earth, it is turning it. Its body is
   painted under the canvas so the sphere covers its lower half; its arms and
   hands are a second layer painted over the canvas, reaching onto the near
   face of the globe and working in a slow circle. Same character, two layers,
   and the sphere spins underneath them.

   Pointing at a landmass lights up that continent's dots and prints how many
   developers are behind it. That number is not an estimate: it counts the
   GitHub accounts on this site's contributor board whose published location
   resolves to a country in that continent (scripts/build-continent-devs.mjs).
   Anything the crawl could not resolve - "Remote", "Earth" - is dropped, so
   every figure is a floor rather than a guess.

   Honesty rules baked in:
   - Dots are NOT people. Green pins are the countries where the open-source
     organizations this site tracks publish a location on their GitHub profile.
   - Counts and names only ever come from the fetched JSON files; when they are
     missing the panel shows a labelled sample list with NO numbers.

   Tech: one <canvas> (DPR-capped at 2), DOM nodes for the pet, its hands and
   the two cards, every colour resolved from the site's CSS custom properties
   (blended in srgb by hand - the same arithmetic color-mix(in srgb) does) so
   both themes work without a single hex literal and without a dark: variant -
   the theme flips by remapping those variables on <html.light>.
   No npm additions, one fetch per JSON file. */
import { useEffect, useRef, useState } from "react";

const TAU = Math.PI * 2;
const D2R = Math.PI / 180;

/* ── simplified continent outlines ─────────────────────────────────────
   Rough [lon, lat] polygons drawn from geographic knowledge, deliberately
   stylised: they read as Earth without pretending to be an atlas. Rasterized
   once into a 360x180 mask at module init (a few ms), then sampled O(1).
   Each outline carries the continent a hover should answer with; LAND_CONT
   is the same list by index, "" for Antarctica, which has no developers and
   so is deliberately unhov able. */
type Pt = [number, number];
const LAND: Pt[][] = [
  /* Africa */ [[-17, 15], [-16, 21], [-10, 26], [-3, 35], [10, 37], [20, 32], [25, 32], [34, 30], [35, 24], [39, 15], [43, 11], [51, 12], [48, 5], [42, -1], [40, -8], [36, -18], [33, -26], [27, -34], [19, -35], [15, -28], [12, -18], [9, -1], [9, 4], [4, 6], [-4, 5], [-8, 4], [-13, 8], [-16, 12]],
  /* Madagascar */ [[44, -12], [50, -15], [50, -24], [47, -25], [43, -20]],
  /* South America */ [[-78, 7], [-70, 11], [-62, 10], [-52, 5], [-44, -3], [-35, -8], [-39, -16], [-48, -26], [-55, -35], [-62, -41], [-67, -47], [-74, -53], [-71, -45], [-72, -36], [-71, -28], [-70, -18], [-76, -14], [-81, -5], [-80, 2]],
  /* North America */ [[-168, 66], [-165, 60], [-152, 58], [-140, 60], [-130, 54], [-124, 48], [-124, 40], [-117, 32], [-110, 24], [-105, 20], [-97, 18], [-94, 16], [-90, 14], [-86, 12], [-83, 8], [-78, 8], [-82, 22], [-88, 21], [-96, 20], [-97, 26], [-94, 30], [-89, 30], [-84, 30], [-81, 25], [-80, 32], [-76, 36], [-70, 42], [-66, 45], [-60, 47], [-64, 50], [-57, 52], [-64, 58], [-78, 62], [-86, 64], [-95, 68], [-108, 68], [-115, 70], [-125, 70], [-141, 70], [-156, 71], [-166, 68]],
  /* Greenland */ [[-45, 60], [-38, 66], [-22, 70], [-25, 78], [-40, 83], [-58, 82], [-68, 78], [-58, 70], [-52, 64]],
  /* Eurasia */ [[-10, 36], [-9, 44], [-2, 48], [4, 52], [8, 54], [5, 58], [10, 59], [18, 60], [22, 65], [30, 66], [25, 70], [40, 68], [60, 70], [80, 74], [100, 78], [115, 74], [130, 72], [150, 70], [170, 67], [180, 65], [172, 60], [162, 58], [155, 52], [142, 48], [135, 44], [128, 40], [122, 38], [120, 32], [115, 22], [108, 18], [105, 10], [100, 8], [98, 16], [92, 20], [88, 22], [80, 15], [77, 8], [72, 20], [68, 24], [62, 25], [56, 26], [52, 30], [48, 30], [44, 38], [36, 36], [30, 36], [26, 38], [22, 38], [18, 40], [12, 38], [8, 44], [3, 42], [-2, 36], [-6, 36]],
  /* Britain */ [[-5, 50], [-6, 56], [-3, 58], [0, 53], [1, 51]],
  /* Japan */ [[130, 32], [135, 34], [140, 36], [142, 42], [145, 44], [141, 40], [137, 35], [131, 31]],
  /* Australia */ [[114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -18], [150, -24], [153, -28], [150, -36], [145, -38], [140, -37], [135, -34], [129, -32], [123, -34], [115, -34], [113, -26]],
  /* New Zealand */ [[173, -35], [176, -38], [174, -41], [171, -44], [167, -46], [169, -43], [172, -40]],
  /* Iceland */ [[-24, 64], [-18, 66], [-14, 65], [-22, 63]],
  /* Sri Lanka */ [[80, 9], [82, 7], [80, 6]],
  /* Antarctica */ [[-180, -90], [180, -90], [180, -72], [120, -67], [60, -68], [0, -70], [-60, -63], [-120, -68], [-180, -72]],
];
/* index-for-index with LAND. "Eurasia" is one outline for two continents, so
   it is resolved by coordinates instead (see regionAt). */
const LAND_CONT = [
  "Africa", "Africa", "South America", "North America", "North America", "Eurasia",
  "Europe", "Asia", "Oceania", "Oceania", "Europe", "Asia", "",
];
/* the hover answer for a point on the single Eurasian outline: everything east
   of the Urals or south of the Mediterranean belt is Asia */
const regionAt = (latDeg: number, lonDeg: number, cont: string): string =>
  cont !== "Eurasia" ? cont : (latDeg > 36 && lonDeg < 62 ? "Europe" : "Asia");

const W = 360, H = 180;                 /* mask resolution: 1 deg per cell */
const MASK = new Uint8Array(W * H);
const inPoly = (x: number, y: number, p: Pt[]): boolean => {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    if ((p[i][1] > y) !== (p[j][1] > y) && x < ((p[j][0] - p[i][0]) * (y - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c;
  }
  return c;
};
const LAND_BOX = LAND.map((p) => {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const [x, y] of p) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return [x0, x1, y0, y1] as const;
});
/* the continent a [lon, lat] point belongs to, "" for ocean and Antarctica */
const contOf = (latDeg: number, lonDeg: number): string => {
  for (let k = 0; k < LAND.length; k++) {
    const b = LAND_BOX[k];
    if (lonDeg < b[0] || lonDeg > b[1] || latDeg < b[2] || latDeg > b[3]) continue;
    if (inPoly(lonDeg, latDeg, LAND[k])) return regionAt(latDeg, lonDeg, LAND_CONT[k]);
  }
  return "";
};
{
  const polys = LAND;
  for (let r = 0; r < H; r++) {
    const y = 90 - (r + 0.5);
    for (let c = 0; c < W; c++) {
      const x = -180 + (c + 0.5);
      for (let k = 0; k < polys.length; k++) {
        const b = LAND_BOX[k];
        if (x < b[0] || x > b[1] || y < b[2] || y > b[3]) continue;
        if (inPoly(x, y, polys[k])) { MASK[r * W + c] = 1; break; }
      }
    }
  }
}
/* bilinear sample of the mask by degrees. Cell c is centred on longitude
   -180 + c + 0.5 and row r on latitude 90 - r - 0.5, so the point at
   (lon, lat) sits at fractional cell (lon + 179.5, 89.5 - lat). */
const landAt = (latDeg: number, lonDeg: number): number => {
  const x = (((lonDeg + 179.5) % 360) + 360) % 360;
  const y = Math.max(0, Math.min(H - 1.001, 89.5 - latDeg));
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = (x0 + 1) % W, y1 = Math.min(H - 1, y0 + 1);
  const fx = x - x0, fy = y - y0;
  return (MASK[y0 * W + x0] * (1 - fx) + MASK[y0 * W + x1] * fx) * (1 - fy)
       + (MASK[y1 * W + x0] * (1 - fx) + MASK[y1 * W + x1] * fx) * fy;
};
const hash01 = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/* ── the sphere point lattice ─────────────────────────────────────────
   A lat/lon halftone (like the reference): rows every SDEG degrees, longitudes
   spaced so the on-surface gap stays ~SDEG everywhere, odd rows offset half a
   step. Land dots read firm, ocean dots are a quiet stipple - the continents
   emerge from texture, not outlines. */
const SDEG = 2.05;
const TILT = -0.34;                       /* axial tilt so the spin reads   */
const SPIN = TAU / 96;                    /* one revolution every ~96 s     */
const PSI0 = -1.36;                       /* opening phase: India/Asia facing */
const rowLats: number[] = [];
for (let lat = -86.5; lat <= 86.5; lat += SDEG) rowLats.push(lat);
let TOTAL = 0;
const rowCols = rowLats.map((lat) => {
  const cl = Math.cos(lat * D2R);
  const n = cl < 0.08 ? 1 : Math.round(360 / (SDEG / cl));
  TOTAL += n;
  return n;
});
const N = TOTAL;
/* slot 0 is "not a continent" (ocean, or Antarctica), so a hover that lands
   there simply shows nothing */
const CONT_IDX = ["", "Africa", "Asia", "Europe", "North America", "South America", "Oceania"];
const PX = new Float32Array(N), PY = new Float32Array(N), PZ = new Float32Array(N);
const LANDV = new Float32Array(N);        /* 1 = land, 0 = ocean            */
const CONTI = new Int8Array(N);           /* CONT_IDX slot of this point's continent */
{
  let k = 0;
  rowLats.forEach((lat, ri) => {
    const n = rowCols[ri];
    const cl = Math.cos(lat * D2R);
    const lonStep = n === 1 ? 0 : 360 / n;
    for (let j = 0; j < n; j++) {
      const lon = (j + (ri % 2) * 0.5) * lonStep - 180;
      const a = lon * D2R, b = lat * D2R;
      PX[k] = cl * Math.sin(a); PY[k] = Math.sin(b); PZ[k] = cl * Math.cos(a);
      LANDV[k] = landAt(lat, lon);
      CONTI[k] = CONT_IDX.indexOf(contOf(lat, lon));
      k++;
    }
  });
}
const COS_T = Math.cos(TILT), SIN_T = Math.sin(TILT);

/* ── country data ──────────────────────────────────────────────────────
   Fallback ships with the component: clearly-labelled sample countries of
   the open-source organizations this site tracks (no numbers attached). */
type Country = { name: string; lat: number; lon: number; orgs: number | null; sample: string[] };
const FALLBACK_COUNTRIES: Country[] = [
  { name: "India", lat: 21, lon: 78 }, { name: "Germany", lat: 51, lon: 10 },
  { name: "United States", lat: 39, lon: -98 }, { name: "United Kingdom", lat: 54, lon: -2 },
  { name: "France", lat: 46, lon: 2 }, { name: "Brazil", lat: -10, lon: -53 },
  { name: "Japan", lat: 36, lon: 138 }, { name: "Canada", lat: 56, lon: -106 },
  { name: "Australia", lat: -25, lon: 134 }, { name: "Kenya", lat: 0, lon: 38 },
  { name: "Nigeria", lat: 9, lon: 9 }, { name: "Netherlands", lat: 52, lon: 5 },
].map((c) => ({ ...c, orgs: null, sample: [] }));

type Parsed = { list: Country[]; countries: number; orgs: number };
/* {countries:[{name|country, orgs, lat, lon, sample[]}]} - every field checked,
   nothing trusted: a country without a usable name or a finite centroid is
   dropped rather than guessed at, and numbers appear only when the file gives
   them. Every country the file provides is shown - nothing is trimmed away. */
const parseGlobe = (raw: unknown): Parsed | null => {
  const list = (raw as { countries?: unknown })?.countries;
  if (!Array.isArray(list)) return null;
  const out: Country[] = [];
  let orgsTotal = 0;
  for (const item of list as Record<string, unknown>[]) {
    if (!item || typeof item !== "object") continue;
    const nm = item.country ?? item.name;
    const name = typeof nm === "string" ? nm.trim() : "";
    const lat = Number(item.lat), lon = Number(item.lon);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 85 || Math.abs(lon) > 180) continue;
    const o = Number(item.orgs);
    const orgs = Number.isFinite(o) && o > 0 ? Math.round(o) : null;
    if (orgs) orgsTotal += orgs;
    const rawSample = Array.isArray(item.sample) ? item.sample : [];
    const sample = rawSample
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .slice(0, 2)
      .map((s) => (s.length > 20 ? `${s.slice(0, 19)}…` : s));
    out.push({ name: name.length > 22 ? `${name.slice(0, 21)}…` : name, lat, lon, orgs, sample });
  }
  if (out.length < 4) return null;
  out.sort((a, b) => (b.orgs ?? 0) - (a.orgs ?? 0) || a.name.localeCompare(b.name));
  return { list: out, countries: out.length, orgs: orgsTotal };
};

/* ── the pet's journey ─────────────────────────────────────────────────
   Travels along a great-circle arc between countries (slerp), rests at each
   stop while its card shows, then picks the next front-facing country. */
type Stop = { lat: number; lon: number; i: number };
type Journey = { a: Stop; b: Stop; phase: "travel" | "rest"; t: number; dur: number; tried: Set<number> };
const easeIO = (u: number) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);
const vecOf = (lat: number, lon: number): [number, number, number] => [
  Math.cos(lat * D2R) * Math.sin(lon * D2R),
  Math.sin(lat * D2R),
  Math.cos(lat * D2R) * Math.cos(lon * D2R),
];
/* great-circle interpolation between two surface stops, as a unit vector */
const slerpVec = (a: Stop, b: Stop, u: number): [number, number, number] => {
  const [ax, ay, az] = vecOf(a.lat, a.lon), [bx, by, bz] = vecOf(b.lat, b.lon);
  const d = Math.max(-1, Math.min(1, ax * bx + ay * by + az * bz));
  const om = Math.acos(d), so = Math.sin(om);
  const k1 = so < 1e-4 ? 1 - u : Math.sin((1 - u) * om) / so;
  const k2 = so < 1e-4 ? u : Math.sin(u * om) / so;
  return [k1 * ax + k2 * bx, k1 * ay + k2 * by, k1 * az + k2 * bz];
};
const angBetween = (a: Stop, b: Stop) => {
  const [ax, ay, az] = vecOf(a.lat, a.lon), [bx, by, bz] = vecOf(b.lat, b.lon);
  return Math.acos(Math.max(-1, Math.min(1, ax * bx + ay * by + az * bz)));
};

/* the pet is drawn from a 48-unit viewBox but composited at PET css px, so one
   constant sizes the DOM box, the svg and the gap its arrival card keeps. */
const PET = 118;

/* ── developers per continent ────────────────────────────────────────────
   What a hover answers with, read from /data/continent-devs.json - a roll-up
   of the contributor board's published GitHub locations
   (scripts/build-continent-devs.mjs). The file is the only source: a continent
   with no developers in it is reported as such rather than rounded up, and a
   missing file switches the hover to the organization count the atlas carries. */
type DevCountry = { country: string; devs: number };
type DevContinent = { name: string; devs: number; top: DevCountry; countries: DevCountry[] };
const devByContinent = (raw: unknown): Map<string, DevContinent> | null => {
  const list = (raw as { continents?: unknown })?.continents;
  if (!Array.isArray(list)) return null;
  const out = new Map<string, DevContinent>();
  for (const item of list as Record<string, unknown>[]) {
    const name = typeof item?.name === "string" ? item.name : "";
    const devs = Number(item?.devs);
    if (!name || !Number.isFinite(devs) || devs <= 0) continue;
    const topRaw = (item.top ?? {}) as Record<string, unknown>;
    const topName = typeof topRaw.country === "string" ? topRaw.country : "";
    out.set(name, {
      name,
      devs: Math.round(devs),
      top: { country: topName, devs: Number(topRaw.devs) || 0 },
      countries: Array.isArray(item.countries)
        ? (item.countries as Record<string, unknown>[])
          .map((c) => ({ country: typeof c.country === "string" ? c.country : "", devs: Number(c.devs) || 0 }))
          .filter((c) => c.country)
        : [],
    });
  }
  return out.size ? out : null;
};

export default function UserGlobe() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const petRef = useRef<HTMLDivElement | null>(null);
  /* the robot's arms and hands, painted over the canvas so they grip the
     sphere instead of hiding behind it */
  const armARef = useRef<SVGPathElement | null>(null);
  const armBRef = useRef<SVGPathElement | null>(null);
  const handARef = useRef<SVGCircleElement | null>(null);
  const handBRef = useRef<SVGCircleElement | null>(null);
  const handsRef = useRef<SVGSVGElement | null>(null);
  const pillRef = useRef<HTMLDivElement | null>(null);
  const pillNameRef = useRef<HTMLSpanElement | null>(null);
  const pillSubRef = useRef<HTMLSpanElement | null>(null);
  const pillSampleRef = useRef<HTMLDivElement | null>(null);
  /* the hover card: continent, developer count, the country behind most of them */
  const tipRef = useRef<HTMLDivElement | null>(null);
  const tipNameRef = useRef<HTMLSpanElement | null>(null);
  const tipNumRef = useRef<HTMLSpanElement | null>(null);
  const tipSubRef = useRef<HTMLDivElement | null>(null);

  /* null = the file never loaded: render the labelled sample list. */
  const [fileData, setFileData] = useState<Parsed | null>(null);
  useEffect(() => {
    let live = true;
    /* the atlas the build script actually writes today is /data/user-globe.json;
       the canonical /data/globe-locations.json path is tried only if that one is
       missing, so the happy path stays a single clean fetch. A 404 or a bad
       parse on both leaves fileData null, which renders the clearly-labelled
       built-in sample list with no numbers attached. */
    const urls = ["/data/user-globe.json", "/data/globe-locations.json"];
    void (async () => {
      for (const url of urls) {
        try {
          const r = await fetch(url);
          if (!r.ok) continue;
          const p = parseGlobe(await r.json().catch(() => null));
          if (p) { if (live) setFileData(p); return; }
        } catch { /* offline: next alias, then the sample list */ }
      }
    })();
    return () => { live = false; };
  }, []);

  const dataRef = useRef<Parsed | null>(null);
  dataRef.current = fileData;

  /* the developer roll-up the hover reads, in a ref so a late fetch does not
     restart the animation loop */
  const devsRef = useRef<Map<string, DevContinent>>(new Map());
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const r = await fetch("/data/continent-devs.json");
        if (!r.ok) return;
        const m = devByContinent(await r.json().catch(() => null));
        if (m && live) devsRef.current = m;
      } catch { /* no file: the hover falls back to the organization count */ }
    })();
    return () => { live = false; };
  }, []);

  /* ── the whole render pipeline: measure -> resolve tokens -> animate ──
     Re-runs once when the atlas arrives, so the reduced-motion still frame and
     the first journey are both composed from real data. */
  useEffect(() => {
    const stage = stageRef.current, cvs = canvasRef.current;
    if (!stage || !cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* CSS tokens cannot be handed to canvas directly. Resolving them through a
       probe span's computed `color` is unreliable: Chrome serialises the same
       color-mix()/var() result as rgb(), color(srgb ...) or oklab(...) depending
       on context (oklab shows up in reduced-motion runs), and digit-scraping an
       oklab triple drops the minus signs -> black dots. Read the RAW custom
       properties instead - every colour token in globals.css is a plain hex -
       and do color-mix(in srgb) arithmetic ourselves channel by channel, which
       is exactly what the browser does. Re-read live so theme flips pick up the
       .light remaps. */
    const rgbOf = (name: string): [number, number, number] => {
      const s = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      if (/^#[0-9a-f]{6}$/i.test(s)) return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
      if (/^#[0-9a-f]{3}$/i.test(s)) return [parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16), parseInt(s[3] + s[3], 16)];
      const m = s.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
      if (m) return [+m[1], +m[2], +m[3]];
      return [128, 128, 128];
    };
    const trip = (c: [number, number, number]) => `${c[0] | 0},${c[1] | 0},${c[2] | 0}`;
    const varv = (v: string) => trip(rgbOf(v));
    /* `a` at pa percent blended into `b`; both are theme variables, so the mix
       reverses polarity with the theme instead of needing a dark: variant. */
    const mix = (a: string, pa: number, b: string) => {
      const ca = rgbOf(a), cb = rgbOf(b), f = pa / 100;
      return trip([
        Math.round(ca[0] * f + cb[0] * (1 - f)),
        Math.round(ca[1] * f + cb[1] * (1 - f)),
        Math.round(ca[2] * f + cb[2] * (1 - f)),
      ]);
    };

    const spriteCache = new Map<string, HTMLCanvasElement>();
    const sprite = (rgb: string) => {
      let s = spriteCache.get(rgb);
      if (!s) {
        s = document.createElement("canvas");
        s.width = s.height = 32;
        const g = s.getContext("2d")!;
        const grd = g.createRadialGradient(16, 16, 1, 16, 16, 15);
        grd.addColorStop(0, `rgba(${rgb},1)`);
        grd.addColorStop(0.62, `rgba(${rgb},0.96)`);
        grd.addColorStop(0.82, `rgba(${rgb},0.5)`);
        grd.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = grd;
        g.fillRect(0, 0, 32, 32);
        spriteCache.set(rgb, s);
      }
      return s;
    };

    type Theme = {
      bodyIn: string; bodyOut: string; limb: string; rim: string;
      glow: string; land: HTMLCanvasElement; landEdge: HTMLCanvasElement;
      landHot: HTMLCanvasElement; sea: HTMLCanvasElement; pin: string;
    };
    let th: Theme;
    const relTheme = () => {
      spriteCache.clear();
      /* paper/clay/line/ink/cocoa/dim/accent all remap between themes, so the
         same token pairs give a dark sphere with light dots in the dark theme
         and a pale sphere with dark dots in the light one. foam/steam/coffee
         do NOT remap - they must never carry the sphere. */
      const L = document.documentElement.classList.contains("light");
      th = {
        /* dark theme: the sphere has to read as a body before the dots resolve,
           so the disc is full clay at the lit side and falls back toward paper
           at the limb - about 15 points of luminance above #0e0f10. */
        bodyIn:  L ? mix("--color-paper", 76, "--color-clay") : mix("--color-clay", 100, "--color-paper"),
        bodyOut: L ? mix("--color-clay", 86, "--color-paper") : mix("--color-clay", 52, "--color-paper"),
        limb:    L ? varv("--color-line") : varv("--color-paper"),
        rim:     mix("--color-accent", 52, "--color-rule"),
        glow:    mix("--color-accent", 15, "--color-paper"),
        land:     sprite(varv("--color-ink")),
        landEdge: sprite(mix("--color-ink", 45, "--color-cocoa")),
        /* the hovered continent's dots step forward: ink pulled toward accent,
           so the land lights up without the sphere changing colour */
        landHot:  sprite(mix("--color-ink", 72, "--color-accent")),
        sea:      sprite(mix("--color-dim", 62, "--color-paper")),
        pin:      varv("--color-accent"),
      };
    };

    let w = 0, h = 0, R = 0, cx = 0, cy = 0, dpr = 1;
    const measure = () => {
      w = stage.clientWidth; h = stage.clientHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cvs.width = Math.max(1, Math.round(w * dpr));
      cvs.height = Math.max(1, Math.round(h * dpr));
      /* the earth rides high in the panel. It used to sit at the vertical
         middle and bleed toward the bottom, which pushed the robot down against
         the panel edge; at 0.42 the sphere and the robot both read as floating
         in the upper field, with the empty half of the panel below them doing
         nothing but holding the composition. */
      R = Math.max(132, Math.min(w * 0.36, h * 0.34));
      cx = w / 2;
      cy = h * 0.42;
    };
    measure();
    relTheme();

    const project = (latDeg: number, lonDeg: number, psi: number) => {
      const cl = Math.cos(latDeg * D2R);
      const x = cl * Math.sin(lonDeg * D2R + psi);
      const y = Math.sin(latDeg * D2R);
      const z0 = cl * Math.cos(lonDeg * D2R + psi);
      return { x: cx + R * x, y: cy - R * (y * COS_T - z0 * SIN_T), z: y * SIN_T + z0 * COS_T };
    };

    /* screen -> surface, the inverse of project() for the front hemisphere. A
       pixel gives the normalised x (a) and the tilted y (Y); every point on the
       sphere with that x lies on a circle of radius sqrt(1 - a²), so the view
       depth is the near root of Y² + Z² = 1 - a². Returns null off the disc and
       on the far side, which is exactly the behaviour a hover wants. */
    const surfaceAt = (sx: number, sy: number, psi: number) => {
      const a = (sx - cx) / R;
      const Y = (cy - sy) / R;
      const s2 = 1 - a * a;
      if (s2 <= 0.0001) return null;
      const z2 = s2 - Y * Y;
      if (z2 <= 0.0001) return null;
      const Z = Math.sqrt(z2);
      const b = Y * COS_T + Z * SIN_T;
      const c0 = -Y * SIN_T + Z * COS_T;
      return {
        lat: Math.asin(Math.max(-1, Math.min(1, b))) / D2R,
        lon: Math.atan2(a, c0) / D2R - psi / D2R,
      };
    };

    /* journey state machine */
    const cs = (): Country[] => dataRef.current?.list ?? FALLBACK_COUNTRIES;
    const stopAt = (i: number): Stop => { const c = cs()[i]; return { lat: c.lat, lon: c.lon, i }; };
    let J: Journey | null = null;
    let retry = 0;
    let lastData: Parsed | null | "init" = "init";
    /* the robot never stands on the face of the world - it stands at the limb,
       on the centre-to-country line pushed out to the sphere's edge. Its body
       is half hidden by the earth that way, which is what reads as scale. */
    const anchorOf = (p: { x: number; y: number }) => {
      const dx = p.x - cx, dy = p.y - cy;
      const d = Math.hypot(dx, dy) || 1;
      return { x: cx + (dx / d) * R * 0.955, y: cy + (dy / d) * R * 0.955 };
    };
    /* a stop is "good" when the robot it produces is whole: front face, clear of
       both panel edges, and high enough that its head and its arrival card fit
       under the top of the stage. The band is measured on the anchor rather than
       the country point because the anchor is what the body is drawn around, and
       it rides high - the robot stands over the world, not under it. */
    const goodAt = (i: number, psi: number, minZ: number) => {
      const c = cs()[i];
      const p = project(c.lat, c.lon, psi);
      if (p.z <= minZ) return null;
      const a = anchorOf(p);
      const half = PET / 2;
      if (a.x < w * 0.18 + half || a.x > w * 0.82 - half) return null;
      if (a.y < PET * 0.82 + 18 || a.y > h * 0.62) return null;
      return p;
    };
    const startJourney = () => {
      const list = cs();
      if (!list.length) { J = null; return; }
      let pick = 0, best = -1;
      for (let i = 0; i < list.length; i++) {
        const p = goodAt(i, PSI0, 0.4);
        const score = p ? p.z - Math.abs(p.x - cx) / w : -1e9;
        if (score > best) { best = score; pick = i; }
      }
      J = { a: stopAt(pick), b: stopAt(pick), phase: "rest", t: 0, dur: 3.8, tried: new Set([pick]) };
    };
    startJourney();

    const nextStop = (psi: number) => {
      if (!J) return;
      const list = cs();
      if (J.tried.size >= list.length) J.tried.clear();
      const order = [...list.keys()].sort((a, b) => hash01(a * 7.13 + 1) - hash01(b * 7.13 + 1));
      for (const i of order) {
        if (J.tried.has(i) || i === J.b.i) continue;
        if (!goodAt(i, psi, 0.4)) continue;
        J.tried.add(i);
        const dur = Math.max(4.2, Math.min(9, angBetween(J.b, stopAt(i)) * 2.7));
        J = { a: J.b, b: stopAt(i), phase: "travel", t: 0, dur, tried: J.tried };
        return;
      }
      retry = 0.9;                          /* everyone is on the far side: wait */
    };

    /* ── the hover ──────────────────────────────────────────────────────
       A pixel on the sphere inverts to a latitude/longitude, that point falls
       inside one of the hand-drawn outlines, and the outline's continent
       answers with how many developers this site can actually name behind it.
       The developer roll-up is the primary answer; if its file did not load,
       the hover says what it does know - the organizations located there. */
    let pointer: { x: number; y: number } | null = null;
    const orgsIn = (name: string) => {
      let n = 0;
      for (const c of cs()) if (contOf(c.lat, c.lon) === name) n += c.orgs ?? 0;
      return n;
    };
    const paintTip = (slot: number) => {
      const el = tipRef.current, nm = tipNameRef.current, num = tipNumRef.current, sub = tipSubRef.current;
      if (!el || !nm || !num || !sub) return;
      const cont = CONT_IDX[slot] || "";
      const dev = cont ? devsRef.current.get(cont) : undefined;
      const orgs = cont ? orgsIn(cont) : 0;
      if (!pointer || (!dev && !orgs)) { el.style.opacity = "0"; return; }
      const count = dev ? dev.devs : orgs;
      const unit = dev ? (dev.devs === 1 ? "developer" : "developers") : (orgs === 1 ? "org" : "orgs");
      const tail = dev
        ? `${dev.countries.length} ${dev.countries.length === 1 ? "country" : "countries"} · most in ${dev.top.country} (${dev.top.devs})`
        : "organizations publish a location there";
      nm.textContent = cont;
      num.textContent = `${count} ${unit}`;
      sub.textContent = tail;
      const tw = el.offsetWidth || 190, th = el.offsetHeight || 46;
      const x = Math.max(10, Math.min(w - tw - 10, pointer.x + 16));
      const y = Math.max(10, Math.min(h - th - 10, pointer.y - th - 14));
      el.style.opacity = "1";
      el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    };

    const render = (t: number, psi: number) => {
      if (w <= 0) return;
      /* the live atlas may arrive after mount - re-seed the journey on it */
      if (lastData !== dataRef.current) { lastData = dataRef.current; startJourney(); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      /* the continent under the cursor, re-read every frame: the earth turns
         under a still pointer, so the answer has to turn with it */
      let hoverConti = 0;
      if (pointer) {
        const s = surfaceAt(pointer.x, pointer.y, psi);
        if (s) {
          const nm = contOf(s.lat, s.lon);
          const idx = CONT_IDX.indexOf(nm);
          if (idx > 0) hoverConti = idx;
        }
      }
      paintTip(hoverConti);

      /* the calendar orbit is gone; the halo is the only atmosphere now */

      /* atmosphere halo */
      let g = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.12);
      g.addColorStop(0, `rgba(${th.glow},0)`);
      g.addColorStop(0.45, `rgba(${th.glow},0.2)`);
      g.addColorStop(1, `rgba(${th.glow},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.12, 0, TAU); ctx.fill();

      /* sphere body: lit from upper-left, limb-shaded at the edge */
      g = ctx.createRadialGradient(cx - R * 0.36, cy - R * 0.44, R * 0.05, cx, cy, R);
      g.addColorStop(0, `rgba(${th.bodyIn},1)`);
      g.addColorStop(1, `rgba(${th.bodyOut},1)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
      g = ctx.createRadialGradient(cx, cy, R * 0.62, cx, cy, R);
      g.addColorStop(0, `rgba(${th.limb},0)`);
      g.addColorStop(1, `rgba(${th.limb},0.6)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();

      /* the dots: land firm and crisp, ocean a faint deterministic stipple, so
         the continents read as texture rather than as an outline */
      const cpsi = Math.cos(psi), spsi = Math.sin(psi);
      const hot = hoverConti;
      for (let i = 0; i < N; i++) {
        const x = PZ[i] * spsi + PX[i] * cpsi;
        const z0 = PZ[i] * cpsi - PX[i] * spsi;
        const z = PY[i] * SIN_T + z0 * COS_T;
        if (z <= 0.03) continue;
        const sx = cx + R * x;
        const sy = cy - R * (PY[i] * COS_T - z0 * SIN_T);
        const land = LANDV[i];
        const edge = 1 - Math.pow(1 - z, 3);
        let a: number, s: number, spr: HTMLCanvasElement;
        if (land > 0.5) {
          /* the continent under the cursor steps forward and the rest of the
             land holds back, so a hover reads as one region lighting up rather
             than the whole map changing */
          const isHot = hot > 0 && CONTI[i] === hot;
          const gain = hot > 0 ? (isHot ? 1.2 : 0.62) : 1;
          a = (0.5 + 0.45 * land) * (0.46 + 0.54 * z) * edge * gain;
          s = (2.3 + 1.6 * z) * (isHot ? 1.26 : 1);
          spr = isHot ? th.landHot : (land > 0.82 ? th.land : th.landEdge);
        } else {
          if (hash01(i) > 0.78) continue;   /* ocean: a light even stipple    */
          a = 0.11 * (0.4 + 0.6 * z) * edge;
          s = 1.5 + z;
          spr = th.sea;
        }
        if (a < 0.03) continue;
        ctx.globalAlpha = Math.min(0.9, a);
        ctx.drawImage(spr, sx - s / 2, sy - s / 2, s, s);
      }
      ctx.globalAlpha = 1;

      /* the hairline limb */
      ctx.strokeStyle = `rgba(${th.rim},0.6)`;
      ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();


      /* country pins: the only green on the map, quiet dots on the front face */
      const list = cs();
      for (const c of list) {
        const p = project(c.lat, c.lon, psi);
        if (p.z <= 0.14) continue;
        const a = 0.24 + 0.56 * Math.min(1, (p.z - 0.14) * 3);
        const r = 2 + 1.5 * p.z;
        g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3.2);
        g.addColorStop(0, `rgba(${th.pin},${(0.4 * a).toFixed(3)})`);
        g.addColorStop(1, `rgba(${th.pin},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, r * 3.2, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgba(${th.pin},${a.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
      }

      /* the pet + its arrival card */
      const pet = petRef.current, pill = pillRef.current, pn = pillNameRef.current,
        ps = pillSubRef.current, psm = pillSampleRef.current;
      if (!J) { if (pet) pet.style.opacity = "0"; if (pill) pill.style.opacity = "0"; return; }
      /* travel along a shallow hop above the surface: the arc always stays on
         the visible face, never behind the sphere between stops */
      const u = J.phase === "rest" ? 0 : easeIO(Math.min(1, J.t / J.dur));
      const [vx, vy, vz] = J.phase === "rest" ? vecOf(J.b.lat, J.b.lon) : slerpVec(J.a, J.b, u);
      const hop = J.phase === "travel" ? 0.16 * Math.sin(Math.PI * u) : 0;
      const xw = vz * spsi + vx * cpsi;
      const z0w = vz * cpsi - vx * spsi + hop;
      const mp = { x: cx + R * xw, y: cy - R * (vy * COS_T - z0w * SIN_T), z: vy * SIN_T + z0w * COS_T };
      /* fade out before the panel edge can clip the pet mid-rest */
      const win = (v: number, a: number, b: number) => Math.max(0, Math.min(1, (v - a) / (b - a)));
      const half = PET / 2;
      const mv = Math.max(0, Math.min(1, (mp.z - 0.06) / 0.28))
               * win(mp.x, half + 10, half + 62) * (1 - win(mp.x, w - half - 62, w - half - 10));
      /* the robot stands at the limb on the centre-to-country line, so the
         sphere covers the lower half of its body and it reads as being bigger
         than the world it is holding */
      const { x: apx, y: apy } = anchorOf(mp);
      const nx = (apx - cx) / (R * 0.955), ny = (apy - cy) / (R * 0.955);   /* outward */
      const tx = -ny, ty = nx;                                              /* along the limb */
      const bob = reduced ? 0 : Math.sin(t * 2.1) * (PET / 48);
      if (pet) {
        const depth = 0.9 + 0.1 * ((mp.z + 1) / 2);
        pet.style.opacity = mv.toFixed(3);
        pet.style.transform = `translate(${apx.toFixed(1)}px,${(apy + bob).toFixed(1)}px) translate(-50%,-50%) scale(${depth.toFixed(3)})`;
      }
      /* the arms: a second layer painted OVER the canvas, from the robot's
         shoulders onto the near face of the sphere. They slide along the limb
         in a slow cycle that matches the spin, so the earth is not turning by
         itself - it is being pushed round by two hands. */
      const hands = handsRef.current;
      if (hands && armARef.current && armBRef.current && handARef.current && handBRef.current) {
        /* one shared slide: both hands travel the limb in the same direction,
           the way two hands roll a ball. Counter-phase looked like clapping. */
        const push = reduced ? 0 : Math.sin(t * 0.62) * (PET * 0.12);
        const reach = PET * 0.60;                    /* palm distance in from the anchor */
        const spread = PET * 0.36;                  /* the two hands sit side by side   */
        const grip = (off: number, rad: number) => ({
          x: apx - nx * rad + tx * (off + push),
          y: apy - ny * rad + ty * (off + push) + bob,
        });
        const hA = grip(spread, reach);
        const hB = grip(-spread * 0.72, reach * 0.92);
        const right = hA.x >= hB.x ? hA : hB, left = hA.x >= hB.x ? hB : hA;
        /* the shoulders are where the pet's own arm stubs start, in its upright
           frame: 0.27 of the body width to either side, 0.16 below the middle */
        const sR = { x: apx + PET * 0.27, y: apy + PET * 0.16 + bob };
        const sL = { x: apx - PET * 0.27, y: apy + PET * 0.16 + bob };
        /* the elbow bulges away from the sphere's centre, which is how an arm
           holding a ball reads rather than a straight line to a dot */
        const arm = (s: { x: number; y: number }, hd: { x: number; y: number }) => {
          const mx2 = (s.x + hd.x) / 2, my = (s.y + hd.y) / 2;
          return `M${s.x.toFixed(1)},${s.y.toFixed(1)} Q${(mx2 + nx * PET * 0.14).toFixed(1)},${(my + ny * PET * 0.14).toFixed(1)} ${hd.x.toFixed(1)},${hd.y.toFixed(1)}`;
        };
        armARef.current.setAttribute("d", arm(sR, right));
        armBRef.current.setAttribute("d", arm(sL, left));
        const hr = (PET * 0.10).toFixed(1);
        handARef.current.setAttribute("cx", right.x.toFixed(1));
        handARef.current.setAttribute("cy", right.y.toFixed(1));
        handARef.current.setAttribute("r", hr);
        handBRef.current.setAttribute("cx", left.x.toFixed(1));
        handBRef.current.setAttribute("cy", left.y.toFixed(1));
        handBRef.current.setAttribute("r", hr);
        hands.style.opacity = mv.toFixed(3);
      }
      if (pill && pn && ps && psm) {
        const c = list[J.b.i];
        const show = J.phase === "rest" ? mv : 0;
        if (show > 0.02) {
          if (pn.textContent !== c.name) pn.textContent = c.name;
          const cont = CONT_IDX[CONT_IDX.indexOf(contOf(c.lat, c.lon))];
          const dev = devsRef.current.get(cont);
          const sub = dev
            ? `${dev.devs} developer${dev.devs === 1 ? "" : "s"}`
            : c.orgs != null ? `${c.orgs} ${c.orgs === 1 ? "org" : "orgs"}` : "orgs tracked";
          if (ps.textContent !== sub) ps.textContent = sub;
          const sm = dev
            ? `most of them in ${dev.top.country}`
            : c.sample.join(" · ");
          if (psm.textContent !== sm) psm.textContent = sm;
          psm.style.display = sm ? "block" : "none";
          const pop = reduced ? 1 : 0.92 + 0.08 * easeIO(Math.min(1, J.t / 0.5));
          const px = Math.max(112, Math.min(w - 112, apx));
          /* the card sits above the half of the pet that clears the limb */
          const py = Math.max(44, Math.min(h * 0.66, apy) - (PET * 0.72 + 6));
          pill.style.opacity = show.toFixed(3);
          pill.style.transform = `translate(${px.toFixed(1)}px,${py.toFixed(1)}px) translate(-50%,-100%) scale(${pop.toFixed(3)})`;
        } else {
          pill.style.opacity = "0";
        }
      }
    };

    let raf = 0, last = 0, t = 0;
    const step = (now: number) => {
      if (!last) last = now;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      const psi = PSI0 + t * SPIN;
      if (J) {
        if (retry > 0) {
          retry -= dt;
          if (retry <= 0) nextStop(psi);
        } else {
          J.t += dt;
          /* if the stop drifts toward the limb or panel edge mid-rest,
             cut the visit short rather than fade out awkwardly */
          if (J.phase === "rest" && J.t > 0.7 && !goodAt(J.b.i, psi, 0.3)) J.t = J.dur;
          if (J.phase === "travel" && J.t >= J.dur) { J.t = 0; J.phase = "rest"; J.dur = 3.8; }
          else if (J.phase === "rest" && J.t >= J.dur) { J.t = 0; nextStop(psi); }
        }
      }
      render(t, psi);
      raf = requestAnimationFrame(step);
    };

    if (reduced) {
      render(0, PSI0);                     /* one composed static frame     */
    } else {
      raf = requestAnimationFrame(step);
    }

    /* freeze while the tab is hidden */
    const onVis = () => {
      if (document.hidden) {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
      } else if (!raf && !reduced) {
        last = 0;
        raf = requestAnimationFrame(step);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    const ro = new ResizeObserver(() => { measure(); if (reduced) render(0, PSI0); });
    ro.observe(stage);

    /* the hover is only a stored pixel: render() does the geography each frame,
       so a stationary cursor still gets the right answer as the world turns */
    const onMove = (e: PointerEvent) => {
      const b = stage.getBoundingClientRect();
      pointer = { x: e.clientX - b.left, y: e.clientY - b.top };
      if (reduced) render(0, PSI0);
    };
    const onLeave = () => { pointer = null; paintTip(0); if (reduced) render(0, PSI0); };
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);

    /* the theme flips by toggling .light on <html> - re-resolve tokens at once */
    const mo = new MutationObserver(() => { relTheme(); render(t, PSI0 + t * SPIN); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      ro.disconnect();
      mo.disconnect();
    };
  }, [fileData]);

  return (
    <div className="relative z-10 flex h-full w-full flex-col items-stretch">
      <style>{`
        .ug-eye { transform-box: fill-box; transform-origin: center; animation: ugBlink 6.4s ease-in-out infinite; }
        @keyframes ugBlink { 0%, 90%, 100% { transform: scaleY(1); } 94%, 96% { transform: scaleY(.1); } }
        @media (prefers-reduced-motion: reduce) { .ug-eye { animation: none; } }
      `}</style>

      {/* no headline here: the panel is the globe and the pet, nothing else.
          The sheet's own "Back to Home" pill sits in the screen's top-left
          corner, so the stage starts below it (see the mt on the stage). */}

      {/* the globe stage, bleeding to the panel's bottom edge. The pointer
          lives here: a hover on the sphere answers with that continent's
          developers, so the stage is interactive, not a poster. */}
      <div ref={stageRef} data-globe-stage className="relative -mx-12 -mb-12 mt-[46px] min-h-[320px] flex-1 cursor-crosshair self-stretch">
        <canvas ref={canvasRef} className="absolute inset-0 z-[1] h-full w-full" aria-hidden="true" />

        {/* the pet: original inline SVG robot, and the largest thing on the
            panel. It sits under the canvas in the stacking order, so the
            sphere paints over its lower half and the mascot reads as walking
            behind the earth rather than stuck on its face */}
        <div ref={petRef} className="pointer-events-none absolute left-0 top-0 z-0 opacity-0"
          style={{ width: PET, height: PET, color: "var(--color-accent)", filter: "drop-shadow(0 6px 12px color-mix(in srgb, var(--color-coffee) 55%, transparent))" }}
          aria-hidden="true">
          <svg width={PET} height={PET} viewBox="0 0 48 48" fill="none">
            {/* a robot, not a pet: a squarish head on a squarish body, a dark
                visor with two lights behind it, and the site's green on the
                antenna tip. Drawn in the accent colour so it picks up either
                theme, and small enough to read as standing on the far side of
                the world rather than floating in front of it. */}
            <path d="M24 9.6V5.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="24" cy="3.8" r="2.3" fill="var(--color-accent)" />
            <rect x="11" y="9.6" width="26" height="19" rx="7.5" fill="currentColor" />
            <rect x="15" y="14.2" width="18" height="9.4" rx="4.7" fill="var(--color-coffee)" />
            <g className="ug-eye">
              <circle cx="20.6" cy="18.9" r="2.5" fill="var(--color-foam)" />
              <circle cx="27.4" cy="18.9" r="2.5" fill="var(--color-foam)" />
            </g>
            <rect x="7.4" y="15.6" width="3.6" height="7.4" rx="1.8" fill="currentColor" opacity=".7" />
            <rect x="37" y="15.6" width="3.6" height="7.4" rx="1.8" fill="currentColor" opacity=".7" />
            <rect x="20" y="27.8" width="8" height="3.6" fill="currentColor" />
            <rect x="14" y="30.6" width="20" height="12.4" rx="5.4" fill="currentColor" />
            <rect x="19.6" y="34" width="8.8" height="5.6" rx="2.2" fill="var(--color-coffee)" opacity=".5" />
            <rect x="8.6" y="31.6" width="4.6" height="9.4" rx="2.3" fill="currentColor" opacity=".82" />
            <rect x="34.8" y="31.6" width="4.6" height="9.4" rx="2.3" fill="currentColor" opacity=".82" />
            <rect x="17" y="42.4" width="5.2" height="4.6" rx="2.1" fill="currentColor" />
            <rect x="25.8" y="42.4" width="5.2" height="4.6" rx="2.1" fill="currentColor" />
          </svg>
        </div>

        {/* the arrival card: country, what the count means, two real orgs */}
        <div ref={pillRef}
          className="pointer-events-none absolute left-0 top-0 z-[2] whitespace-nowrap rounded-[13px] border border-line bg-card px-2.5 py-[7px] opacity-0 shadow-soft"
          style={{ transform: "translate(-999px,-999px)" }}>
          <div className="flex items-center gap-1.5">
            <i className="shrink-0 rounded-full bg-accent" style={{ width: 6, height: 6 }} aria-hidden />
            <span ref={pillNameRef} className="text-[12px] font-bold leading-none text-ink" />
            <span ref={pillSubRef} className="text-[10.5px] font-semibold leading-none text-cocoa" />
          </div>
          <div ref={pillSampleRef}
            className="mt-[6px] hidden font-mono text-[8.5px] uppercase leading-none tracking-[.12em] text-dim" />
        </div>

        {/* the robot's arms and hands, drawn over the canvas in stage
            coordinates so they grip the sphere instead of hiding behind it.
            Their geometry is written every frame by the animation loop. */}
        <svg ref={handsRef} className="pointer-events-none absolute inset-0 z-[3] h-full w-full opacity-0"
          style={{ color: "var(--color-accent)", filter: "drop-shadow(0 4px 10px color-mix(in srgb, var(--color-coffee) 60%, transparent))" }}
          aria-hidden="true">
          {/* arms thinner than palms, and each hand carries a hairline of the
              sphere's own shadow colour - without it a same-colour circle melts
              into its stroke and the grip reads as one thick blob */}
          <path ref={armARef} fill="none" stroke="currentColor" strokeWidth={PET * 0.07} strokeLinecap="round" opacity=".95" />
          <path ref={armBRef} fill="none" stroke="currentColor" strokeWidth={PET * 0.07} strokeLinecap="round" opacity=".95" />
          <circle ref={handARef} fill="currentColor" stroke="var(--color-coffee)" strokeWidth="1.2" />
          <circle ref={handBRef} fill="currentColor" stroke="var(--color-coffee)" strokeWidth="1.2" />
        </svg>

        {/* the hover card: which continent the cursor is on, and how many
            developers this site can name behind it */}
        <div ref={tipRef} data-globe-tip
          className="pointer-events-none absolute left-0 top-0 z-[4] rounded-[12px] border border-line bg-card px-2.5 py-[7px] opacity-0 shadow-soft transition-opacity duration-200"
          style={{ transform: "translate(-999px,-999px)" }}>
          <div className="flex items-baseline gap-2">
            <span ref={tipNameRef} className="text-[12px] font-bold leading-none text-ink" />
            <span ref={tipNumRef} className="text-[11px] font-semibold leading-none text-accent" />
          </div>
          <div ref={tipSubRef} className="mt-[5px] font-mono text-[8.5px] uppercase leading-none tracking-[.12em] text-dim" />
        </div>

        {/* one line of instruction, because an interaction nobody knows about
            is an interaction nobody uses */}
        <div className="pointer-events-none absolute bottom-[26px] left-7 z-[2] max-w-[280px]">
          <p className="font-mono text-[9px] uppercase leading-[1.6] tracking-[.14em] text-dim">
            Hover a continent for the developers behind it
          </p>
        </div>
      </div>
    </div>
  );
}
