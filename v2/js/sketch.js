// The sketch look: every mesh draws into two 8-bit targets in one pass (shade and kind, then
// normal and depth), and a full-screen pass turns those into wobbly ink outlines, hatching by
// tone and a paper grain. Screens keep their real picture, printed onto the paper.
import * as THREE from 'three';
import { geometryVertex, geometryFragment, postVertex, postFragment } from './sketch-shaders.js';

/** A mesh material for the sketch: `tone` is how light its surface is, 0 to 1. */
export function solid(tone) {
    return new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: geometryVertex,
        fragmentShader: geometryFragment,
        uniforms: {
            tone: { value: tone },
            kind: { value: 0 },
            map: { value: null },
            uvTransform: { value: new THREE.Matrix3() },
            lightDir: sharedLight,
            far: sharedFar,
        },
        side: THREE.DoubleSide,
    });
}

/** A screen's material: its picture, shown as it is, with no hatching. */
export function screen(texture) {
    const material = solid(1);
    material.uniforms.kind.value = 1;
    material.uniforms.map.value = texture;
    // A model's display maps the picture through its own UVs (props.js sets the texture's matrix).
    material.uniforms.uvTransform.value = texture.matrix;
    // A display lies flush with the dark glass behind it in Apple's files; pulled a little towards
    // the camera in depth, the picture stays in front even from across the room.
    material.polygonOffset = true;
    material.polygonOffsetFactor = -1;
    material.polygonOffsetUnits = -4;
    return material;
}

const sharedLight = { value: new THREE.Vector3(-0.45, 1.0, 0.65) };
// The camera's far plane, which every mesh packs its depth against and the outlines unpack it by.
const sharedFar = { value: 8 };

/**
 * The drawing's colours by colour scheme, as they reach the canvas (the pass writes them
 * unconverted): pencil on warm paper by day, and by night warm chalk on graphite paper, the app's
 * Sketch theme and the page's (v2.css). `screenInk` is the darkest a screen's picture prints;
 * `night` turns screens to glow and the hatching to lighter chalk. The day colours are the ones
 * the drawing has always shown, the page's paper (f6f1e4) and ink (2a2b38) taken as linear.
 */
export const palettes = {
    light: { ink: 0x06060a, paper: 0xebe0c6, screenInk: 0x06060a, night: 0 },
    dark: { ink: 0xe6dfcc, paper: 0x1c1c21, screenInk: 0x16161a, night: 1 },
};

// The full-screen pass that draws the two targets onto the canvas as pencil on paper.
function postPass(target, grain) {
    const material = new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: postVertex,
        fragmentShader: postFragment,
        uniforms: {
            tShade: { value: target.textures[0] },
            tData: { value: target.textures[1] },
            resolution: { value: new THREE.Vector2(1, 1) },
            pixel: { value: 1 },
            boil: { value: 0 },
            ink: { value: new THREE.Color() },
            paper: { value: new THREE.Color() },
            screenInk: { value: new THREE.Color() },
            night: { value: 0 },
            grain: { value: grain ? 1 : 0 },
            far: sharedFar,
        },
        depthTest: false,
        depthWrite: false,
    });
    const triangle = new THREE.BufferGeometry();
    triangle.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    const quad = new THREE.Mesh(triangle, material);
    quad.frustumCulled = false;
    const scene = new THREE.Scene();
    scene.add(quad);
    return { material, scene, camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
}

// The share of drawn pixels whose depth is the farthest the 16 bits hold, so the outlines there
// can't see one surface behind another.
function saturatedDepth(renderer, target) {
    const { width, height } = target;
    const data = new Uint8Array(width * height * 4);
    renderer.readRenderTargetPixels(target, 0, 0, width, height, data, undefined, 1);
    let drawn = 0, saturated = 0;
    for (let i = 0; i < data.length; i += 4) {
        const depth = data[i + 2] * 256 + data[i + 3];
        if (depth) drawn++;
        if (depth === 65535) saturated++;
    }
    return drawn ? saturated / drawn : 0;
}

/**
 * The renderer's passes. `render(scene, camera, boil)` draws a frame; `resize(width, height,
 * pixel)` takes the canvas size in device pixels and how many device pixels make a CSS pixel;
 * `setScheme(scheme)` draws the next frame in palettes[scheme]. With `grain: false` the paper is
 * plain.
 */
export function createSketch(renderer, { grain = true, scheme = 'light' } = {}) {
    const target = new THREE.WebGLRenderTarget(1, 1, {
        count: 2,
        type: THREE.UnsignedByteType,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        depthBuffer: true,
    });
    target.textures[0].name = 'shade';
    target.textures[1].name = 'data';
    const post = postPass(target, grain);
    const setScheme = (name) => {
        const { ink, paper, screenInk, night } = palettes[name];
        const uniforms = post.material.uniforms;
        uniforms.ink.value.setHex(ink, THREE.NoColorSpace);
        uniforms.paper.value.setHex(paper, THREE.NoColorSpace);
        uniforms.screenInk.value.setHex(screenInk, THREE.NoColorSpace);
        uniforms.night.value = night;
    };
    setScheme(scheme);

    return {
        setScheme,
        resize(width, height, pixel) {
            target.setSize(width, height);
            post.material.uniforms.resolution.value.set(width, height);
            post.material.uniforms.pixel.value = pixel;
        },
        render(scene, camera, boil) {
            post.material.uniforms.boil.value = boil;
            sharedFar.value = camera.far;
            renderer.setRenderTarget(target);
            renderer.setClearColor(0x000000, 0);
            renderer.clear(true, true, false);
            // The background clears to depth 0, so every silhouette reads as a jump in depth.
            renderer.render(scene, camera);
            renderer.setRenderTarget(null);
            renderer.render(post.scene, post.camera);
        },
        /** Of the last frame's drawn pixels, the share at the farthest depth the sketch packs. */
        saturatedDepth: () => saturatedDepth(renderer, target),
    };
}
