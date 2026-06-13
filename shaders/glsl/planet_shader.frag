uniform sampler2D perlinNoiseTex;

uniform vec3 cameraPos;
uniform vec3 lightDir;
uniform vec3 planetPos;

uniform float normalFactor;
uniform float cloudStrength;

uniform float time;

uniform bool hasWater;
uniform bool hasAtmosphere;
uniform bool isGasGiant;

uniform vec3 GROUND_COLOR;
uniform vec3 WATER_COLOR;
uniform vec3 ATMOSPHERE_COLOR;
uniform vec3 CLOUD_COLOR;

uniform float SEED;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPos;

const float planetRadius = 5.0;

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

vec3 calculateOffsetSphereHit(float radius, vec3 pos, vec3 cameraPos){
    vec3 slope = normalize(pos - cameraPos);

    vec3 oc = cameraPos - planetPos;

    float b = 2.0 * dot(oc, slope);
    float c = dot(oc, oc) - radius*radius;
    
    float d = b*b - 4.0*c;
    
    float t = (-b - sqrt(d)) / 2.0;

    vec3 newPoint = cameraPos + slope * t;

    return newPoint;
}

vec2 calculateUvSphereOffset(float radius, vec3 pos, vec3 cameraPos){
    vec3 newPoint = calculateOffsetSphereHit(radius, pos, cameraPos);

    vec2 uvOriginal;
    uvOriginal.x = (atan(pos.z, pos.x) + 3.14159265) / (2.0 * 3.14159265);
    uvOriginal.y = (asin(clamp(pos.y, -1.0, 1.0)) + 3.14159265/2.0) / 3.14159265;

    vec2 uvProjected;
    uvProjected.x = (atan(newPoint.z, newPoint.x) + 3.14159265) / (2.0 * 3.14159265);
    uvProjected.y = (asin(clamp(newPoint.y, -1.0, 1.0)) + 3.14159265/2.0) / 3.14159265;

    vec2 uvOffset = uvProjected - uvOriginal;

    return uvOffset;
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
    return 2.0 * (texture(perlinNoiseTex, fract(uv / 50.0 + vec2(SEED * 0.1, SEED * 0.5))).r - 0.5);
}

float octavePerlin(vec2 uv) {
    return perlinNoise(uv);
}

float octaveTriplanarNoise(float scaleMultiplier, vec3 p, vec3 n) {
    vec3 w = abs(n);
    w = w * w;
    w /= (w.x + w.y + w.z);

    float resultXY = texture(perlinNoiseTex, fract(p.xy * scaleMultiplier / 50.0 + vec2(SEED * 0.2))).r;
    float resultYZ = texture(perlinNoiseTex, fract(p.yz * scaleMultiplier / 50.0 + vec2(SEED * 0.2, 1980.0))).r;
    float resultXZ = texture(perlinNoiseTex, fract(p.xz * scaleMultiplier / 50.0 + vec2(0.0, -SEED * 0.1))).r;

	float result = resultXY * w.z + resultYZ * w.x + resultXZ * w.y;

    return max(0.0, min(1.0, result));
}

float contrast(float v) {
    return max(0.0, min(1.0, (v-0.5) * 2.0 + 0.5));
    // return step(0.5, v) * 2.0 * v * v + (1.0 - step(0.5, v)) * (1.0 - 2.0 * (1.0 - v) * (1.0 - v));
}

float h(float i) {
    float featureScale = mix(50.0, 1000.0, pow(random(vec2(SEED, 5.0)), 3.0));
    // return featureScale * pow(i - 0.45, 2.0) + 0.5;
    return i;
}

vec3 getPos() {
    return (vPos - planetPos) / planetRadius;;
}

