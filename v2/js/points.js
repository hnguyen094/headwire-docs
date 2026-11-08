// The shape of a cloud of points: the plane it lies nearest, and the way it is longest.
import * as THREE from 'three';

/** The plane through a cloud of points: its centre, and the normal along which it is thinnest. */
export function plane(points) {
    const c = points.reduce((sum, p) => sum.add(p), new THREE.Vector3()).divideScalar(points.length);
    const m = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (const p of points) {
        const d = [p.x - c.x, p.y - c.y, p.z - c.z];
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m[i][j] += d[i] * d[j];
    }
    // The smallest eigenvector, by power iteration on (trace - M), whose largest it is.
    const trace = m[0][0] + m[1][1] + m[2][2];
    let v = new THREE.Vector3(0.3, 0.5, 0.8);
    for (let k = 0; k < 64; k++) {
        const w = new THREE.Vector3(
            trace * v.x - (m[0][0] * v.x + m[0][1] * v.y + m[0][2] * v.z),
            trace * v.y - (m[1][0] * v.x + m[1][1] * v.y + m[1][2] * v.z),
            trace * v.z - (m[2][0] * v.x + m[2][1] * v.y + m[2][2] * v.z),
        );
        v = w.normalize();
    }
    return { centre: c, normal: v };
}

/** The direction a cloud of points is longest in, and its centre. */
export function longest(points) {
    const box = new THREE.Box3().setFromPoints(points);
    const size = box.getSize(new THREE.Vector3());
    const axis = size.x >= size.y && size.x >= size.z ? 'x' : size.y >= size.z ? 'y' : 'z';
    return { centre: box.getCenter(new THREE.Vector3()), direction: new THREE.Vector3()[`set${axis.toUpperCase()}`](1) };
}
