// The drawing's view: the renderer, the desk and the camera, and drawing one frame of them at a
// point on the timeline.
import * as THREE from 'three';
import { createSketch } from './sketch.js';
import { screenPictures } from './screens.js';
import { buildDesk } from './scene.js';
import { makeShots, poseCamera } from './path.js';

// The copy's share of the view, so the subject sits beside it on a wide screen and above it on
// a tall one.
function room(width, height) {
    return width >= height ? { x: 0.17, y: 0 } : { x: 0, y: 0.16 };
}

// Follows the canvas's size and the view's scale, answering whether the drawing buffer changed.
// Writing a canvas's size clears it, even to the size it has, so a size it already has is left
// alone: Safari's toolbars fire a resize at every change of direction while the canvas, sized in
// svh, stays put.
function resize(view) {
    const { renderer, camera } = view;
    const canvas = renderer.domElement;
    const cssW = canvas.clientWidth, cssH = canvas.clientHeight;
    const pixel = Math.min(devicePixelRatio || 1, cssW < 700 ? 2 : 1.5) * view.scale;
    const width = Math.max(1, Math.round(cssW * pixel));
    const height = Math.max(1, Math.round(cssH * pixel));
    if (width === view.width && height === view.height && pixel === view.pixel) return false;
    Object.assign(view, { width, height, pixel });
    renderer.setPixelRatio(1);
    renderer.setSize(view.width, view.height, false);
    view.sketch.resize(view.width, view.height, pixel);
    camera.aspect = view.width / view.height;
    camera.userData.width = view.width;
    camera.userData.height = view.height;
    camera.userData.room = room(view.width, view.height);
    return true;
}

function draw(view, t, time) {
    const { camera, options, renderer, stats } = view;
    const began = performance.now();
    const target = poseCamera(camera, view.shots, t);
    view.pan?.apply(camera, target);
    if (options.orbit) {
        camera.position.sub(target).applyAxisAngle(new THREE.Vector3(0, 1, 0), options.orbit).add(target);
        camera.lookAt(target);
    }
    renderer.info.reset();
    view.sketch.render(view.scene, camera, options.reduced.matches ? 0 : Math.floor(time * 6) % 97);
    renderer.domElement.classList.add('drawn');
    if (options.measure) renderer.getContext().finish();
    stats.cpu.push(performance.now() - began);
    stats.frames++;
}

/**
 * Builds the renderer and the desk on `canvas`. `options`: `capture` keeps each frame for
 * screenshots, `measure` waits for the GPU at the end of each frame, `orbit` turns the camera
 * that many radians round the subject, and `reduced` is the Reduce Motion query. The view's
 * `draw(t, time)` draws timeline position t at boil time `time` in seconds; `resize()` follows
 * the canvas's size and `scale`, the share of pixels drawn, and answers whether that cleared the
 * canvas, which must then be drawn again before the frame ends.
 */
export async function createView(canvas, options) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: options.capture });
    // Counted per frame, both passes together, for the stats.
    renderer.info.autoReset = false;
    const scene = new THREE.Scene();
    const pictures = await screenPictures();
    const screens = buildDesk(scene, pictures);
    const view = {
        renderer, scene, pictures, screens, options,
        sketch: createSketch(renderer),
        camera: new THREE.PerspectiveCamera(34, 1, 0.02, 8),
        shots: makeShots(screens),
        pan: null,
        scale: 1, width: 0, height: 0, pixel: 0,
        stats: { frames: 0, cpu: [], intervals: [] },
    };
    view.resize = () => resize(view);
    view.draw = (t, time) => draw(view, t, time);
    view.resize();
    return view;
}
