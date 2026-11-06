// The camera's walk across the desk. A shot is where the camera looks, from which side, and how
// much it must fit; the timeline runs 0 to 1 through the shots on one smooth curve, without
// stopping at any of them.
import * as THREE from 'three';
import { timeline } from './timeline.js';

const up = new THREE.Vector3(0, 1, 0);

function facing(mesh) {
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(mesh.getWorldQuaternion(new THREE.Quaternion()));
    return normal.normalize();
}

function centre(...meshes) {
    const box = new THREE.Box3();
    for (const mesh of meshes) box.expandByObject(mesh);
    return box.getCenter(new THREE.Vector3());
}

/** The shots, made from where the screens are. */
export function makeShots(screens) {
    const mac = centre(screens.mac);
    const devices = centre(screens.ipad, screens.iphone);
    const towards = facing(screens.ipad).add(facing(screens.iphone)).normalize();
    return {
        desk: { target: new THREE.Vector3(-0.22, -0.02, 0.02), from: new THREE.Vector3(-0.3, 0.55, 1), fit: [2.35, 1.0] },
        mac: { target: mac, from: facing(screens.mac).add(new THREE.Vector3(0, 0.06, 0)), fit: [0.6, 0.34] },
        across: { target: new THREE.Vector3(0.3, 0.1, 0.0), from: new THREE.Vector3(0.1, 0.45, 1), fit: [0.75, 0.42] },
        devices: { target: devices, from: towards.clone().add(new THREE.Vector3(0, 0.28, 0)), fit: [0.62, 0.3] },
        wide: { target: new THREE.Vector3(-0.12, -0.02, 0), from: new THREE.Vector3(0.45, 0.6, 1), fit: [2.45, 1.0] },
    };
}

/**
 * Puts `camera` at timeline position t (0 to 1) for its aspect, and answers the point it looks
 * at. `room` is the share of the view the copy covers: { x, y } moves the subject right or up by
 * that fraction.
 */
export function poseCamera(camera, shots, t, room) {
    const poses = timeline.map(([, name]) => pose(shots[name], camera, room));
    const at = Math.min(Math.max(t, 0), 1);
    let i = 0;
    while (i < timeline.length - 2 && at > timeline[i + 1][0]) i++;
    const [t0] = timeline[i], [t1] = timeline[i + 1];
    // Evenly paced through each stretch, and the keys evenly spaced, so the curve's speed carries
    // on smoothly through every shot.
    const u = t1 > t0 ? (at - t0) / (t1 - t0) : 0;
    const pick = (k) => poses[Math.min(Math.max(k, 0), poses.length - 1)];
    const position = catmull(pick(i - 1).position, pick(i).position, pick(i + 1).position, pick(i + 2).position, u);
    const target = catmull(pick(i - 1).target, pick(i).target, pick(i + 1).target, pick(i + 2).target, u);
    place(camera, { position, target }, room);
    return target;
}

function place(camera, { position, target }, room) {
    camera.position.copy(position);
    camera.up.copy(up);
    camera.lookAt(target);
    const width = camera.userData.width ?? 1, height = camera.userData.height ?? 1;
    camera.setViewOffset(width, height, -room.x * width, room.y * height, width, height);
    camera.updateProjectionMatrix();
}

function pose(shot, camera, room) {
    const fov = THREE.MathUtils.degToRad(camera.fov);
    // A tall screen crops the sides of a wide shot rather than shrinking it to fit.
    const w = shot.fit[0] * (camera.aspect < 1 ? 0.72 : 1), h = shot.fit[1];
    const tan = Math.tan(fov / 2);
    const distance = Math.max(h / 2 / tan, w / 2 / (tan * camera.aspect)) * 1.08 / (1 - 2 * Math.max(room.x, room.y));
    const direction = shot.from.clone().normalize();
    return { target: shot.target, position: shot.target.clone().addScaledVector(direction, distance) };
}

function catmull(p0, p1, p2, p3, u) {
    const out = new THREE.Vector3();
    for (const axis of ['x', 'y', 'z']) {
        const a = p0[axis], b = p1[axis], c = p2[axis], d = p3[axis];
        out[axis] = 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
    }
    return out;
}
