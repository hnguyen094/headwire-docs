// The sketch's shaders (sketch.js): the geometry pass, which draws every mesh's shade and kind
// into one target and its normal and depth into another, and the full-screen pass, which turns
// those into wobbly ink outlines, hatching by tone and a paper grain. The grain, the hatching and
// the wobble come from cached layers drawn far less often than the frames, and the outlines from
// an edge field drawn each frame at a CSS pixel's resolution (layer-shaders.js).
import { noiseChunk } from './layer-shaders.js';

// Depth is packed into 16 bits from the camera to its far plane, `far`, which follows the camera
// back as a narrow screen backs the wide shots off (path.js).

export const geometryVertex = /* glsl */ `
in vec3 position;
in vec3 normal;
in vec2 uv;
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
uniform mat3 uvTransform;
out vec3 vViewNormal;
out vec3 vWorldNormal;
out float vDepth;
out vec2 vUv;
void main() {
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    vViewNormal = normalize(normalMatrix * normal);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vDepth = -view.z;
    vUv = (uvTransform * vec3(uv, 1.0)).xy;
    gl_Position = projectionMatrix * view;
}`;

export const geometryFragment = /* glsl */ `
precision highp float;
in vec3 vViewNormal;
in vec3 vWorldNormal;
in float vDepth;
in vec2 vUv;
uniform float tone;
uniform float kind;
uniform sampler2D map;
uniform vec3 lightDir;
uniform float far;
layout(location = 0) out vec4 gShade;
layout(location = 1) out vec4 gData;
vec2 packDepth(float d) {
    float v = clamp(d / far, 0.0, 1.0) * 65535.0;
    return vec2(floor(v / 256.0), mod(floor(v), 256.0)) / 255.0;
}
void main() {
    vec3 n = normalize(vViewNormal);
    if (!gl_FrontFacing) n = -n;
    vec3 shade;
    if (kind > 0.5 && kind < 1.5) {
        shade = texture(map, vUv).rgb;
    } else {
        vec3 w = normalize(vWorldNormal);
        if (!gl_FrontFacing) w = -w;
        float lambert = max(dot(w, normalize(lightDir)), 0.0);
        float sky = 0.5 + 0.5 * w.y;
        shade = vec3(tone * (0.44 + 0.42 * lambert + 0.2 * sky));
    }
    // Kind 2 is the room behind the desk: a solid to the sketch, and a backdrop to Standard (lines.js).
    gShade = vec4(shade, kind > 1.5 ? 0.85 : kind > 0.5 ? 0.5 : 1.0);
    gData = vec4(n.xy * 0.5 + 0.5, packDepth(vDepth));
}`;

export const postVertex = /* glsl */ `
in vec3 position;
out vec2 vUv;
void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

export const postFragment = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D tShade;
uniform sampler2D tData;
uniform vec2 resolution;
uniform float pixel;
uniform float boil;
uniform vec3 ink;
uniform vec3 paper;
uniform vec3 screenInk;
uniform float night;
uniform float paperShift;
uniform float grain;
uniform float far;
uniform sampler2D tPaper;
uniform vec2 paperSize;
uniform float paperOrigin;
uniform sampler2D tHatch;
uniform sampler2D tWobble;
uniform sampler2D tEdges;
out vec4 outColor;
${noiseChunk}

void main() {
    vec2 frag = vUv * resolution;
    vec2 css = frag / pixel;
    float tick = boil;

    // The paper, from its layer: its grain slides with the scroll at its share of the copy's pace
    // (paper.js), a whole device pixel at a time.
    vec2 paperRow = floor((vec2(css.x, css.y - paperShift - paperOrigin)) * pixel) + 0.5;
    vec4 sheetAt = texture(tPaper, paperRow / paperSize);
    vec3 base = sheetAt.rgb;
    float tooth = sheetAt.a;
    vec4 boiled = texture(tHatch, vUv);
    vec4 wobbled = texture(tWobble, vUv);

    vec4 shade = texture(tShade, vUv);
    float kind = shade.a;
    vec3 color = base;

    // Hatching on solid surfaces, denser as they get darker.
    if (kind > 0.75) {
        float lum = dot(shade.rgb, vec3(0.299, 0.587, 0.114));
        float jitter = (noise(css * 0.05 + tick) - 0.5) * 0.06;
        float l = lum + jitter;
        float h = 0.0;
        h = max(h, boiled.r * (1.0 - smoothstep(0.66, 0.74, l)));
        h = max(h, boiled.g * (1.0 - smoothstep(0.46, 0.54, l)) * 0.9);
        h = max(h, boiled.b * (1.0 - smoothstep(0.26, 0.34, l)) * 0.85);
        color = mix(color, color * mix(0.86, 1.0, smoothstep(0.2, 0.9, l)), 0.6);
        // Chalk at night goes over the shadows more lightly than pencil does by day.
        color = mix(color, ink, h * mix(0.55, 0.38, night) * mix(1.0, 0.8 + 0.2 * tooth, grain));
    } else if (kind > 0.25) {
        // A screen: the real picture, a little muted, printed onto the paper by day and glowing a
        // little dimmed off the dark paper at night.
        vec3 c = shade.rgb;
        float g = dot(c, vec3(0.299, 0.587, 0.114));
        c = mix(vec3(g), c, 0.82);
        c = mix(screenInk, vec3(1.0), smoothstep(0.0, 1.0, c));
        vec3 sheet = mix(base, vec3(1.0), mix(0.55, 1.0, night)) * mix(1.0, 0.8, night);
        color = sheet * mix(vec3(1.0), c, 0.96);
    }

    // Outlines: two passes, each pushed about by its own boiling noise, so a line wobbles and
    // sometimes doubles like a pencil going over it twice.
    float wobble = 1.6 * pixel;
    vec2 n1 = wobbled.xy - 0.5;
    vec2 n2 = wobbled.zw - 0.5;
    float e1 = texture(tEdges, vUv + n1 * wobble * 2.0 / resolution).r;
    float e2 = texture(tEdges, vUv + n2 * wobble * 2.6 / resolution).r;
    float pressure = 0.55 + 0.45 * smoothstep(0.2, 0.7, boiled.a);
    float line = max(e1 * pressure, e2 * 0.45);
    color = mix(color, ink, clamp(line, 0.0, 1.0) * mix(1.0, 0.82 + 0.18 * tooth, grain));

    outColor = vec4(color, 1.0);
}`;
