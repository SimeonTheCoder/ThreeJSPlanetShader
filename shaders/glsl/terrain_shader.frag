uniform sampler2D perlinNoiseTex;

uniform vec3 cameraPos;
uniform vec3 lightDir;
uniform vec3 planetPos;

uniform bool hasWater;
uniform bool hasAtmosphere;

uniform vec3 GROUND_COLOR;

uniform float SEED;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPos;

vec3 combineNormals(vec3 normal, vec3 sampledNormal) {
    vec3 perp = cross(normal, vec3(1.0, 0, 0));
    vec3 perp2 = cross(perp, vec3(1.0, 0, 0));

    vec3 up = abs(normal.y) < 0.999
        ? vec3(0.0, 1.0, 0.0)
        : vec3(1.0, 0.0, 0.0);

    vec3 tangent = normalize(cross(up, normal));
    vec3 bitangent = cross(normal, sampledNormal);

    vec3 combined =
      tangent   * sampledNormal.x +
      bitangent * sampledNormal.y +
      normal    * sampledNormal.z;

    return normalize(mix(normal, combined, 1.0));
}

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
    return 2.0 * (texture(perlinNoiseTex, fract(uv / 32.0 + vec2(SEED * 0.1, SEED * 0.5) / 8.0)).rgb.r - 0.5);
}

float octavePerlin(vec2 uv) {
    return perlinNoise(uv);
}

float contrast(float v) {
    return max(0.0, min(1.0, (v-0.5) * 2.0 + 0.5));
    // return step(0.5, v) * 2.0 * v * v + (1.0 - step(0.5, v)) * (1.0 - 2.0 * (1.0 - v) * (1.0 - v));
}

float h(float i) {
    return i;
}

vec3 generateTerrainNormals(float noise) {
    float delta = 0.05;

    float height = octavePerlin(vUv * 4.0) + octavePerlin(vUv * 8.0) * 0.2;
    float heightL = octavePerlin(vUv * 4.0 + vec2(-delta, 0.0)) + octavePerlin(vUv * 8.0 + vec2(-delta, 0.0)) * 0.2;
    float heightU = octavePerlin(vUv * 4.0 + vec2(0.0, -delta)) + octavePerlin(vUv * 8.0 + vec2(0.0, -delta)) * 0.2;

    height = noise * h(height);
    heightL = noise * h(heightL);
    heightU = noise * h(heightU);

    float dx = (height - heightL) / delta;
    float dy = (height - heightU) / delta;

    return normalize(vec3(dx, dy, 1.0));
}

vec3 generateGroundColor(float height, float noise, float threshold, float steepness) {
    vec3 gColor = mix(GROUND_COLOR, vec3(0.5,0.5,0.5), height);
    // gColor = mix(gColor, vec3(1, 0.8, 0.3), clamp(contrast(1.0 - noise * 2.0 + 0.53), 0.0, 1.0));
    // gColor = mix(vec3(1.0), gColor, clamp(1.0 - step(threshold - 1.0, height), 0.0, 1.0));

    float steepnessFactor = steepness * steepness * (3.0 - 2.0 * steepness);

    gColor = mix(vec3(0.5, 0.4, 0.3), gColor, 1.0 - steepnessFactor);
    // gColor = mix(vec3(0.5, 0.4, 0.3), gColor, 1.0 - step(0.5, steepness));
    // gColor = mix(gColor, vec3(1.0), step(500.0, h(height)));

    return gColor;
}

float generateClouds(vec2 uv) {
    float cloudNoise1 = octavePerlin(4.0 * vUv + vec2(10.0, 0.0));
    float cloudNoise2 = octavePerlin(4.0 * vUv + vec2(10.0, 0.0));

    return max(0.0, contrast(contrast(max(0.0, octavePerlin((uv + vec2(cloudNoise1, cloudNoise2) * 0.5) * 20.0) / 2.0 + 0.4))) + octavePerlin(uv * 100.0) * 0.1);
}

vec3 applySpecular(vec3 color, vec3 normal, float specular, vec3 viewVector, float power) {
    vec3 reflectionDir = normalize(2.0 * dot(normal, lightDir.xyz) * vNormal - lightDir.xyz);
    float specularAmount = min(1.0, pow(max(0.0, dot(reflectionDir, viewVector)), power)) * specular;
    return color + vec3(specularAmount);
}

vec3 calculateSkyColor() {
    float sun = max(0.0, dot(vNormal, lightDir));
    float haze = max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0)));
    float day = max(0.0, dot(lightDir, vec3(0.0, 1.0, 0.0)));

    float longDay = max(0.0, (dot(lightDir, vec3(0.0, 1.0, 0.0)) + 1.0) / 2.0);

    float sunsetMask = sun * (1.0 - haze) * (1.0 - day) * 1.0;
    vec3 sunsetColor = mix(vec3(1.0, 0.5, 0.2), vec3(1.0, 0.1, 0.0), pow(min(1.0, max(0.0, (0.2 - day) * 5.0)), 2.0));

    vec3 dayColor = mix(mix(vec3(1.0, 0.4, 0.4), vec3(0.2, 0.4, 1.0), day), vec3(0.6, 0.6, 1.0), haze) * longDay * 1.5;
    return mix(dayColor, sunsetColor, sunsetMask);
}

vec3 applyLighting(vec3 color, vec3 normal, float steepness) {
    float dayFactor = max(0.0, dot(lightDir, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5);

    float lightAmount = max(dot(lightDir, normal), 0.0) * 1.0 * dayFactor;
    float ambientAmount = max(0.0, dot(vec3(0.0, 1.0, 0.0), normal)) * 1.0 * dayFactor * steepness;

    vec3 lightColor = vec3(lightAmount) * vec3(1.0, 0.7, 0.5) + vec3(ambientAmount) * calculateSkyColor();

    return color * lightColor;
}

void main() {
    float fineScaleDetail = random(vec2(SEED, 1.0));
    float cloudiness = mix(0.2, 0.6, random(vec2(SEED, 2.0)));

    //Noise
	float noise = octavePerlin(4.0 * vUv) + octavePerlin(vUv * 10.0) * 0.05 * fineScaleDetail;

    //Normals
    float height = octavePerlin(6.0 * vUv);

    vec3 normalMap = generateTerrainNormals(noise);

    vec3 terrainNormal = combineNormals(vNormal, normalMap);
    float steepness = length(terrainNormal - vec3(0.0, 1.0, 0.0));

    //Albedo
    vec3 groundColor = generateGroundColor(height, noise, 0.0, steepness);

    groundColor = applyLighting(groundColor, terrainNormal, 1.0 - steepness);

    float depth = length(vPos - cameraPos) / 700.0;
    float fog = min(1.0, exp(depth) - 1.0);

    vec3 pixelColor = mix(groundColor, calculateSkyColor() * 0.7, fog);

    float exposure = 1.0;
    // gl_FragColor = vec4(vec3(fog), 1.0);
    gl_FragColor = vec4(tonemapper(pixelColor * exposure), 1.0);
}