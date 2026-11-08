// A model's display: finding it in Apple's file, and showing a screen's picture on it.
import * as THREE from 'three';
import { screen } from './sketch.js';
import { plane } from './points.js';

const up = new THREE.Vector3(0, 1, 0);

// The largest mesh that showed a screen-shaped picture in Apple's file (v2-props.py marks them
// with the picture's aspect).
function largestLit(model) {
    let best = null, area = 0;
    model.traverse((node) => {
        const aspect = node.userData?.screen ?? node.parent?.userData?.screen;
        if (!node.isMesh || !aspect || Math.abs(aspect - 1) < 0.05) return;
        const size = new THREE.Box3().setFromObject(node).getSize(new THREE.Vector3());
        const [a, b] = [size.x, size.y, size.z].sort((x, y) => y - x);
        if (a * b > area) {
            area = a * b;
            best = node;
        }
    });
    return best;
}

/** The mesh called `name` that `where` keeps, or with 'lit', the largest that showed a picture. */
export function named(model, name, where = () => true) {
    if (name === 'lit') return largestLit(model);
    let found = null;
    model.traverse((node) => {
        if (!found && node.isMesh && (node.name === name || node.parent?.name === name) && where(node)) found = node;
    });
    return found;
}

// The display's vertices in the world.
function surface(mesh) {
    mesh.updateMatrixWorld(true);
    const pos = mesh.geometry.attributes.position;
    const points = [];
    for (let i = 0; i < pos.count; i++) points.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld));
    return points;
}

/**
 * Shows `picture(aspect)`, a texture, on the display, filling it exactly: each vertex gets new
 * UVs from where it sits on the screen's face, left to right and bottom to top, so the picture
 * spans the display's own outline, upright, at its own aspect, whatever UVs Apple's file gave it.
 * `facing.normal` is the way the screen faces; `facing.top` is the way the picture's top faces on
 * a screen lying flat, and standing screens use up.
 */
export function showOn(mesh, picture, { normal: facing, top = up }) {
    const points = surface(mesh);
    if (points.length < 3) return null;
    const { centre, normal } = plane(points);
    if (normal.dot(facing) < 0) normal.negate();
    const upward = top.clone().addScaledVector(normal, -normal.dot(top)).normalize();
    const right = upward.clone().cross(normal).normalize();
    const xs = points.map((p) => p.clone().sub(centre).dot(right));
    const ys = points.map((p) => p.clone().sub(centre).dot(upward));
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const w = x1 - x0, h = y1 - y0;
    const uv = new Float32Array(points.length * 2);
    points.forEach((p, i) => {
        uv[i * 2] = (xs[i] - x0) / w;
        uv[i * 2 + 1] = (ys[i] - y0) / h;
    });
    mesh.geometry = mesh.geometry.clone();
    mesh.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    mesh.material = screen(picture(w / h));
    return { centre, normal, upward, size: Math.max(w, h) };
}

/** Moves the drawn screen plane, which the camera frames, onto the model's display, and hides it. */
export function proxy(shown, { centre, normal, upward }) {
    const basis = new THREE.Matrix4().makeBasis(upward.clone().cross(normal).normalize(), upward, normal);
    const world = new THREE.Quaternion().setFromRotationMatrix(basis);
    const parent = shown.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    shown.quaternion.copy(parent.multiply(world));
    shown.position.copy(shown.parent.worldToLocal(centre.clone()));
    shown.visible = false;
}
