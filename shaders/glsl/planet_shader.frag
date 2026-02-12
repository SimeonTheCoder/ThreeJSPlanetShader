uniform sampler2D surfaceTex;
uniform sampler2D nightTex;
uniform sampler2D specularMapTex;
uniform sampler2D cloudsTex;
uniform sampler2D normalMapTex;

uniform vec3 lightDir;

uniform vec3 cameraPos;

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

    float b = 2.0 * dot(cameraPos, slope);
    float c = dot(cameraPos, cameraPos) - radius*radius;
    
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

void main() {
    vec3 normal = normalize(vNormal);
    vec3 normalMap = texture2D(normalMapTex, vUv).rgb * 2.0 - vec3(1.0);
    vec3 terrainNormal = combineNormals(normal, normalMap);

    vec3 groundColor = texture2D(surfaceTex, vUv).rgb;

    vec3 cloudsColor = texture2D(cloudsTex, vUv + calculateUvSphereOffset(1.01, vPos.xyz, cameraPos)).rgb;
    vec3 cloudsShadow = texture2D(cloudsTex, vUv + calculateUvSphereOffset(1.0, vPos.xyz, cameraPos)).rgb;

    float lightAmount = dot(lightDir, normal);
    float lightAmountSurface = dot(lightDir, terrainNormal);

    vec3 reflectionDirSurface = normalize(2.0 * dot(terrainNormal, lightDir.xyz) * normal - lightDir.xyz);
    vec3 reflectionDir = normalize(2.0 * dot(normal, lightDir.xyz) * normal - lightDir.xyz);

    vec3 viewVector = normalize(cameraPos - vPos);

    float currSpecular = texture2D(specularMapTex, vUv).r;

    float specularAmountSurface = min(1.0, pow(max(0.0, dot(reflectionDirSurface, viewVector)), 100.0)) * currSpecular;
    float specularAmountClouds = min(1.0, pow(max(0.0, dot(reflectionDir, viewVector)), 20.0)) * currSpecular;

    //float fresnel = (1.0 - pow(dot(viewVector, normal), 0.1)) * 1.0;
    float fresnel = 0.0;

    specularAmountSurface = specularAmountSurface * (1.0 - cloudsColor.r);
    specularAmountClouds = specularAmountClouds * cloudsColor.r;

    groundColor = groundColor * vec3(max(lightAmountSurface, 0.0));
    cloudsColor = cloudsColor * vec3(max(lightAmount, 0.0));

    float nightLights = max(0.0, (0.15 - lightAmount) * 2.0) * 2.0;
    vec3 nightColor = pow(texture2D(nightTex, vUv).rgb, vec3(2.0)) * nightLights * (1.0 - cloudsColor.r);

    float lightAmountRemapped = 1.0 - min(1.0, max(0.0, lightAmount - 0.1) / 0.9);
    float lightAmountRemapped2 = min(1.0, max(0.0, lightAmount + 0.6) / 1.6);

    vec3 atmosphereColor = mix(vec3(0.8, 0.8, 1.0), vec3(1.0, 0.5, 0.0), pow(lightAmountRemapped, 10.0));

    vec3 surfaceColor = groundColor * atmosphereColor + nightColor + specularAmountSurface - cloudsShadow * 0.1;;
    vec3 cloudColor = cloudsColor + specularAmountClouds * 5.0;

    vec3 atmosphereFresnel = vec3(max(0.0, pow(fresnel, 3.0)) * 3.0 * max(0.0, min(1.0, lightAmountRemapped2)) * 10.0) * atmosphereColor;
    vec3 atmosphereFresnel2 = vec3(max(0.0, pow(fresnel, 0.5)) * 0.3 * max(0.0, min(1.0, lightAmountRemapped2)) * 10.0) * atmosphereColor;

    vec3 atmosphere = mix(atmosphereFresnel, atmosphereFresnel2, pow(lightAmountRemapped2, 2.0));

    vec3 pixelColor = surfaceColor + cloudColor * cloudStrength + vec3(0, 0.5, 1.0) * fresnel + atmosphere * 1.0;
    //vec3 pixelColor = surfaceColor + cloudColor * cloudStrength;

    vec3 diff = calculateOffsetSphereHit(1.1, vPos, cameraPos) - vPos;
    //gl_FragColor = vec4(diff, 1.0);

    //gl_FragColor = vec4(vec3(mix(lightAmount, terminatorCorrection, 0.5) * lightAmount), 1.0);
    //gl_FragColor = vec4(vec3(atmosphereFresnel), 1.0);
    gl_FragColor = vec4(tonemapper(pixelColor), 1.0);
}