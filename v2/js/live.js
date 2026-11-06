// The live drawing: three.js draws the desk each frame as the page scrolls.
import * as THREE from 'three';
import { createSketch } from './sketch.js';
import { screenPictures } from './screens.js';
import { buildDesk } from './scene.js';
import { makeShots, poseCamera } from './path.js';
import { timeline } from './timeline.js';
import { scrollMap, fadeCards } from './scroll.js';
import { createPan } from './pan.js';

const params = new URLSearchParams(location.search);
const capture = params.has('capture');
// With ?measure, each frame waits for the GPU to finish, so its time is the whole frame's.
const measure = params.has('measure');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
// With ?capture&orbit=degrees, review stills look from that far round the subject (180: behind,
// with the wall left out so the camera can stand there).
const orbit = THREE.MathUtils.degToRad(Number(params.get('orbit') ?? 0));

// The copy's share of the view, so the subject sits beside it on a wide screen and above it on
// a tall one.
function room(width, height) {
    return width >= height ? { x: 0.17, y: 0 } : { x: 0, y: 0.16 };
}

// How quickly the camera catches up with the scroll: about 95% in a third of a second, so a
// mouse wheel's steps become one continuous move.
const FOLLOW = 0.11;

let lastScroll = -1;

export async function start() {
    const root = document.documentElement;
    const canvas = document.querySelector('.stage canvas');
    const story = document.querySelector('.story');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: capture });
    const sketch = createSketch(renderer);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.02, 8);
    const pictures = await screenPictures();
    const screens = buildDesk(scene, pictures);
    // Apple's models take the drawn devices' places as they arrive; until then, and for good if
    // they fail or take too long, the page draws the drawn ones. ?props=drawn keeps the drawn ones.
    let shots = makeShots(screens);
    let redraw = () => {};
    const models = (params.get('props') === 'drawn' ? Promise.resolve(0) : import('./props.js').then(({ swapProps }) => swapProps(scene, screens, pictures)))
        .catch((error) => {
            console.warn(error);
            return 0;
        })
        .then((placed) => {
            if (placed) shots = makeShots(screens);
            if (window.v2) window.v2.modelsReady = true;
            lastScroll = -1;
            redraw();
            return placed;
        });
    if (capture) await models;
    if (capture && Math.abs(orbit) > Math.PI / 2) screens.wall.visible = false;

    let scale = 1;
    let width = 0, height = 0;
    function resize() {
        const cssW = canvas.clientWidth, cssH = canvas.clientHeight;
        const pixel = Math.min(devicePixelRatio || 1, cssW < 700 ? 2 : 1.5) * scale;
        width = Math.max(1, Math.round(cssW * pixel));
        height = Math.max(1, Math.round(cssH * pixel));
        renderer.setPixelRatio(1);
        renderer.setSize(width, height, false);
        sketch.resize(width, height, pixel);
        camera.aspect = width / height;
        camera.userData.width = width;
        camera.userData.height = height;
    }

    const stats = { frames: 0, cpu: [], intervals: [], scale: 1, width: 0, height: 0 };
    let pan = null;
    function draw(t, time) {
        const began = performance.now();
        const target = poseCamera(camera, shots, t, room(width, height));
        pan?.apply(camera, target);
        if (orbit) {
            camera.position.sub(target).applyAxisAngle(new THREE.Vector3(0, 1, 0), orbit).add(target);
            camera.lookAt(target);
        }
        sketch.render(scene, camera, reduced.matches ? 0 : Math.floor(time * 6) % 97);
        if (measure) renderer.getContext().finish();
        stats.cpu.push(performance.now() - began);
        stats.frames++;
    }

    root.classList.add('live');
    resize();
    let map = scrollMap(story);
    fadeCards(story);
    addEventListener('resize', () => {
        resize();
        map = scrollMap(story);
        fadeCards(story);
        wake();
    });

    window.v2 = {
        modelsReady: capture,
        /** Draws timeline position t at boil time `time`, for the stills. */
        renderAt(t, time = 0) {
            draw(t, time);
            renderer.getContext().finish();
        },
        stats() {
            const sorted = (list) => [...list].sort((a, b) => a - b);
            const pct = (list, p) => (list.length ? sorted(list)[Math.min(list.length - 1, Math.floor(list.length * p))] : null);
            return {
                frames: stats.frames,
                size: [width, height],
                scale,
                cpuMedian: pct(stats.cpu, 0.5), cpuP95: pct(stats.cpu, 0.95),
                intervalMedian: pct(stats.intervals, 0.5), intervalP95: pct(stats.intervals, 0.95),
            };
        },
        resetStats() {
            stats.cpu = [];
            stats.intervals = [];
            stats.frames = 0;
        },
        timeline,
        /** Pans the camera as a drag would, for the pan recording. */
        pan: (dYaw, dPitch) => pan?.nudge(dYaw, dPitch),
    };
    if (capture) {
        root.classList.add('capture');
        return;
    }

    // Draw while scrolling, and otherwise only six times a second for the boil; stop when the
    // stage is off screen or the tab is hidden.
    let visible = true, last = 0, lastBoil = -1, running = false, slow = 0, moved = false, lastFrame = 0;
    redraw = wake;
    // Dragging or swiping sideways turns the camera; scrolling eases it back onto the path.
    pan = createPan(story, () => {
        moved = true;
        wake();
    });
    new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        wake();
    }).observe(canvas);
    document.addEventListener('visibilitychange', wake);
    addEventListener('scroll', () => {
        fadeCards(story);
        wake();
    }, { passive: true });
    // Where the camera is along the path, following the scroll's position a moment behind.
    let shown = map(scrollY);
    function wake() {
        if (!running && visible && !document.hidden) {
            running = true;
            requestAnimationFrame(frame);
        }
    }
    function frame(now) {
        if (!visible || document.hidden) {
            running = false;
            return;
        }
        const time = now / 1000;
        const boil = reduced.matches ? 0 : Math.floor(time * 6);
        const settling = pan.settling;
        const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0;
        pan.step(dt);
        lastFrame = now;
        const aim = map(scrollY);
        const following = Math.abs(aim - shown) > 0.00005;
        shown = following && !reduced.matches ? shown + (aim - shown) * (1 - Math.exp(-dt / FOLLOW)) : aim;
        if (scrollY !== lastScroll || boil !== lastBoil || moved || settling || following) {
            moved = false;
            const interval = last ? now - last : 0;
            if (interval) stats.intervals.push(interval);
            last = now;
            lastScroll = scrollY;
            lastBoil = boil;
            draw(shown, time);
            // When frames come slower than about 45 a second while scrolling, draw with fewer pixels.
            slow = !measure && interval > 22 && interval < 100 ? slow + 1 : 0;
            if (slow > 8 && scale > 0.6) {
                scale -= 0.15;
                slow = 0;
                resize();
            }
        } else {
            last = 0;
        }
        requestAnimationFrame(frame);
    }
    wake();
}