vec3 generateTerrainNormals(float noise, float threshold, vec3 normal) {
    float delta = -0.01;

    vec3 pos = getPos();

    float height = octaveTriplanarNoise(6.0, pos, vNormal);
    float heightL = octaveTriplanarNoise(6.0, pos + vec3(delta, 0, 0), vNormal + vec3(delta, 0, 0));
    float heightU = octaveTriplanarNoise(6.0, pos + vec3(0, delta, 0), vNormal + vec3(0, delta, 0));

    float waterNoise = perlinNoise(vUv * 200.0) * 2.0;
    float waterNoiseL = perlinNoise(vUv * 200.0 + vec2(delta * 10.0, 0)) * 2.0;
    float waterNoiseU = perlinNoise(vUv * 200.0 + vec2(0, delta * 10.0)) * 2.0;

    height = step(threshold, noise) * h(height) + (1.0 - step(threshold, noise)) * waterNoise;
    heightL = step(threshold, noise) * h(heightL) + (1.0 - step(threshold, noise)) * waterNoiseL;
    heightU = step(threshold, noise) * h(heightU) + (1.0 - step(threshold, noise)) * waterNoiseU;

    float dx = (height - heightL);
    float dy = (height - heightU);

    return normalize(vec3(dx, dy, 1.0));
}

vec3 generateGroundColor(float height, float noise, float threshold, float poles, float steepness) {
    vec3 gColor = mix(GROUND_COLOR, vec3(0.5,0.5,0.5), height);
    gColor = mix(gColor, vec3(1, 0.8, 0.3), clamp(contrast(1.0 - noise * 2.0 + 0.53) - poles, 0.0, 1.0));
    gColor = mix(vec3(1.0), gColor, clamp(1.0 - step(threshold - 1.0, height) + (1.0 - poles * 2.0), 0.0, 1.0));

    gColor = mix(vec3(0.5, 0.4, 0.3), gColor, 1.0 - step(0.5, steepness));
    gColor = mix(gColor, vec3(1.0), step(5.0, h(height)));

    return gColor;
}

float generateClouds(vec2 uv) {
    vec3 pos = getPos();

    float cloudNoise1 = octaveTriplanarNoise(4.0, pos + vec3(10.0, 0.0, 0.0) + time * 0.001, vNormal);
    float cloudNoise2 = octaveTriplanarNoise(4.0, pos + vec3(10.0, 0.0, 0.0) + time * 0.001, vNormal);

    return max(0.0, contrast(contrast(max(0.0, octavePerlin((uv + vec2(cloudNoise1, cloudNoise2) * 0.5 + time * 0.001) * 20.0) / 2.0 + 0.4))) + octavePerlin(uv * 100.0) * 0.1);
}

vec3 applyAtmosphere(vec3 groundColor, vec3 cloudColor, vec3 viewVector) {
    vec3 pos = getPos();

    float atmosphereDistance = length(calculateOffsetSphereHit(2.0, pos, pos + lightDir) - pos);
    float atmosphereScattered = exp(-atmosphereDistance * 4.0);

    float atmosphereStrength = clamp(((dot(vNormal, lightDir) + 1.0) / 2.0 - 0.3) / 0.7, 0.0, 1.0);

    vec3 atmosphereColor = mix(vec3(1.0, 1.0, 1.0), vec3(0.8, 0.2, 0.0), clamp(1.0 - exp(-4.0 * atmosphereDistance) * 100.0, 0.0, 1.0)) * atmosphereStrength;
    atmosphereColor *= ATMOSPHERE_COLOR;

    vec3 surfaceColor = groundColor * atmosphereColor;
    
    float atmosphereThickness = mix(1.0, 5.0, pow(random(vec2(SEED, 19.0)), 3.0)) * (isGasGiant ? 1.5 : 1.0);
    float fresnel = (1.0 - pow(dot(lightDir, vNormal) * 0.5 + 0.5, 0.1)) * atmosphereThickness * 0.5 + (1.0 - pow(dot(viewVector, vNormal), 0.1)) * atmosphereThickness * 0.5;

    vec3 pixelColor = surfaceColor + cloudColor * cloudStrength * random(vec2(SEED, 17.0)) + ATMOSPHERE_COLOR * fresnel * atmosphereStrength * 2.5 + atmosphereColor * atmosphereScattered * 20.0;
    return max(pixelColor, vec3(0.0));
}

vec3 applySpecular(vec3 color, vec3 normal, float specular, vec3 viewVector, float power) {
    vec3 reflectionDir = normalize(2.0 * dot(normal, lightDir.xyz) * vNormal - lightDir.xyz);
    float specularAmount = min(1.0, pow(max(0.0, dot(reflectionDir, viewVector)), power)) * specular;
    return color + vec3(specularAmount);
}

