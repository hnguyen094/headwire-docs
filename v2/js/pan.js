// Looking around: drag with a mouse or a finger, or swipe sideways with two fingers on a trackpad,
// and the camera turns about what it is looking at, within bounds. Scrolling the page eases it
// back onto the scroll's path. A finger swiping up or down still scrolls the page: the story's
// touch-action leaves vertical swipes to the browser, so only sideways drags reach here.
import * as THREE from 'three';

const YAW = 0.6, PITCH = 0.28;
// How quickly the camera settles back on the path once the page scrolls: about 95% in 0.9 s.
const SETTLE = 0.3;

/** Starts listening on `surface`; `wake()` is called whenever the view needs drawing. */
export function createPan(surface, wake) {
    let yaw = 0, pitch = 0, dragging = null, returning = false;

    const clamp = () => {
        yaw = THREE.MathUtils.clamp(yaw, -YAW, YAW);
        pitch = THREE.MathUtils.clamp(pitch, -PITCH, PITCH);
    };
    surface.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || event.target.closest('a, button, .card')) return;
        dragging = { id: event.pointerId, x: event.clientX, y: event.clientY };
        returning = false;
        surface.setPointerCapture(event.pointerId);
        document.documentElement.classList.add('panning');
        if (event.pointerType === 'mouse') event.preventDefault();
    });
    surface.addEventListener('pointermove', (event) => {
        if (!dragging || event.pointerId !== dragging.id) return;
        yaw -= (event.clientX - dragging.x) * 0.005;
        pitch += (event.clientY - dragging.y) * (event.pointerType === 'mouse' ? 0.004 : 0);
        dragging.x = event.clientX;
        dragging.y = event.clientY;
        clamp();
        wake();
    });
    const end = (event) => {
        if (!dragging || event.pointerId !== dragging.id) return;
        dragging = null;
        document.documentElement.classList.remove('panning');
    };
    surface.addEventListener('pointerup', end);
    surface.addEventListener('pointercancel', end);
    // A two-finger sideways swipe on a trackpad arrives as a wheel event across; up and down is
    // left to scroll the page.
    surface.addEventListener('wheel', (event) => {
        if (event.ctrlKey || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
        yaw += event.deltaX * 0.003;
        returning = false;
        clamp();
        wake();
    }, { passive: true });
    addEventListener('scroll', () => {
        if (!dragging && (yaw || pitch)) returning = true;
    }, { passive: true });

    return {
        /** Whether the view is still moving on its own. */
        get settling() {
            return returning;
        },
        /** Eases back towards the path by `dt` seconds' worth while returning. */
        step(dt) {
            if (!returning) return;
            const k = 1 - Math.exp(-dt / SETTLE);
            yaw -= yaw * k;
            pitch -= pitch * k;
            if (Math.abs(yaw) < 0.002 && Math.abs(pitch) < 0.002) {
                yaw = pitch = 0;
                returning = false;
            }
        },
        /** Turns `camera`, posed on the path, about `target` by the pan. */
        apply(camera, target) {
            if (!yaw && !pitch) return;
            const offset = camera.position.clone().sub(target);
            offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
            const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), offset).normalize();
            offset.applyAxisAngle(right, -pitch);
            camera.position.copy(target).add(offset);
            camera.lookAt(target);
        },
        /** Pans by (yaw, pitch) at once, for recordings. */
        nudge(dYaw, dPitch) {
            yaw += dYaw;
            pitch += dPitch;
            clamp();
            wake();
        },
    };
}
