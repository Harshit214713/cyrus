"use client"
/* ══ UserGlobe.tsx — the sign-in sheet's left panel: "orgs around the world" ═
   A large dotted globe rising from the bottom of the panel (in the spirit of
   coddy.tech's hero): a halftone point lattice over hand-authored simplified
   continent polygons, a small robot pet travelling from country to country,
   one arrival card that appears where the pet lands, and a calendar ring -
   twelve months carrying the programs that run in them - orbiting the sphere.

   The ring is not decoration pretending to be data. A month carries a program
   when one of that program's published phases overlaps the month, read from
   PROGRAMS in src/data/orgs.ts, and each mark is the program's own GitHub
   organization avatar. Which months are quiet, and which are crowded, falls
   out of those calendars.

   Honesty rules baked in:
   - Dots are NOT people. The caption says exactly what they are: the countries
     where the open-source organizations this site tracks publish a location on
     their public GitHub profile.
   - Counts and organization names only ever come from the fetched JSON file;
     when it is missing the panel shows a labelled sample list with NO numbers.

   Tech: one <canvas> (DPR-capped at 2), DOM nodes for the pet and the card,
   every colour resolved from the site's CSS custom properties (blended in srgb
   by hand - the same arithmetic color-mix(in srgb) does) so both themes work
   without a single hex literal and without a dark: variant - the theme flips
   by remapping those variables on <html.light>.
   No npm additions, no external assets beyond the programs' own published
   GitHub avatars, one JSON fetch. */
import { useEffect, useRef, useState } from "react";
import { PROGRAMS } from "../data/orgs";

const TAU = Math.PI * 2;
const D2R = Math.PI / 180;

/* ── simplified continent outlines ─────────────────────────────────────
   Rough [lon, lat] polygons drawn from geographic knowledge, deliberately
   stylised: they read as Earth without pretending to be an atlas. Rasterized
   once into a 360x180 mask at module init (a few ms), then sampled O(1). */
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

