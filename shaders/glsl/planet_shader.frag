uniform sampler2D surfaceTex;
uniform sampler2D nightTex;
uniform sampler2D specularMapTex;
uniform sampler2D cloudsTex;
uniform sampler2D normalMapTex;

uniform vec3 cameraPos;
uniform vec3 lightDir;
uniform vec3 planetPos;

uniform float normalFactor;
uniform float cloudStrength;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPos;

vec3 combineNormals(vec3 normal, vec3 sampledNormal) {
    vec3 perp = cross(normal, vec3(1.0, 0, 0));
    vec3 perp2 = cross(perp, vec3(1.0, 0, 0));

    vec3 combined = perp * sampledNormal.y + perp2 * sampledNormal.x + normal * sampledNormal.z;

    return normalize(mix(normal, combined, normalFactor));
}

vec3 tonemapper(vec3 color) {
    return color / (vec3(1.0) + color) * 1.5;
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
	vec2 uvBlock = floor(uv);
	vec2 f = fract(uv);

	vec2 a = randomGradient(uvBlock);
	vec2 b = randomGradient(uvBlock + vec2(1, 0));
	vec2 c = randomGradient(uvBlock + vec2(0, 1));
	vec2 d = randomGradient(uvBlock + vec2(1, 1));

	vec2 da = f - vec2(0, 0);
	vec2 db = f - vec2(1, 0);
	vec2 dc = f - vec2(0, 1);
	vec2 dd = f - vec2(1, 1);

	float dotA = dot(a, da);
	float dotB = dot(b, db);
	float dotC = dot(c, dc);
	float dotD = dot(d, dd);

	vec2 t = f * f * (3.0 - 2.0 * f);

	float ab = mix(dotA, dotB, t.x);
	float cd = mix(dotC, dotD, t.x);

	return mix(ab, cd, t.y);
}

float octaveTriplanarNoise(float scaleMultiplier) {
    vec3 p = vNormal;
    vec3 n = normalize(vNormal);

    vec3 w = abs(n);
    w = w * w;
    w /= (w.x + w.y + w.z);

    float resultXY = 0.0;
    float resultYZ = 0.0;
    float resultXZ = 0.0;

    float amp = 1.0;

    for (int i = 1; i <= 8; i++) {
        float scale = float(i) * scaleMultiplier;

        resultXY += amp * perlinNoise(p.xy * scale);
        resultYZ += amp * perlinNoise(p.yz * scale);
        resultXZ += amp * perlinNoise(p.xz * scale);

        amp *= 0.5;
    }

	float result = resultXY * w.z + resultYZ * w.x + resultXZ * w.y;

    return result / 2.0 + 0.5;
}

void main() {
	float noise = octaveTriplanarNoise(2.0);

	vec3 gColor = mix(vec3(0,1,0), vec3(0.5,0.5,0.5), step(0.5, octaveTriplanarNoise(6.0)));

	vec3 groundColor = mix(vec3(0, 0, 1), gColor, step(0.5, noise));
    // vec3 groundColor = vec3(octaveTriplanarNoise());

    // vec3 groundColor = texture2D(surfaceTex, vUv).rgb;
	float currSpecular = 1.0 - step(0.5, noise);
    // float currSpecular = texture2D(specularMapTex, vUv).r;

    vec3 normal = normalize(vNormal);
    // vec3 normalMap = texture2D(normalMapTex, vUv).rgb * 2.0 - vec3(1.0);
    // vec3 terrainNormal = combineNormals(normal, normalMap);
	vec3 terrainNormal = normal;

    vec3 cloudsColor = vec3(0.0);
    vec3 cloudsShadow = vec3(0.0);

    // vec3 cloudsColor = texture2D(cloudsTex, vUv + calculateUvSphereOffset(1.003, vPos.xyz, cameraPos)).rgb;
    // vec3 cloudsShadow = texture2D(cloudsTex, vUv + calculateUvSphereOffset(1.0, vPos.xyz, cameraPos)).rgb;

    float lightAmount = dot(lightDir, normal);
    float lightAmountSurface = dot(lightDir, terrainNormal);

    vec3 reflectionDirSurface = normalize(2.0 * dot(terrainNormal, lightDir.xyz) * normal - lightDir.xyz);
    vec3 reflectionDir = normalize(2.0 * dot(normal, lightDir.xyz) * normal - lightDir.xyz);

    vec3 viewVector = normalize(cameraPos - vPos);

    float specularAmountSurface = min(1.0, pow(max(0.0, dot(reflectionDirSurface, viewVector)), 100.0)) * currSpecular;
    float specularAmountClouds = min(1.0, pow(max(0.0, dot(reflectionDir, viewVector)), 20.0)) * currSpecular;

    float fresnel = (1.0 - pow(dot(viewVector, normal), 0.1)) * 1.0;

    specularAmountSurface = specularAmountSurface * (1.0 - cloudsColor.r);
    specularAmountClouds = specularAmountClouds * cloudsColor.r;

    // groundColor = groundColor * vec3(max(lightAmountSurface, 0.0));
    cloudsColor = cloudsColor * vec3(max(lightAmount, 0.0));

    float nightLights = max(0.0, (0.3 - lightAmount) * 2.0) * 2.0;
    // vec3 nightColor = pow(texture2D(nightTex, vUv).rgb, vec3(2.0)) * nightLights * (1.0 - cloudsColor.r);
	vec3 nightColor = vec3(0.0);

    float atmosphereDistance = length(calculateOffsetSphereHit(2.0, vPos, vPos + lightDir) - vPos);
    float atmosphereStrength = clamp(((dot(normal, lightDir) + 1.0) / 2.0 - 0.3) / 0.7, 0.0, 1.0);
    vec3 atmosphereColor = mix(vec3(1.0, 1.0, 1.0), vec3(0.8, 0.2, 0.0), 1.0 - exp(-4.0 * atmosphereDistance) * 100.0) * atmosphereStrength;

    vec3 surfaceColor = groundColor * atmosphereColor * max(vec3(0.0), (1.0 - cloudsShadow)) + nightColor + (specularAmountSurface * (1.0 - cloudsShadow));
    vec3 cloudColor = cloudsColor + specularAmountClouds * 5.0;

    vec3 pixelColor = surfaceColor + cloudColor * cloudStrength + vec3(0, 0.5, 1.0) * fresnel * atmosphereStrength * 2.5 + atmosphereColor * exp(-atmosphereDistance * 4.0) * 20.0;

    // gl_FragColor = vec4(groundColor, 1.0);
    gl_FragColor = vec4(tonemapper(pixelColor * 1.0), 1.0);
}