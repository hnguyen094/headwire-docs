// Drawing as the page scrolls: the camera follows the scroll a moment behind, a drag turns it,
// and the pencil lines boil six times a second for BOIL_FOR after the last thing that woke the
// drawing. Frames run only while something moves or the lines boil (loop.js), and fewer pixels are
// drawn while that makes slow frames quicker (governor.js).
import { createLoop } from './loop.js';
import { createGovernor } from './governor.js';
import { scrollMap, fadeCards } from './scroll.js';
import { createPan } from './pan.js';

// How quickly the camera catches up with the scroll: about 95% in a third of a second, so a
// mouse wheel's steps become one continuous move.
const FOLLOW = 0.11;
const BOIL = 6;
// How long the lines keep boiling after the last scroll, pan, resize, return to the page or change
// to the desk, in milliseconds. Then the drawing rests on its last frame and asks for none until
// the next.
const BOIL_FOR = 8000;

// Whether the lines boil at `now`: not with Reduce Motion, nor once BOIL_FOR has passed since the
// drawing was last woken.
function boiling(view, state, now) {
    return !view.options.reduced.matches && now - state.wokenAt < BOIL_FOR;
}

// One animation frame: answers whether something still moves, so the next frame should run.
function step(view, state, now) {
    const reduced = view.options.reduced.matches;
    const boil = boiling(view, state, now) ? Math.floor((now / 1000) * BOIL) : state.lastBoil;
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

function draw(view, state, now) {
    const interval = state.last ? now - state.last : 0;
    if (interval) view.stats.intervals.push(interval);
    state.last = now;
    state.lastScroll = scrollY;
    state.moved = state.dirty = false;
    view.draw(state.shown, now / 1000);
    if (!view.options.measure && state.governor.sample(interval)) {
        view.scale = state.governor.scale;
        view.resize();
    }
}

function listen(story, state) {
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
    addEventListener('resize', () => {
        state.map = scrollMap(story);
        fadeCards(story);
        wake();
    });
}

/** Draws `view` as `story` scrolls. Answers `redraw()`, for when the desk itself changes. */
export function animate(view, story) {
    const map = scrollMap(story);
    const state = { visible: true, map, shown: map(scrollY), lastScroll: -1, lastBoil: -1, last: 0, lastFrame: 0, wokenAt: 0, moved: false, dirty: false, governor: createGovernor() };
    const loop = createLoop((now) => step(view, state, now), {
        rate: () => (boiling(view, state, performance.now()) ? BOIL : 0),
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
    listen(story, state);
    view.options.reduced.addEventListener('change', state.wake);
    state.wake();
    return () => {
        state.dirty = true;
        state.wake();
    };
}