const W = 360, H = 180;                 /* mask resolution: 1 deg per cell */
const MASK = new Uint8Array(W * H);
const inPoly = (x: number, y: number, p: Pt[]): boolean => {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    if ((p[i][1] > y) !== (p[j][1] > y) && x < ((p[j][0] - p[i][0]) * (y - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c;
  }
  return c;
};
{
  const polys = LAND;
  const boxes = polys.map((p) => {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const [x, y] of p) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return [x0, x1, y0, y1] as const;
  });
  for (let r = 0; r < H; r++) {
    const y = 90 - (r + 0.5);
    for (let c = 0; c < W; c++) {
      const x = -180 + (c + 0.5);
      for (let k = 0; k < polys.length; k++) {
        const b = boxes[k];
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
const PX = new Float32Array(N), PY = new Float32Array(N), PZ = new Float32Array(N);
const LANDV = new Float32Array(N);        /* 1 = land, 0 = ocean            */
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

/* ── the calendar ring ──────────────────────────────────────────────────
   Twelve month markers on one orbit around the sphere. A month carries a
   program when one of that program's published phases overlaps it - phases
   are decimal month indices (0 = January), so October is 9 and Hacktoberfest's
   {s: 9, e: 10} lands on it. Marks are the program's own GitHub organization
   avatar, the same one its program page already links out to. MAX caps the
   crowded months so the ring stays readable; the pill then says how many more
   programs are running that month. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MAX_MARKS = 4;
type RingMark = { id: string; name: string; owner: string };
const MONTH_PROGRAMS: RingMark[][] = MONTHS.map((_, m) =>
  PROGRAMS
    .filter((p) => (p.phases ?? []).some((ph) => ph.s <= m + 0.999 && ph.e >= m + 0.001))
    .map((p) => ({ id: p.id, name: p.name, owner: p.owner }))
    .sort((a, b) => a.name.localeCompare(b.name)),
);

const RING_SPIN = TAU / 150;                /* one orbit every ~2.5 minutes */

export default function UserGlobe() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const petRef = useRef<HTMLDivElement | null>(null);
  const pillRef = useRef<HTMLDivElement | null>(null);
  const pillNameRef = useRef<HTMLSpanElement | null>(null);
  const pillSubRef = useRef<HTMLSpanElement | null>(null);
  const pillSampleRef = useRef<HTMLDivElement | null>(null);
  /* the twelve month markers, moved by the same clock as the sphere */
  const markRefs = useRef<(HTMLDivElement | null)[]>([]);

  /* "this month" cannot be read during render: the prerender happens on the
     build machine's clock, so the highlight is applied after mount. */
  const [nowMonth, setNowMonth] = useState(-1);
  useEffect(() => { setNowMonth(new Date().getMonth()); }, []);

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
      sea: HTMLCanvasElement; pin: string;
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
        sea:      sprite(mix("--color-dim", 62, "--color-paper")),
        pin:      varv("--color-accent"),
      };
    };

    let w = 0, h = 0, R = 0, cx = 0, cy = 0, dpr = 1, rx = 0, ry = 0;
    const measure = () => {
      w = stage.clientWidth; h = stage.clientHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cvs.width = Math.max(1, Math.round(w * dpr));
      cvs.height = Math.max(1, Math.round(h * dpr));
      /* the earth is the backdrop, not the subject: a small, complete sphere
         sitting low-centre in the panel. It used to bleed off the bottom edge,
         which left the top half of the panel empty and made the pet look like
         it was standing on the floor rather than in front of the world. */
      R = Math.max(140, Math.min(w * 0.36, h * 0.385));
      cx = w / 2;
      cy = h * 0.52;
      /* the calendar orbit: wide enough that a marker clears the sphere's
         limb, flat enough to read as a ring seen near edge-on */
      rx = R * 1.17;
      ry = R * 0.34;
    };
    measure();
    relTheme();

    /* the orbit opens with the current month at the front of the sphere; read
       on the client, because the build machine's clock is not the visitor's */
    const ring0 = Math.PI / 2 - new Date().getMonth() * (TAU / 12);

    const project = (latDeg: number, lonDeg: number, psi: number) => {
      const cl = Math.cos(latDeg * D2R);
      const x = cl * Math.sin(lonDeg * D2R + psi);
      const y = Math.sin(latDeg * D2R);
      const z0 = cl * Math.cos(lonDeg * D2R + psi);
      return { x: cx + R * x, y: cy - R * (y * COS_T - z0 * SIN_T), z: y * SIN_T + z0 * COS_T };
    };

    /* journey state machine */
    const cs = (): Country[] => dataRef.current?.list ?? FALLBACK_COUNTRIES;
    const stopAt = (i: number): Stop => { const c = cs()[i]; return { lat: c.lat, lon: c.lon, i }; };
    let J: Journey | null = null;
    let retry = 0;
    let lastData: Parsed | null | "init" = "init";
    /* a stop is "good" when it projects onto the front face AND leaves room for
       the pet's own body - it is 104px tall now, so the band a stop can sit in
       is the sphere's face minus the mascot's head above and feet below, and
       clear of the caption card parked in the bottom-left corner */
    const goodAt = (i: number, psi: number, minZ: number) => {
      const c = cs()[i];
      const p = project(c.lat, c.lon, psi);
      const half = PET / 2;
      return p.z > minZ && p.x > w * 0.2 + half && p.x < w * 0.8 - half
        && p.y > h * 0.14 + PET && p.y < h * 0.78 ? p : null;
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

    const render = (t: number, psi: number) => {
      if (w <= 0) return;
      /* the live atlas may arrive after mount - re-seed the journey on it */
      if (lastData !== dataRef.current) { lastData = dataRef.current; startJourney(); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      /* the calendar orbit, seen edge-on: the far half is drawn first so the
         sphere covers it, the near half last so it crosses in front. */
      const ringOf = (a: number) => ({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
      const arc = (from: number, to: number, alpha: number) => {
        ctx.strokeStyle = `rgba(${th.rim},${alpha})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 6]);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, from, to);
        ctx.stroke();
        ctx.setLineDash([]);
      };
      arc(0, TAU, 0.24);

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
          a = (0.5 + 0.45 * land) * (0.46 + 0.54 * z) * edge;
          s = 2.3 + 1.6 * z;
          spr = land > 0.82 ? th.land : th.landEdge;
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

      /* the near half of the orbit, painted over the sphere */
      arc(0, Math.PI, 0.5);

      /* the month markers ride that ellipse. Depth is sin(angle): the bottom
         half is in front of the earth, the top half behind it, so a marker
         dims and shrinks as it goes round the back instead of sliding over
         the face of it. */
      const ringPsi = ring0 + t * RING_SPIN;
      for (let i = 0; i < 12; i++) {
        const el = markRefs.current[i];
        if (!el) continue;
        const a = ringPsi + (i * TAU) / 12;
        const s = Math.sin(a);
        const f = (s + 1) / 2;
        const p = ringOf(a);
        const front = s > 0;
        el.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) translate(-50%,-50%) scale(${(0.74 + 0.3 * f).toFixed(3)})`;
        el.style.opacity = (0.14 + 0.86 * Math.pow(f, 1.5)).toFixed(3);
        el.style.zIndex = front ? "4" : "0";
      }

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
      /* fade out before the panel edge can clip the pet mid-rest - the margins
         are in pixels now that the pet is a fixed 104px body */
      const win = (v: number, a: number, b: number) => Math.max(0, Math.min(1, (v - a) / (b - a)));
      const half = PET / 2;
      const mv = Math.max(0, Math.min(1, (mp.z - 0.06) / 0.28))
               * win(mp.x, half + 10, half + 62) * (1 - win(mp.x, w - half - 62, w - half - 10));
      /* the pet walks behind the earth, not across its face: the anchor is
         pushed out to the limb along the centre-to-country line, so the lower
         half of the body is hidden by the sphere and the mascot peeks round
         the edge of the world at every stop */
      const dx = mp.x - cx, dy = mp.y - cy;
      const d = Math.hypot(dx, dy) || 1;
      const rr = R * 0.955;
      const apx = cx + (dx / d) * rr;
      const apy = cy + (dy / d) * rr;
      if (pet) {
        const bob = reduced ? 0 : Math.sin(t * 2.1) * (PET / 48);
        const depth = 0.9 + 0.1 * ((mp.z + 1) / 2);
        pet.style.opacity = mv.toFixed(3);
        pet.style.transform = `translate(${apx.toFixed(1)}px,${(apy + bob).toFixed(1)}px) translate(-50%,-50%) scale(${depth.toFixed(3)})`;
      }
      if (pill && pn && ps && psm) {
        const c = list[J.b.i];
        const show = J.phase === "rest" ? mv : 0;
        if (show > 0.02) {
          if (pn.textContent !== c.name) pn.textContent = c.name;
          const sub = c.orgs != null ? `${c.orgs} ${c.orgs === 1 ? "org" : "orgs"}` : "orgs tracked";
          if (ps.textContent !== sub) ps.textContent = sub;
          const sm = c.sample.join(" · ");
          if (psm.textContent !== sm) psm.textContent = sm;
          psm.style.display = sm ? "block" : "none";
          const pop = reduced ? 1 : 0.92 + 0.08 * easeIO(Math.min(1, J.t / 0.5));
          const px = Math.max(112, Math.min(w - 112, apx));
          /* the card sits above the half of the pet that clears the limb */
          const py = Math.max(h * 0.16, Math.min(h * 0.72, apy)) - (PET * 0.6 + 10);
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

    /* the theme flips by toggling .light on <html> - re-resolve tokens at once */
    const mo = new MutationObserver(() => { relTheme(); render(t, PSI0 + t * SPIN); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      ro.disconnect();
      mo.disconnect();
    };
  }, [fileData]);

  const hasData = !!fileData;
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

      {/* the globe stage, bleeding to the panel's bottom edge */}
      <div ref={stageRef} className="relative -mx-12 -mb-12 mt-[46px] min-h-[320px] flex-1 self-stretch">
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

        {/* the calendar ring: twelve month markers, each carrying the programs
            whose published phases overlap that month. Positioned by the same
            clock as the sphere, so they swing behind it and come round again.
            The images are the programs' own GitHub organization avatars - the
            same ones their program pages link to - with a monogram fallback if
            an avatar ever fails to load. */}
        <div className="pointer-events-none absolute inset-0" role="img"
          aria-label="A year ringed around the earth: each month shows the open-source programs running in it.">
          {MONTHS.map((mo, i) => {
            const marks = MONTH_PROGRAMS[i];
            const shown = marks.slice(0, MAX_MARKS);
            const extra = marks.length - shown.length;
            const here = i === nowMonth;
            return (
              <div key={mo} ref={(el) => { markRefs.current[i] = el; }}
                className="absolute left-0 top-0 flex flex-col items-center gap-[3px] opacity-0 will-change-transform"
                style={{ transform: "translate(-999px,-999px)" }}>
                <span className={`font-mono text-[8.5px] font-bold uppercase leading-none tracking-[.16em] ${here ? "text-accent" : "text-cocoa"}`}>
                  {mo}
                </span>
                <span className={`flex items-center rounded-full border bg-card/90 py-[2px] pl-[2px] pr-[5px] shadow-soft ${here ? "border-accent/70" : "border-line"}`}>
                  <span className="flex -space-x-[5px]">
                    {shown.map((m) => (
                      <img key={m.id} src={`https://github.com/${m.owner}.png?size=48`} alt="" title={m.name}
                        width={15} height={15}
                        className="h-[15px] w-[15px] rounded-full border border-card/90 bg-liness object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }} />
                    ))}
                  </span>
                  {extra > 0 && (
                    <span className="ml-[3px] font-mono text-[8px] font-bold leading-none text-dim">+{extra}</span>
                  )}
                  {marks.length === 0 && (
                    <span className="ml-[1px] mr-[2px] font-mono text-[8px] leading-none text-dim">·</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* the honest caption, as a line of type rather than a card: the
            panel is a globe and a robot, and a boxed box in the corner was
            the third rectangle competing with them */}
        <div className="absolute bottom-[62px] left-7 z-[2] max-w-[300px]">
          <p className="text-[11px] leading-[1.6] text-cocoa">
            Dots are the countries where tracked open-source organizations publish a
            location on their public GitHub profile. The ring is the year: each month
            carries the programs whose published phases overlap it.
          </p>
          <p className="mt-1.5 font-mono text-[9px] uppercase leading-[1.6] tracking-[.14em] text-dim">
            {hasData
              ? <>{fileData.countries} countries · {fileData.orgs} orgs located</>
              : "Sample list · live atlas not loaded"}
          </p>
        </div>
      </div>
    </div>
  );
}
