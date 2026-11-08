// Opens a folding phone's model like a small laptop: one half flat with its inner face up, the
// other turned about the hinge to stand open. The halves are the meshes tools/docs/v2-props.sh
// tagged "lower" and "upper", and the spine is the hinge itself, named by the caller. The hinge line comes from the
// meshes: where the halves' planes meet when the model comes part open, between them when it
// comes open flat, and along the spine when it comes closed, as Apple's iPhone Duo does. A mesh
// in no group is left out (the Duo's file carries a wide one that AR Quick Look doesn't draw).
// The meshes tagged "hinge" fold across both halves, as the Duo's inner display does: closed, it
// lies doubled over on itself about the spine. Each is cut in two, a piece for each half.
import * as THREE from 'three';
import { plane, longest } from './points.js';

function hinge(lower, upper, spine) {
    const g = lower.normal.dot(upper.normal);
    const mid = lower.centre.clone().add(upper.centre).multiplyScalar(0.5);
    if (Math.abs(g) > 0.985) {
        // Closed, one half on the other: the hinge is the spine. (The halves' centres don't line up
        // even then: one carries the camera.)
        if (spine) return { point: spine.centre, direction: spine.direction };
        const across = upper.centre.clone().sub(lower.centre);
        across.addScaledVector(lower.normal, -across.dot(lower.normal));
        // Lying open flat: the hinge runs between the halves, across the line joining them.
        return { point: mid, direction: lower.normal.clone().cross(across).normalize() };
    }
    const direction = lower.normal.clone().cross(upper.normal).normalize();
    const hl = lower.normal.dot(lower.centre) - lower.normal.dot(mid);
    const hu = upper.normal.dot(upper.centre) - upper.normal.dot(mid);
    const a = (hl - g * hu) / (1 - g * g), b = (hu - g * hl) / (1 - g * g);
    return { point: mid.addScaledVector(lower.normal, a).addScaledVector(upper.normal, b), direction };
}

// Cuts a mesh doubled over across both halves at its own middle, triangle by triangle: the mesh
// itself keeps the upper half's piece, and a new mesh of the same name, added beside it, carries
// the lower half's.
function cut(mesh, lower) {
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
    const pos = geometry.attributes.position;
    const points = [];
    for (let i = 0; i < pos.count; i++) points.push(new THREE.Vector3().fromBufferAttribute(pos, i));
    const middle = plane(points);
    if (middle.normal.dot(lower.centre.clone().sub(middle.centre)) < 0) middle.normal.negate();
    const keep = { lower: [], upper: [] };
    for (let i = 0; i < pos.count; i += 3) {
        const centre = points[i].clone().add(points[i + 1]).add(points[i + 2]).divideScalar(3);
        keep[middle.normal.dot(centre.sub(middle.centre)) > 0 ? 'lower' : 'upper'].push(i, i + 1, i + 2);
    }
    if (!keep.lower.length || !keep.upper.length) return null;
    const piece = (indices) => {
        const part = new THREE.BufferGeometry();
        for (const [name, attribute] of Object.entries(geometry.attributes)) {
            const size = attribute.itemSize, values = new attribute.array.constructor(indices.length * size);
            indices.forEach((index, k) => {
                for (let j = 0; j < size; j++) values[k * size + j] = attribute.array[index * size + j];
            });
            part.setAttribute(name, new THREE.BufferAttribute(values, size, attribute.normalized));
        }
        return part;
    };
    mesh.geometry = piece(keep.upper);
    mesh.userData.half = 'upper';
    const other = new THREE.Mesh(piece(keep.lower), mesh.material);
    other.name = mesh.name;
    other.userData = { ...mesh.userData, half: 'lower' };
    mesh.parent.add(other);
    return other;
}

function away(centre, { point, direction }) {
    const q = centre.clone().sub(point);
    return q.addScaledVector(direction, -q.dot(direction)).normalize();
}

