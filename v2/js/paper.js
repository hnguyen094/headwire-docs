// The paper's parallax: the drawing's paper grain moves with the scroll at a share of the copy's
// pace, so the page reads as a sheet sliding under the pinned cards, the same on every screen.
// The scroll the drawing follows (motion.js) is its one source; with Reduce Motion it keeps still.

/** The paper's share of the scroll. */
export const PAPER_RATE = 0.3;

/** How far, in CSS pixels, the paper has moved up at `scroll`, or 0 with `reduced` asked for. */
export function paperShift(scroll, reduced) {
    return reduced ? 0 : scroll * PAPER_RATE;
}
