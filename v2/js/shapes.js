// The plain shapes the drawn desk is built from (scene.js, devices.js), in metres, and their tones.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { solid, screen } from './sketch.js';

export const tones = { desk: 0.93, wall: 1.12, metal: 0.86, dark: 0.3, key: 0.8, paper: 0.99, mug: 0.95 };

// A rounded box [w, h, d, corner radius] of `tone`.
export function box([w, h, d, r = 0.004], tone) {
    const radius = Math.min(r, w / 2.01, h / 2.01, d / 2.01);
    return new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, radius), solid(tone));
}

export function place(mesh, [x, y, z], [rx, ry, rz] = [0, 0, 0]) {
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    return mesh;
}

export function screenPlane(w, h, texture) {
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), screen(texture));
}