// Bakes every mesh's place into its geometry, in the model's own frame, and tags its half:
// 'spine', or the group v2-props.sh gave it.
function flatten(model, spine, groupOf) {
    model.updateMatrixWorld(true);
    const meshes = [];
    model.traverse((node) => node.isMesh && meshes.push(node));
    for (const mesh of meshes) {
        mesh.geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
        mesh.userData.half = mesh.name === spine || mesh.parent?.name === spine ? 'spine' : groupOf(mesh);
    }
    for (const mesh of meshes) {
        model.add(mesh);
        mesh.position.set(0, 0, 0);
        mesh.quaternion.identity();
        mesh.scale.set(1, 1, 1);
    }
    return meshes;
}

// The first corner of each triangle of the meshes on `half`.
function cloud(meshes, half) {
    return meshes.filter((m) => m.userData.half === half).flatMap((m) => {
        const pos = m.geometry.attributes.position;
        const points = [];
        for (let i = 0; i < pos.count; i += 3) points.push(new THREE.Vector3().fromBufferAttribute(pos, i));
        return points;
    });
}

// The turn that lays the hinge along x, the lower half's inner face up y and the lower half
// towards the viewer (+z), and the turn about x that then opens the upper half to `degrees`.
function pose({ lower, upper, line }, degrees) {
    const outL = away(lower.centre, line), outU = away(upper.centre, line);
    // The lower half's inner face is the side the upper half lies or rises on.
    const toUpper = upper.centre.clone().sub(lower.centre).dot(lower.normal);
    const side = Math.abs(toUpper) > 0.001 ? toUpper : lower.normal.dot(outU);
    const inner = lower.normal.clone().multiplyScalar(side < 0 ? -1 : 1);
    const along = line.direction.clone();
    if (along.clone().cross(inner).dot(outL) < 0) along.negate();
    const depth = along.clone().cross(inner).normalize();
    const turn = new THREE.Matrix4().makeBasis(along, inner, depth).transpose();
    const risen = outU.clone().applyMatrix4(turn);
    const open = new THREE.Matrix4().makeRotationX(Math.atan2(risen.y, risen.z) - THREE.MathUtils.degToRad(degrees));
    return { turn, open };
}

// Moves every vertex about the hinge `line` by `turn`, and the upper half's on by `open`.
function bend(meshes, line, { turn, open }) {
    const v = new THREE.Vector3(), n = new THREE.Vector3();
    for (const mesh of meshes) {
        const pos = mesh.geometry.attributes.position, nor = mesh.geometry.attributes.normal;
        const isUpper = mesh.userData.half === 'upper';
        for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i).sub(line.point).applyMatrix4(turn);
            if (isUpper) v.applyMatrix4(open);
            pos.setXYZ(i, v.x, v.y, v.z);
            if (!nor) continue;
            n.fromBufferAttribute(nor, i).transformDirection(turn);
            if (isUpper) n.transformDirection(open);
            nor.setXYZ(i, n.x, n.y, n.z);
        }
        pos.needsUpdate = true;
        if (nor) nor.needsUpdate = true;
        mesh.geometry.computeBoundingBox();
        mesh.geometry.computeBoundingSphere();
    }
}

/**
 * Opens `model` to `degrees` between its halves, in place, about the mesh named `spine`.
 * `groupOf(mesh)` names a mesh's half. Answers `(mesh) => whether it is on the upper half`.
 */
export function foldOpen(model, { degrees, spine }, groupOf) {
    const meshes = flatten(model, spine, groupOf);
    const lowerPoints = cloud(meshes, 'lower'), upperPoints = cloud(meshes, 'upper'), spinePoints = cloud(meshes, 'spine');
    if (lowerPoints.length < 3 || upperPoints.length < 3) return () => true;
    for (const mesh of meshes) if (!mesh.userData.half) mesh.visible = false;
    const lower = plane(lowerPoints), upper = plane(upperPoints);
    for (const mesh of meshes.filter((m) => m.userData.half === 'hinge')) {
        const other = cut(mesh, lower);
        if (other) meshes.push(other);
        else mesh.userData.half = 'upper';
    }
    const line = hinge(lower, upper, spinePoints.length >= 3 ? longest(spinePoints) : null);
    bend(meshes, line, pose({ lower, upper, line }, degrees));
    model.updateMatrixWorld(true);
    return (mesh) => mesh.userData.half === 'upper';
}
