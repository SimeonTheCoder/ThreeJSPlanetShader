uniform sampler2D perlinNoiseTex;

uniform vec3 cameraPos;
uniform vec3 lightDir;

uniform vec3 starPos[200];

uniform bool hasWater;
uniform bool hasAtmosphere;

uniform vec3 GROUND_COLOR;

uniform float SEED;
uniform float time;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPos;

float cloudSpeed = 0.003;

//Narkowicz ACES

vec3 aces(vec3 x) {
  const float a = 2.51;
  const float b = 0.03;
  const float c = 2.43;
  const float d = 0.59;
  const float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

vec3 tonemapper(vec3 color) {
    return aces(color);
    // return color / (vec3(1.0) + color) * 1.5;
}

float random (vec2 st) {
    return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))*
        43758.5453123);
}

vec2 randomGradient (vec2 st) {
	float angle = random(st) * 6.2831853;
	return vec2(cos(angle), sin(angle));
}

float perlinNoise(vec2 uv) {
    // return texture(perlinNoiseTex, fract(uv / 5.0 + vec2(SEED * 0.1, SEED * 0.5))).r;
    return 2.0 * (texture(perlinNoiseTex, fract(uv / 50.0 + vec2(SEED * 0.1, SEED * 0.5))).rgb.r - 0.5);
}

float octavePerlin(vec2 uv) {
    return perlinNoise(uv);
}

float contrast(float v) {
    return max(0.0, min(1.0, (v-0.5) * 2.0 + 0.5));
    // return step(0.5, v) * 2.0 * v * v + (1.0 - step(0.5, v)) * (1.0 - 2.0 * (1.0 - v) * (1.0 - v));
}

float h(float i) {
    float featureScale = mix(5.0, 100.0, pow(random(vec2(SEED, 5.0)), 3.0));
    return featureScale * pow(i - 0.45, 2.0) + 0.5;
}

float generateClouds(vec2 uv) {
    float cloudNoise1 = octavePerlin(1.0 * vUv + vec2(10.0, 0.0) + time * cloudSpeed / 1.0);
    float cloudNoise2 = octavePerlin(1.0 * vUv + vec2(10.0, 0.0) + time * cloudSpeed / 1.0);

    return max(0.0, contrast(contrast(max(0.0, octavePerlin((uv + vec2(cloudNoise1, cloudNoise2) * 0.5 + time * cloudSpeed) * 20.0) / 2.0 + 0.4))) + octavePerlin(uv * 100.0 + time * cloudSpeed * 100.0) * 0.1);
}

float calculateStar(vec3 pos) {
    vec3 distance = (vNormal + vec3(octavePerlin(vNormal.xy * 100.0), octavePerlin(vNormal.xz * 100.0), octavePerlin(vNormal.yz * 100.0)) * 0.2 - pos) * 300.0;
    float l = distance.x * distance.x + distance.y * distance.y + distance.z * distance.z;

    return max(0.0, 1.0 - l);
}

float renderStars() {
    float stars = 0.0;

    for (int i = 0; i < 200; i ++) {
        vec3 pos = starPos[i];

        stars += calculateStar(pos);
        stars += calculateStar(pos * vec3(-1.0, 1.0, 1.0));
        stars += calculateStar(pos * vec3(1.0, 1.0, -1.0));
        stars += calculateStar(pos * vec3(-1.0, 1.0, -1.0));
    }

    return stars;
}

