// The live drawing: three.js draws the desk each frame as the page scrolls.
import * as THREE from 'three';
import { createView } from './view.js';
import { makeShots } from './path.js';
import { timeline } from './timeline.js';
import { fadeCards } from './scroll.js';
import { animate } from './motion.js';
import { PAPER_RATE, paperShift } from './paper.js';

const params = new URLSearchParams(location.search);
const capture = params.has('capture');
const options = {
    capture,
    // With ?measure, each frame waits for the GPU to finish, so its time is the whole frame's.
    measure: params.has('measure'),
    reduced: matchMedia('(prefers-reduced-motion: reduce)'),
    dark: matchMedia('(prefers-color-scheme: dark)'),
    // With ?capture&orbit=degrees, review stills look from that far round the subject (180:
    // behind, with the wall left out so the camera can stand there).
    orbit: THREE.MathUtils.degToRad(Number(params.get('orbit') ?? 0)),
};
// A reader whose browser asks to save data (Data Saver, or Low Data Mode where a browser reports
// it) keeps the drawn devices and downloads none of Apple's models, about 1.9 MB.
const savingData = navigator.connection?.saveData === true || matchMedia('(prefers-reduced-data: reduce)').matches;

/**
 * Apple's models take the drawn devices' places one by one as they arrive (props.js); until
 * then, and for good if they fail or take too long, the page draws the drawn ones. ?props=drawn,
 * or saving data, keeps the drawn ones. `models` counts what was wanted and placed, and is `ready` once every
 * model has arrived or given up; `changed()` hears each step.
 */
async function loadModels(view, models, changed) {
    try {
        if (params.get('props') === 'drawn' || savingData) return;
        const { swapProps, propCount } = await import('./props.js');
        models.wanted = propCount;
        await swapProps(view, () => {
            models.placed++;
            view.shots = makeShots(view.screens);
            changed();
        });
    } catch (error) {
        console.warn(error);
    } finally {
        models.ready = true;
        changed();
    }
}

function summary(stats) {
    const pct = (list, p) => (list.length ? [...list].sort((a, b) => a - b)[Math.min(list.length - 1, Math.floor(list.length * p))] : null);
    return {
        frames: stats.frames,
        cpuMedian: pct(stats.cpu, 0.5), cpuP95: pct(stats.cpu, 0.95),
        intervalMedian: pct(stats.intervals, 0.5), intervalP95: pct(stats.intervals, 0.95),
    };
}

// What the renders and tests read and drive: window.v2.
function expose(view, models) {
    window.v2 = {
        /** Every model has arrived or given up; `modelsPlaced` of `modelsWanted` took their places. */
        get modelsReady() { return models.ready; },
        get modelsPlaced() { return models.placed; },
        get modelsWanted() { return models.wanted; },
        /** Draws timeline position t at boil time `time`, the paper moved up `shift`, for the stills. */
        renderAt(t, time = 0, shift = 0) {
            view.draw(t, time, shift);
            view.renderer.getContext().finish();
        },
        /** The paper's share of the scroll, and its offset at a scroll (paper.js). */
        paperRate: PAPER_RATE,
        paperShift: (scroll) => paperShift(scroll, options.reduced.matches),
        /** Of the last frame's drawn pixels, the share at the farthest depth the sketch packs. */
        saturatedDepth: () => view.sketch.saturatedDepth(),
        /**
         * How far the last frame moved each theme's background for the scroll (paper.js), and
         * where Standard's glows were drawn, [x, y] in screen shares from the bottom left (glass.js).
         */
        backgroundOffsets: () => view.sketch.backgroundOffsets(),
        stats: () => ({ ...summary(view.stats), size: [view.width, view.height], scale: view.scale, calls: view.renderer.info.render.calls }),
        resetStats() {
            Object.assign(view.stats, { frames: 0, cpu: [], intervals: [] });
        },
        timeline,
        /** Pans the camera as a drag would, for the pan recording. */
        pan: (dYaw, dPitch) => view.pan?.nudge(dYaw, dPitch),
    };
}

export async function start() {
    const story = document.querySelector('.story');
    const view = await createView(document.querySelector('.stage canvas'), options);
    const models = { ready: false, placed: 0, wanted: 0 };
    let redraw = () => {};
    const loading = loadModels(view, models, () => redraw());
    expose(view, models);
    if (capture) await loading;
    if (capture && Math.abs(options.orbit) > Math.PI / 2) view.screens.wall.visible = false;
    fadeCards(story);
    if (capture) {
        // The renders draw each still themselves, after any resize; the live page draws in the
        // same task as its resize (motion.js).
        addEventListener('resize', view.resize);
        options.dark.addEventListener('change', view.follow);
        addEventListener('themechange', view.follow);
        document.documentElement.classList.add('capture');
        return;
    }
    redraw = animate(view, story);
}
