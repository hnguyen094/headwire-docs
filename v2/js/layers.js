// Sketch's cached layers (layer-shaders.js), so the full-screen pass reads its grain, hatching and
// wobble rather than working each out every frame: the paper, a strip twice the screen's height
// drawn again only when the scroll carries the screen out of it or its colours change, and the
// boil, drawn again only when the boil ticks; and the edges, drawn each frame from the geometry
// pass's targets at a CSS pixel's resolution and read with linear filtering.
import * as THREE from 'three';
import { postVertex } from './sketch-shaders.js';
import { paperFragment, boilFragment, edgeFragment } from './layer-shaders.js';

const flat = { type: THREE.UnsignedByteType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false };

// A full-screen triangle drawn with `fragmentShader` and `uniforms`.
function pass(fragmentShader, uniforms) {
    const material = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: postVertex, fragmentShader, uniforms, depthTest: false, depthWrite: false });
    const triangle = new THREE.BufferGeometry();
    triangle.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    const mesh = new THREE.Mesh(triangle, material);
    mesh.frustumCulled = false;
    const scene = new THREE.Scene();
    scene.add(mesh);
    return { material, scene };
}

/**
 * The layers for `renderer` over the geometry pass's `target`, and the uniforms the full-screen pass
 * reads them through. `resize` takes the canvas size in device pixels and the device pixels in a
 * CSS pixel; `setPaper` the paper's colour, `night` and `grain`; `update(shift, tick)` draws
 * whichever layer the paper's offset or the boil's tick has made stale; `drawEdges(far)` draws the
 * edges of the geometry just drawn.
 */
export function createLayers(renderer, target) {
    const paper = new THREE.WebGLRenderTarget(1, 1, flat);
    const boil = new THREE.WebGLRenderTarget(1, 1, { ...flat, count: 2 });
    const edges = new THREE.WebGLRenderTarget(1, 1, flat);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const size = { resolution: { value: new THREE.Vector2(1, 1) }, pixel: { value: 1 } };
    const paperPass = pass(paperFragment, { ...size, resolution: { value: new THREE.Vector2(1, 2) }, origin: { value: 0 }, paper: { value: new THREE.Color() }, night: { value: 0 }, grain: { value: 1 } });
    const boilPass = pass(boilFragment, { ...size, boil: { value: 0 } });
    const edgePass = pass(edgeFragment, { ...size, tShade: { value: target.textures[0] }, tData: { value: target.textures[1] }, far: { value: 8 } });
    const uniforms = {
        tPaper: { value: paper.texture }, paperSize: { value: new THREE.Vector2(1, 2) }, paperOrigin: { value: 0 },
        tHatch: { value: boil.textures[0] }, tWobble: { value: boil.textures[1] }, tEdges: { value: edges.texture },
    };
    let height = 1, paperStale = true, boilTick = null;
    const draw = (layer, target) => {
        renderer.setRenderTarget(target);
        renderer.render(layer.scene, camera);
    };
    return {
        uniforms,
        resize(width, rows, pixel) {
            height = rows / pixel;
            paper.setSize(width, rows * 2);
            boil.setSize(width, rows);
            edges.setSize(width, rows);
            size.resolution.value.set(width, rows);
            size.pixel.value = pixel;
            paperPass.material.uniforms.resolution.value.set(width, rows * 2);
            uniforms.paperSize.value.set(width, rows * 2);
            paperStale = true;
            boilTick = null;
        },
        setPaper(color, night, grain) {
            const { uniforms: paperUniforms } = paperPass.material;
            paperUniforms.paper.value.copy(color);
            paperUniforms.night.value = night;
            paperUniforms.grain.value = grain;
            paperStale = true;
        },
        drawEdges(far) {
            edgePass.material.uniforms.far.value = far;
            draw(edgePass, edges);
        },
        update(shift, tick) {
            // The screen shows the paper from -shift to height - shift; the strip holds two heights.
            const bottom = -shift - uniforms.paperOrigin.value;
            if (paperStale || bottom < 0 || bottom + height > height * 2) {
                uniforms.paperOrigin.value = -shift - height / 2;
                paperPass.material.uniforms.origin.value = uniforms.paperOrigin.value;
                draw(paperPass, paper);
                paperStale = false;
            }
            if (tick !== boilTick) {
                boilPass.material.uniforms.boil.value = tick;
                draw(boilPass, boil);
                boilTick = tick;
            }
        },
    };
}