vec3 renderClouds(vec3 pixelColor, vec3 skyColor, float sun) {
    float cloudinessBias = -0.1;

    vec3 stereographicProjection = vNormal / vNormal.y  - vec3(0.0, 1.0, 0.0);
    vec2 newUv = stereographicProjection.xz + cloudSpeed * time;

    float clouds = 0.0;
    float mask = 0.0;

    const int cloudLayers = 1000;

    float visibleLayer = -1.0;
    const float stepSize = 1.0 / float(cloudLayers) * 10.0;

    for (int i = 0; i < 50; i ++) {
        float currRatio = float(i) * stepSize;

        float planeHeight = 1.0 + currRatio * currRatio * currRatio * 8.0;

        float cloudWidth = pow((1.0 - pow(1.0 - currRatio, 2.0)) * 1.5 - 0.7, 2.0) * 2.0 + max(0.0, min(1.0, perlinNoise(newUv * 2.0 + planeHeight * 1.0 + cloudSpeed * time))) * 3.0;

        vec3 currProjection = vNormal / vNormal.y * planeHeight;
        vec2 currUv = currProjection.xz + cloudSpeed * time;

        // float curr = max(0.0, generateClouds(currUv * 0.03) - 0.1);
        float curr = generateClouds(currUv * 0.1) * 0.2 + generateClouds(currUv * 0.3) * 0.1 + generateClouds(currUv * 0.05) * 0.5;

        float currMask = step(cloudWidth + cloudinessBias, curr);
        float currContribution = currRatio * currRatio;

        clouds += step(0.99, 1.0 - clouds) * currMask * currContribution;
        mask += step(0.99, 1.0 - mask) * currMask;

        if (visibleLayer < 0.0 && currMask > 0.5) visibleLayer = currRatio;
    }

    clouds = max(0.0, min(1.0, clouds)) * 5.0;
    clouds = mix(clouds, 1.0, 0.3);

    mask = max(0.0, min(1.0, mask));

    float cloudDepth = (1.0 - visibleLayer) * mask;
    cloudDepth = 1.0 * mask - (exp(pow(cloudDepth, 4.0)) - 1.0) / 1.8;
    clouds = mix(clouds, clouds * 5.0 * cloudDepth, sun);

    return mix(pixelColor, vec3(clouds) * skyColor, mask);
}

void main() {
    float toSunDot = dot(vNormal, lightDir);

    float sun = pow(max(0.0, toSunDot), 5.0);
    float haze = max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0)));
    float day = max(0.0, dot(lightDir, vec3(0.0, 1.0, 0.0)));

    float longDay = max(0.0, (dot(lightDir, vec3(0.0, 1.0, 0.0)) + 1.0) / 2.0);

    float sunsetMask = sun * (1.0 - haze) * (1.0 - day) * 1.0;
    vec3 sunsetColor = mix(vec3(1.0, 0.5, 0.2), vec3(1.0, 0.1, 0.0), pow(min(1.0, max(0.0, (0.2 - day) * 5.0)), 2.0));

    vec3 dayColor = mix(mix(vec3(1.0, 0.4, 0.4), vec3(0.2, 0.4, 1.0), day), vec3(0.6, 0.6, 1.0), haze) * longDay * 1.5;
    vec3 skyColor = mix(dayColor, sunsetColor, sunsetMask);

    //Stars, Sun and Moon
    float stars = renderStars();
    float starsTerm = pow(1.0 - longDay, 2.0) * stars;

    float sunShape = pow(max(0.0, toSunDot), 1000.0);
    float sunShapeFinal = min(1.0, step(0.8, sunShape) + sunShape * day);
    vec3 sunColor = mix(vec3(1.0, 1.0, 1.0), vec3(1.0, 0.3, 0.1), clamp(sunsetMask, 0.0, 1.0));

    float moonShape = pow(max(0.0, dot(vNormal, -lightDir)), 1000.0) * 1.0;
    float moonShapeFinal = min(1.0, step(0.8, moonShape) + moonShape * (1.0 - day) * 0.2);

    vec3 pixelColor = skyColor + sunShapeFinal * sunColor + moonShapeFinal + starsTerm;

    //Clouds
    pixelColor = renderClouds(pixelColor, skyColor, sun);

    //Tonemapping
    float exposure = 1.0;
    gl_FragColor = vec4(tonemapper(pixelColor * exposure), 1.0);
}