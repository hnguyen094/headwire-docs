// The sketch look: every mesh draws into two 8-bit targets in one pass (shade and kind, then
// normal and depth), and a full-screen pass turns those into wobbly ink outlines, hatching by
// tone and a paper grain. Screens keep their real picture, printed onto the paper.
import * as THREE from 'three';
import { geometryVertex, geometryFragment, postVertex, postFragment } from './sketch-shaders.js';
import { linesMaterial, setLinesScheme, createSmoothing } from './lines.js';
import { createLayers } from './layers.js';

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

/** A material for the room behind the desk: a solid of `tone`, which Standard draws as backdrop. */
export function backdrop(tone) {
    const material = solid(tone);
    material.uniforms.kind.value = 2;
    return material;
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
 * Sketch theme and the page's (themes.css). `screenInk` is the darkest a screen's picture prints;
 * `night` turns screens to glow and the hatching to lighter chalk. The day colours are the ones
 * the drawing has always shown, the page's paper (f6f1e4) and ink (2a2b38) taken as linear.
 */
export const palettes = {
    light: { ink: 0x06060a, paper: 0xebe0c6, screenInk: 0x06060a, night: 0 },
    dark: { ink: 0xe6dfcc, paper: 0x1c1c21, screenInk: 0x16161a, night: 1 },
};

// The full-screen pass that draws the two targets onto the canvas as pencil on paper.
function sketchMaterial(target, grain, layers) {
    return new THREE.RawShaderMaterial({
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
            paperShift: { value: 0 },
            grain: { value: grain ? 1 : 0 },
            far: sharedFar,
            ...layers.uniforms,
        },
        depthTest: false,
        depthWrite: false,
    });
}

// The full-screen pass for each theme: Sketch's pencil, or Standard's line work (lines.js).
// The theme picks which `material` the one full-screen triangle draws with.
function postPass(target, grain, layers) {
    const materials = { sketch: sketchMaterial(target, grain, layers), standard: linesMaterial(target, sharedFar) };
    const triangle = new THREE.BufferGeometry();
    triangle.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    const quad = new THREE.Mesh(triangle, materials.sketch);
    quad.frustumCulled = false;
    const scene = new THREE.Scene();
    scene.add(quad);
    return {
        materials, scene, camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
        get material() { return quad.material; },
        use(theme) { quad.material = materials[theme]; },
    };
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
 * The renderer's passes. `render(scene, camera, boil, shift)` draws a frame, Sketch's paper moved
 * up with the scroll by `shift` CSS pixels (paper.js); `resize(width, height, pixel)` takes the
 * canvas size in device pixels and how many device pixels make a CSS pixel; `setScheme(scheme)`
 * draws the next frame in palettes[scheme], and `setTheme(theme)` in the theme's look, 'sketch' or
 * 'standard'; `idleRate` is how many times a second its lines move while nothing else does: the
 * pencil's boil, or none in Standard, whose drawing holds still. With `grain: false` the paper is
 * plain.
 */
export function createSketch(renderer, { grain = true, scheme = 'light', theme = 'sketch' } = {}) {
    const target = new THREE.WebGLRenderTarget(1, 1, {
        count: 2,
        type: THREE.UnsignedByteType,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        depthBuffer: true,
    });
    target.textures[0].name = 'shade';
    target.textures[1].name = 'data';
    const layers = createLayers(renderer, target);
    const smoothing = createSmoothing(renderer);
    const post = postPass(target, grain, layers);
    const setScheme = (name) => {
        const { ink, paper, screenInk, night } = palettes[name];
        const uniforms = post.materials.sketch.uniforms;
        setLinesScheme(post.materials.standard, name);
        uniforms.ink.value.setHex(ink, THREE.NoColorSpace);
        uniforms.paper.value.setHex(paper, THREE.NoColorSpace);
        uniforms.screenInk.value.setHex(screenInk, THREE.NoColorSpace);
        uniforms.night.value = night;
        layers.setPaper(uniforms.paper.value, night, uniforms.grain.value);
    };
    setScheme(scheme);
    post.use(theme);

    return {
        setScheme,
        setTheme: (name) => post.use(name),
        get idleRate() { return post.material === post.materials.sketch ? 6 : 0; },
        resize(width, height, pixel) {
            target.setSize(width, height);
            layers.resize(width, height, pixel);
            smoothing.resize(width, height);
            for (const { uniforms } of Object.values(post.materials)) {
                uniforms.resolution.value.set(width, height);
                uniforms.pixel.value = pixel;
            }
        },
        render(scene, camera, boil, shift = 0) {
            const { sketch } = post.materials;
            sketch.uniforms.boil.value = boil;
            // The scroll moves Sketch's paper; Standard's ground is plain and has nothing to move.
            sketch.uniforms.paperShift.value = shift;
            sharedFar.value = camera.far;
            const sketching = post.material === sketch;
            if (sketching) layers.update(shift, boil);
            renderer.setRenderTarget(target);
            renderer.setClearColor(0x000000, 0);
            renderer.clear(true, true, false);
            // The background clears to depth 0, so every silhouette reads as a jump in depth.
            renderer.render(scene, camera);
            if (sketching) layers.drawEdges(camera.far);
            // Standard's line work goes into a target of its own, and onto the canvas smoothed.
            renderer.setRenderTarget(sketching ? null : smoothing.target);
            renderer.render(post.scene, post.camera);
            if (!sketching) smoothing.draw();
        },
        /** Of the last frame's drawn pixels, the share at the farthest depth the sketch packs. */
        saturatedDepth: () => saturatedDepth(renderer, target),
        /** The last frame's background offset: Sketch's paper, in CSS pixels. */
        backgroundOffsets: () => ({ paper: post.materials.sketch.uniforms.paperShift.value }),
    };
}
