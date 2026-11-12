// Standard's full-screen pass (glass.js): the same two targets the sketch's geometry pass fills
// (sketch-shaders.js), drawn clean. Surfaces shade smoothly like satin clay with a bright rim
// where they turn away, the room behind dissolves into the wash, outlines are fine and steady, screens show their picture as it is, and the
// background is a soft wash of light, two glows over a gradient, at `glowAAt` and `glowBAt`
// (glass.js moves them with the scroll).

export const glassFragment = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D tShade;
uniform sampler2D tData;
uniform vec2 resolution;
uniform float pixel;
uniform float far;
uniform vec3 top;
uniform vec3 bottom;
uniform vec3 glowA;
uniform vec3 glowB;
uniform float glowAmount;
uniform vec3 shadow;
uniform vec3 lit;
uniform vec3 ink;
uniform float night;
uniform vec2 glowAAt;
uniform vec2 glowBAt;
out vec4 outColor;

float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}
float depthAt(vec2 uv) {
    vec4 d = texture(tData, uv);
    return (d.z * 255.0 * 256.0 + d.w * 255.0) / 65535.0 * far;
}
vec3 normalAt(vec2 uv) {
    vec2 xy = texture(tData, uv).xy * 2.0 - 1.0;
    return vec3(xy, sqrt(max(1.0 - dot(xy, xy), 0.0)));
}

// Where a silhouette or a crease passes through uv: jumps in depth and bends in the surface.
float edge(vec2 uv) {
    vec2 px = pixel / resolution;
    float d0 = depthAt(uv);
    vec3 n0 = normalAt(uv);
    float e = 0.0;
    for (int i = 0; i < 2; i++) {
        vec2 o = i == 0 ? vec2(px.x, 0) : vec2(0, px.y);
        float da = depthAt(uv + o), db = depthAt(uv - o);
        float ref = max(min(d0, min(da, db)), 0.05);
        e = max(e, smoothstep(0.04, 0.12, max(abs(da + db - 2.0 * d0) / ref * 1.4, abs(da - db) / ref * 0.5)));
        float bend = 1.0 - min(dot(n0, normalAt(uv + o)), dot(n0, normalAt(uv - o)));
        e = max(e, smoothstep(0.2, 0.45, bend));
    }
    return e;
}

// A soft round glow at c, r across, in the screen's own proportions.
float glow(vec2 uv, vec2 c, float r) {
    vec2 d = (uv - c) * vec2(resolution.x / resolution.y, 1.0);
    return exp(-dot(d, d) / (r * r));
}

// The glow at c drawn again a screen above and below, so one that rises off the top is already
// rising in from the bottom: the wash repeats every screen height, with no seam.
float glows(vec2 uv, vec2 c, float r) {
    return glow(uv, c, r) + glow(uv, c + vec2(0.0, 1.0), r) + glow(uv, c - vec2(0.0, 1.0), r);
}

void main() {
    vec2 uv = vUv;
    vec3 wash = mix(bottom, top, smoothstep(0.0, 1.0, uv.y));
    // Each glow tints the wash towards its colour rather than adding light, so by day, on a wash
    // already near white, it still shows.
    wash = mix(wash, glowA, glowAmount * min(glows(uv, glowAAt, 0.55), 1.0));
    wash = mix(wash, glowB, glowAmount * min(glows(uv, glowBAt, 0.5), 1.0));
    // A fraction of a level of noise, so the gradient never bands.
    wash += (hash(uv * resolution) - 0.5) / 255.0;

    vec4 shade = texture(tShade, uv);
    float kind = shade.a;
    vec3 color = wash;
    if (kind > 0.92) {
        float lum = dot(shade.rgb, vec3(0.299, 0.587, 0.114));
        vec3 n = normalAt(uv);
        float rim = pow(1.0 - clamp(n.z, 0.0, 1.0), 3.0);
        color = mix(shadow, lit, smoothstep(0.08, 0.95, lum));
        color += rim * mix(0.12, 0.08, night);
    } else if (kind > 0.75) {
        // The room: the wash itself, a shade darker where the room turns from the light, so the
        // desk stands on a floor in front of a wall without either hiding the light.
        float lum = dot(shade.rgb, vec3(0.299, 0.587, 0.114));
        color = wash * mix(0.9, 1.0, smoothstep(0.3, 0.95, lum));
    } else if (kind > 0.25) {
        color = shade.rgb * mix(1.0, 0.9, night);
    }
    color = mix(color, ink, edge(uv) * mix(0.32, 0.45, night));
    outColor = vec4(color, 1.0);
}`;
