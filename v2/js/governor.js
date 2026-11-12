// How many pixels the drawing uses: fewer when frames come too slowly while scrolling, but only
// while that helps. A display, or Low Power Mode, that gives animation frames 30 times a second
// makes every interval slow however few pixels the page draws; so a step down that leaves frames
// no quicker is taken back, and frames at that pace stop counting as slow until quicker ones show
// the display can go faster.

// Frames slower than this many ms, about 45 a second, are slow.
const SLOW = 22;
// How many slow frames in a row bring a step down, and how many frames judge it.
const RUN = 9;
const STEP = 0.15, LEAST = 0.55;
// A step down must make frames this much quicker to stay.
const BETTER = 0.85;

const round = (value) => Math.round(value * 100) / 100;

/**
 * Device pixels the drawing draws per CSS pixel at full resolution, on a display of `ratio` device
 * pixels per CSS pixel with the canvas `width` CSS pixels wide. Under 2x it draws at 2 and the
 * browser scales the canvas down, which smooths its lines as supersampling does; at 2x and over
 * it draws at the display's own pixels up to 2 on a phone, and at 1.5 on a wide screen, whose
 * many pixels cost the most.
 */
export function drawingPixels(ratio, width) {
    if (ratio < 2) return 2;
    return width < 700 ? 2 : 1.5;
}

function median(list) {
    return [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];
}

/** Starts at full resolution; `scale` is the share of pixels to draw with. */
export function createGovernor() {
    let scale = 1, slow = [], trial = null, bound = 0;

    // A step down, judged by the next run of frames.
    function judge(interval) {
        trial.after.push(interval);
        if (trial.after.length < RUN) return false;
        const helped = median(trial.after) < trial.before * BETTER;
        if (!helped) {
            scale = round(scale + STEP);
            bound = trial.before;
        }
        trial = null;
        return !helped;
    }

    return {
        get scale() {
            return scale;
        },
        /**
         * Takes the ms since the frame drawn before, 0 for the first of a run; answers whether
         * the scale changed. An interval of 100 ms or more is a pause, not a slow frame.
         */
        sample(interval) {
            if (!interval || interval >= 100) {
                slow = [];
                return false;
            }
            if (trial) return judge(interval);
            if (bound && interval < bound * 0.7) bound = 0;
            slow = interval > Math.max(SLOW, bound * 1.25) ? [...slow, interval] : [];
            if (slow.length < RUN || scale - STEP < LEAST) return false;
            trial = { before: median(slow), after: [] };
            slow = [];
            scale = round(scale - STEP);
            return true;
        },
    };
}
