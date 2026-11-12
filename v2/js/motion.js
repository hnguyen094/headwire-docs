// Drawing as the page scrolls: the camera follows the scroll a moment behind, a drag turns it,
// and for BOIL_FOR after the last thing that woke the drawing Sketch's pencil lines boil six times
// a second; Standard's lines hold still. Frames run only while something moves or the lines do
// (loop.js), and fewer pixels are drawn while that
// makes slow frames quicker (governor.js).
import { createLoop } from './loop.js';
import { createGovernor } from './governor.js';
import { scrollMap, fadeCards } from './scroll.js';
import { createPan } from './pan.js';
import { paperShift } from './paper.js';

// How quickly the camera catches up with the scroll: about 95% in a third of a second, so a
// mouse wheel's steps become one continuous move.
const FOLLOW = 0.11;
// How long the lines keep moving after the last scroll, pan, resize, return to the page or change
// to the desk, in milliseconds. Then the drawing rests on its last frame and asks for none until
// the next.
const BOIL_FOR = 8000;

// Whether the lines move on their own at `now`: not with Reduce Motion, nor in a theme whose lines
// hold still, nor once BOIL_FOR has passed since the drawing was last woken.
function boiling(view, state, now) {
    return !view.options.reduced.matches && view.sketch.idleRate > 0 && now - state.wokenAt < BOIL_FOR;
}

// Moves the lines' own clock on while they move, and holds it while they rest, so they take up
// where they stopped rather than jumping to where the time between would have taken them.
function tick(state, now, moving) {
    if (moving && state.lastTick) state.clock += Math.min(now - state.lastTick, 100) / 1000;
    state.lastTick = moving ? now : 0;
}

// One animation frame: answers whether something still moves, so the next frame should run.
function step(view, state, now) {
    const reduced = view.options.reduced.matches;
    const idle = boiling(view, state, now);
    tick(state, now, idle);
    const boil = idle ? Math.floor(state.clock * view.sketch.idleRate) : state.lastBoil;
    const settling = state.pan.settling;
    const dt = state.lastFrame ? Math.min((now - state.lastFrame) / 1000, 0.1) : 0;
    state.pan.step(dt);
    state.lastFrame = now;
    const aim = state.map(scrollY);
    const following = Math.abs(aim - state.shown) > 0.00005;
    state.shown = following && !reduced ? state.shown + (aim - state.shown) * (1 - Math.exp(-dt / FOLLOW)) : aim;
    const moving = scrollY !== state.lastScroll || state.moved || settling || following;
    if (moving || boil !== state.lastBoil || state.dirty) draw(view, state, now);
    else state.last = 0;
    state.lastBoil = boil;
    // Asleep, the next frame starts a new run: no catching up on the time between.
    if (!moving) state.lastFrame = state.last = 0;
    return moving;
}

// The paper's offset at the scroll the drawing last drew at, its one reading of the scroll.
function shiftOf(view, state) {
    return paperShift(Math.max(state.lastScroll, 0), view.options.reduced.matches);
}

// Draws a frame. A slow run of frames may change the share of pixels drawn first, so the frame that
// resizes the canvas, which clears it, is also the one drawn on it.
function draw(view, state, now) {
    const interval = state.last ? now - state.last : 0;
    if (interval) view.stats.intervals.push(interval);
    state.last = now;
    state.lastScroll = scrollY;
    state.moved = state.dirty = false;
    if (!view.options.measure && state.governor.sample(interval)) {
        view.scale = state.governor.scale;
        view.resize();
    }
    view.draw(state.shown, state.clock, shiftOf(view, state));
}

function listen(view, story, state) {
    const { wake } = state;
    new IntersectionObserver(([entry]) => {
        state.visible = entry.isIntersecting;
        wake();
    }).observe(document.querySelector('.stage canvas'));
    document.addEventListener('visibilitychange', wake);
    addEventListener('scroll', () => {
        fadeCards(story);
        wake();
    }, { passive: true });
    // A resize that changes the canvas clears it, so it's drawn again in the same task, before the
    // browser can show it empty.
    addEventListener('resize', () => {
        state.map = scrollMap(story);
        fadeCards(story);
        if (view.resize()) view.draw(state.shown, state.clock, shiftOf(view, state));
        wake();
    });
    // A change of colour scheme or theme repaints the page's own colours at once, so the drawing
    // takes its new look in the same task rather than a frame behind them.
    const follow = () => {
        view.follow();
        view.draw(state.shown, state.clock, shiftOf(view, state));
        wake();
    };
    view.options.dark.addEventListener('change', follow);
    addEventListener('themechange', follow);
}

/** Draws `view` as `story` scrolls. Answers `redraw()`, for when the desk itself changes. */
export function animate(view, story) {
    const map = scrollMap(story);
    const state = { visible: true, map, shown: map(scrollY), lastScroll: -1, lastBoil: -1, clock: 0, lastTick: 0, last: 0, lastFrame: 0, wokenAt: 0, moved: false, dirty: false, governor: createGovernor() };
    const loop = createLoop((now) => step(view, state, now), {
        rate: () => (boiling(view, state, performance.now()) ? view.sketch.idleRate : 0),
        live: () => state.visible && !document.hidden,
    });
    // Each wake from outside starts the boil's time again; the loop's own boil ticks don't.
    state.wake = () => {
        state.wokenAt = performance.now();
        loop.wake();
    };
    // Dragging or swiping sideways turns the camera; scrolling eases it back onto the path.
    state.pan = view.pan = createPan(story, () => {
        state.moved = true;
        state.wake();
    });
    listen(view, story, state);
    view.options.reduced.addEventListener('change', state.wake);
    state.wake();
    return () => {
        state.dirty = true;
        state.wake();
    };
}
