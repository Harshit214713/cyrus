/* ══ mark.ts — the brand mark ═══════════════════════════════════════
   An aperture ring: four congruent blades set at right angles around an empty
   centre. Each blade is a wide sweep that narrows into a thin tail and hooks
   under the next one, so the ring reads as a strip twisting over itself. The
   blades are drawn; the diamond they leave open in the middle is what you
   notice first.

   Traced from the reference artwork rather than invented: the outline was
   thresholded, simplified and re-smoothed into the thirty points below
   (scratch/trace.mjs keeps the generator), and the other three blades are this
   one turned a quarter, a half and three quarters of the way round. That is why
   the mark is exactly four-fold symmetric - a quarter turn puts it back where
   it started, which is the rotation the header hover and the intro both use.

   No plate and no black field. The colour is currentColor with one blade in the
   brand accent, so the same component reads correctly on paper and on graphite.
   ══ */

/** One blade, as points relative to the centre of the 100x100 box. */
const BLADE: [number, number][] = [
  [-34.76, 2.3], [-31.2, 2.56], [-24.91, 6.42], [-17.23, 12.45], [-9.33, 21.22],
  [-2.04, 30.85], [2.73, 36.58], [6.6, 38.97], [11.8, 40.53], [17.84, 40.58],
  [24.65, 38.88], [20.53, 41.18], [15.28, 43.4], [9.55, 45.05], [3.3, 45.83],
  [-3.56, 45.83], [-9.63, 45.05], [-16.06, 42.96], [-23.69, 39.14], [-30.07, 34.67],
  [-34.02, 30.9], [-26.17, 35.89], [-17.53, 40.1], [-16.97, 36.93], [-17.53, 31.51],
  [-19.7, 25.6], [-23.56, 20.18], [-29.94, 14.15], [-38.88, 7.29], [-37.15, 4.77],
];

const f = (n: number) => Math.round(n * 100) / 100;

/** Turn a point ring by `deg` about the centre. */
function spin(pts: [number, number][], deg: number): [number, number][] {
  if (!deg) return pts;
  const a = (deg * Math.PI) / 180;
  const s = Math.sin(a);
  const c = Math.cos(a);
  return pts.map(([x, y]) => [f(x * c - y * s), f(x * s + y * c)]);
}

/** Catmull-Rom through a closed point ring, emitted as cubic beziers. The
 *  tangent at each point eases out to nothing wherever the ring folds back on
 *  itself, so the blade tips stay points instead of overshooting into loops. */
function outline(pts: [number, number][]): string {
  const n = pts.length;
  const len = (a: number[], b: number[]) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const tan = (i: number): [number, number] => {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const back = len(p0, p1), fwd = len(p1, p2), span = len(p0, p2);
    const k = Math.max(0, Math.min(1, (span / (back + fwd || 1) - 0.5) / 0.35));
    return [((p2[0] - p0[0]) / 6) * k, ((p2[1] - p0[1]) / 6) * k];
  };
  const T = pts.map((_, i) => tan(i));
  let d = `M${f(pts[0][0] + 50)} ${f(pts[0][1] + 50)}`;
  for (let i = 0; i < n; i++) {
    const p1 = pts[i], p2 = pts[(i + 1) % n];
    const cap = len(p1, p2) / 2.4;
    const limit = (t: [number, number]): [number, number] => {
      const m = Math.hypot(t[0], t[1]);
      return cap > 0 && m > cap ? [t[0] * cap / m, t[1] * cap / m] : t;
    };
    const t1 = limit(T[i]), t2 = limit(T[(i + 1) % n]);
    d += `C${f(p1[0] + t1[0] + 50)} ${f(p1[1] + t1[1] + 50)} ${f(p2[0] - t2[0] + 50)} ${f(p2[1] - t2[1] + 50)} ${f(p2[0] + 50)} ${f(p2[1] + 50)}`;
  }
  return `${d}Z`;
}

/** The four blades, in viewBox 0 0 100 100. */
export const BLADES = [0, 90, 180, 270].map((deg) => outline(spin(BLADE, deg)));

/** Unit vectors pointing out through the middle of each blade - where a blade
 *  comes from when the aperture opens, and where it slides back to on hover. */
const MASS = BLADE.reduce(([ax, ay], [x, y]) => [ax + x / BLADE.length, ay + y / BLADE.length], [0, 0]);
const MAG = Math.hypot(MASS[0], MASS[1]) || 1;
export const BLADE_OUT: [number, number][] = [0, 90, 180, 270].map((deg) => {
  const [x, y] = spin([MASS], deg)[0];
  return [Math.round((x / MAG) * 1000) / 1000, Math.round((y / MAG) * 1000) / 1000];
});