vec3 applyLighting(vec3 color, vec3 normal) {
    float lightAmount = max(dot(lightDir, normal), 0.0);
    return color * lightAmount;
}

vec3 genericPlanet() {
    float fineScaleDetail = random(vec2(SEED, 1.0));
    float cloudiness = mix(0.2, 0.6, random(vec2(SEED, 2.0)));

    vec3 pos = getPos();

    //Noise
	float noise = octaveTriplanarNoise(4.0, pos, vNormal) + octavePerlin(vUv * 10.0) * 0.05 * fineScaleDetail;
    float clouds = max(0.0, generateClouds(vUv) * 2.0 + cloudiness);
    if (!hasWater) clouds = 0.0;

    float poles = min(1.0, max(0.0, pow(abs(dot(vec3(0, 1.0, 0), pos)), 2.0)));
    poles = clamp((poles - 0.5) * (1.0 / 0.5), 0.0, 1.0);

    float landmassBias = mix(0.45, 0.55, random(vec2(SEED, 3.0)));

    float threshold = landmassBias - clamp(poles - 0.3, 0.0, 1.0) * 0.5;
    if (!hasWater) threshold = 0.0;

    //Normals
    float height = octaveTriplanarNoise(6.0, pos, vNormal);

    vec3 normalMap = generateTerrainNormals(noise, threshold, vNormal);
    float steepness = length(normalMap - vec3(0.0, 0.0, 1.0));

    vec3 terrainNormal = combineNormals(vNormal, normalMap);

    //Albedo
    vec3 gColor = generateGroundColor(height, noise, threshold, poles, steepness);
    vec3 waterColor = mix(vec3(0.5, 1.0, 1.0) * WATER_COLOR, vec3(0.3, 0.5, 0.7) * WATER_COLOR, max(0.0, min(1.0, contrast(1.7 - noise * 3.0)))) * (1.0 - step(threshold, noise)) * 1.5;
	vec3 groundColor = mix(waterColor, gColor, step(threshold, noise));

    //Lighting
    vec3 viewVector = normalize(cameraPos - pos);
	float currSpecular = 1.0 - step(threshold, noise) + poles;

    groundColor = applyLighting(groundColor, terrainNormal);
    vec3 cloudsColor = applySpecular(applyLighting(vec3(clouds), vNormal), vNormal, clouds, viewVector, 5.0);

    vec3 resultColor = hasAtmosphere ? applyAtmosphere(groundColor, cloudsColor, viewVector) : groundColor;
    // return vec3(time / 1300);
    // return vec3(noise);
    return applySpecular(resultColor, terrainNormal, currSpecular * max(0.0, 1.0 - clouds), viewVector, 50.0);
}

vec3 gasGiant() {
    float clouds = contrast(contrast(generateClouds(vUv * vec2(0.25, 2.0)) + 0.3)) * 1.0 + contrast(generateClouds(vUv * vec2(0.3, 1.5) + vec2(100.0, 100.0)) + 0.5);

    vec3 pos = getPos();

    float poles = min(1.0, max(0.0, pow(abs(dot(vec3(0, 1.0, 0), pos)), 2.0)));
    poles = clamp((poles - 0.5) * (1.0 / 0.5), 0.0, 1.0);

    float threshold = 0.515 - clamp(poles - 0.3, 0.0, 1.0) * 0.5;
    if (!hasWater) threshold = 0.0;

    //Lighting
    vec3 viewVector = normalize(cameraPos - pos);
	float currSpecular = clouds * 0.2;

    vec3 cloudsColor = applyLighting(vec3(clouds), vNormal);
    cloudsColor *= CLOUD_COLOR;

    vec3 resultColor = applyAtmosphere(mix(GROUND_COLOR, WATER_COLOR * vec3(0.5, 0.5, 0.5), perlinNoise(vUv * vec2(5.0, 30.0))), cloudsColor, viewVector);

    return applySpecular(resultColor, vNormal, currSpecular * clouds, viewVector, 5.0);
}

void main() {
    vec3 pixelColor = isGasGiant ? gasGiant() : genericPlanet();

    float exposure = 0.5;
    gl_FragColor = vec4(tonemapper(pixelColor * exposure), 1.0);
}