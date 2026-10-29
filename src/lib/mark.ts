/* ══ mark.ts — the brand mark ═══════════════════════════════════════
   A hatched globe: ten parallel bands laid across a circle at 43°, each one
   cut off exactly at the rim, so the silhouette is a clean disc and the stripes
   do the talking. Nothing here is invented - the angle, the pitch and the band
   width were fitted against the supplied artwork by scoring candidate geometry
   against its pixel mask (scratch/stripes-fit.mjs keeps the fitter), and the
   winning numbers are the ones below: IoU 0.82 against the reference, which is
   about as close as a JPEG with soft edges allows.

   Every band is a real chord band - two straight edges and two circular arcs -
   so the mark needs no clip path and no mask. STRIPES are drawn upright (bands
   horizontal) so the animation can simply grow them along their own length;
   STRIPES_LEANED has the tilt baked into the coordinates for the places that
   cannot carry a group transform.

   No plate and no field. The colour is currentColor, so the same component
   reads correctly on paper and on graphite.
   ══ */

/** Fitted from the reference artwork, on a 100x100 box. The disc is the full
 *  box; pitch, band width and tilt are the mean of the ten band centres and
 *  half-max widths read off the reference's perpendicular profile
 *  (scratch/stripes-profile.mjs keeps the reader). */
export const ANGLE = 43;
export const RADIUS = 50;
export const PITCH = 10.05;
export const WIDTH = 5.38;
export const COUNT = 10;

const f = (n: number) => Math.round(n * 1000) / 1000;

/** Signed perpendicular offset of band k from the centre of the disc. */
export function offset(k: number): number {
  return (k - (COUNT - 1) / 2) * PITCH;
}

/** A band at offset `v`, half `WIDTH/2` across, trimmed to a circle of
 *  `RADIUS`: out along +u, arc round the rim, back along the far edge, arc
 *  home. Coordinates are (u along the band, v across it). */
function band(v: number, rot: number): string {
  const h = WIDTH / 2;
  const a = v - h;
  const b = v + h;
  const La = Math.sqrt(Math.max(0, RADIUS * RADIUS - a * a));
  const Lb = Math.sqrt(Math.max(0, RADIUS * RADIUS - b * b));
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const P = (u: number, w: number) => {
    const x = u * c - w * s;
    const y = u * s + w * c;
    return `${f(x + RADIUS)} ${f(y + RADIUS)}`;
  };
  const r = f(RADIUS);
  return (
    `M${P(La, a)}A${r} ${r} 0 0 1 ${P(Lb, b)}` +
    `L${P(-Lb, b)}A${r} ${r} 0 0 1 ${P(-La, a)}Z`
  );
}

/** Bands upright, in viewBox 0 0 100 100 — the caller tilts them with a group
 *  rotation, which keeps `scaleX` free as the reveal animation. */
export const STRIPES = Array.from({ length: COUNT }, (_, k) => band(offset(k), 0));

/** The same mark with the tilt already in the coordinates, for renderers that
 *  cannot carry a transform on the group. */
export const STRIPES_LEANED = Array.from({
  length: COUNT,
}, (_, k) => band(offset(k), (-ANGLE * Math.PI) / 180));
