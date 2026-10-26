/* ══ mark.ts — the brand mark ═══════════════════════════════════════
   A die seen corner-on: a rounded hexagon cut into three congruent faces by
   a Y seam running from the centre to alternating vertices. No numbers, no
   letters - the three faces and the channel between them are the whole mark.
   It is exactly three-fold symmetric, so a third of a turn puts it back where
   it started, which is what the header hover and the intro both use.

   Generated, not hand-drawn: every path is the intersection of two inset seam
   lines with the hexagon edges, corners rounded by trimming and a quadratic
   through the vertex. FACETS is ordered top, lower-left, right - the lit face,
   the body, the shadow.                                             ══ */

/** The three faces, in viewBox 0 0 100 100. */
export const FACET_TOP =
  "M67.84 12.3Q69.57 9.3 66.11 9.3L40 9.3Q26.5 9.3 19.75 20.99L6.7 43.6Q4.96 46.6 8.43 46.6L44.57 46.6Q48.04 46.6 49.77 43.6Z";

export const FACET_LOW =
  "M8.43 53.4Q4.96 53.4 6.7 56.4L19.75 79.01Q26.5 90.7 40 90.7L66.11 90.7Q69.57 90.7 67.84 87.7L49.77 56.4Q48.04 53.4 44.57 53.4Z";

export const FACET_SIDE =
  "M73.73 84.3Q75.46 87.3 77.2 84.3L90.25 61.69Q97 50 90.25 38.31L77.2 15.7Q75.46 12.7 73.73 15.7L55.66 47Q53.93 50 55.66 53Z";

export const FACETS = [FACET_TOP, FACET_LOW, FACET_SIDE];

/** The whole silhouette: the same hexagon with the seams closed. Used as the
 *  plate behind the mark on the favicon, the app icons and the share card. */
export const SILHOUETTE =
  "M90.25 61.69Q97 50 90.25 38.31L80.25 20.99Q73.5 9.3 60 9.3L40 9.3Q26.5 9.3 19.75 20.99L9.75 38.31Q3 50 9.75 61.69L19.75 79.01Q26.5 90.7 40 90.7L60 90.7Q73.5 90.7 80.25 79.01Z";
