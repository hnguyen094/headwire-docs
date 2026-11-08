// Looking around: drag with a mouse or a finger, or swipe sideways with two fingers on a trackpad,
// and the camera turns about what it is looking at, within bounds. Scrolling the page eases it
// back onto the scroll's path. A finger swiping up or down still scrolls the page: the story's
// touch-action leaves vertical swipes and pinches to the browser, so only sideways drags reach
// here (a pinch's first finger starts a drag, which its pointercancel ends).
import * as THREE from 'three';

const YAW = 0.6, PITCH = 0.28;
// How quickly the camera settles back on the path once the page scrolls: about 95% in 0.9 s.
const SETTLE = 0.3;

function clamp(turn) {
    turn.yaw = THREE.MathUtils.clamp(turn.yaw, -YAW, YAW);
    turn.pitch = THREE.MathUtils.clamp(turn.pitch, -PITCH, PITCH);
}

// A drag with a mouse or a finger turns the camera.
function listenForDrags(surface, turn, wake) {
    surface.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || event.target.closest('a, button, .card:not(.gone)')) return;
        turn.dragging = { id: event.pointerId, x: event.clientX, y: event.clientY };
        turn.returning = false;
        surface.setPointerCapture(event.pointerId);
        document.documentElement.classList.add('panning');
        if (event.pointerType === 'mouse') event.preventDefault();
    });
    surface.addEventListener('pointermove', (event) => {
        const { dragging } = turn;
        if (!dragging || event.pointerId !== dragging.id) return;
        turn.yaw -= (event.clientX - dragging.x) * 0.005;
        turn.pitch += (event.clientY - dragging.y) * (event.pointerType === 'mouse' ? 0.004 : 0);
        dragging.x = event.clientX;
        dragging.y = event.clientY;
        clamp(turn);
        wake();
    });
    const end = (event) => {
        if (!turn.dragging || event.pointerId !== turn.dragging.id) return;
        turn.dragging = null;
        document.documentElement.classList.remove('panning');
    };
    surface.addEventListener('pointerup', end);
    surface.addEventListener('pointercancel', end);
}

// A two-finger sideways swipe on a trackpad arrives as a wheel event across, and turns the
// camera; up and down is left to scroll the page, which eases the camera back.
function listenForSwipes(surface, turn, wake) {
    surface.addEventListener('wheel', (event) => {
        if (event.ctrlKey || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
        turn.yaw += event.deltaX * 0.003;
        turn.returning = false;
        clamp(turn);
        wake();
    }, { passive: true });
    addEventListener('scroll', () => {
        if (!turn.dragging && (turn.yaw || turn.pitch)) turn.returning = true;
    }, { passive: true });
}

/** Starts listening on `surface`; `wake()` is called whenever the view needs drawing. */
export function createPan(surface, wake) {
    const turn = { yaw: 0, pitch: 0, dragging: null, returning: false };
    listenForDrags(surface, turn, wake);
    listenForSwipes(surface, turn, wake);

    return {
        /** Whether the view is still moving on its own. */
        get settling() {
            return turn.returning;
        },
        /** Eases back towards the path by `dt` seconds' worth while returning. */
        step(dt) {
            if (!turn.returning) return;
            const k = 1 - Math.exp(-dt / SETTLE);
            turn.yaw -= turn.yaw * k;
            turn.pitch -= turn.pitch * k;
            if (Math.abs(turn.yaw) < 0.002 && Math.abs(turn.pitch) < 0.002) {
                turn.yaw = turn.pitch = 0;
                turn.returning = false;
            }
        },
        /** Turns `camera`, posed on the path, about `target` by the pan. */
        apply(camera, target) {
            if (!turn.yaw && !turn.pitch) return;
            const offset = camera.position.clone().sub(target);
            offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), turn.yaw);
            const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), offset).normalize();
            offset.applyAxisAngle(right, -turn.pitch);
            camera.position.copy(target).add(offset);
            camera.lookAt(target);
        },
        /** Pans by (yaw, pitch) at once, for recordings. */
        nudge(dYaw, dPitch) {
            turn.yaw += dYaw;
            turn.pitch += dPitch;
            clamp(turn);
            wake();
        },
    };
}
