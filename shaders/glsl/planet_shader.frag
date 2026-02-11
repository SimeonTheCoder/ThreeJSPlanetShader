uniform sampler2D surfaceTex;
uniform sampler2D nightTex;
uniform sampler2D specularMapTex;
uniform sampler2D cloudsTex;
uniform sampler2D normalMapTex;

uniform vec3 cameraPos;

uniform float lightAngleDegrees;
uniform float normalFactor;
uniform float cloudStrength;

varying vec2 vUv;
varying vec4 vertexPos;

vec3 calculateLightDir(float angleDegrees) {
    float lightAngleRadians = radians(angleDegrees);
    return normalize(-vec3(cos(lightAngleRadians), 0.0, sin(lightAngleRadians)));
}

vec3 combineNormals(vec3 normal, vec3 sampledNormal) {
    vec3 perp = cross(normal, vec3(1, 0, 0));
    vec3 perp2 = cross(perp, vec3(1, 0, 0));

    vec3 combined = perp * sampledNormal.y + perp2 * sampledNormal.x + normal * sampledNormal.z;

    return normalize(mix(normal, combined, normalFactor));
}

vec3 tonemapper(vec3 color) {
    return color / (vec3(1.0) + color) * 1.5;
}

vec2 calculateOffset(float radius, vec3 pos, vec3 cameraPos){
    vec3 slope = normalize(pos - cameraPos);

    float b = 2.0 * dot(cameraPos, slope);
    float c = dot(cameraPos, cameraPos) - radius*radius;
    float d = b*b - 4.0*c;
    float t = (-b + sqrt(d)) / 2.0;
    vec3 newPoint = cameraPos + slope * t;

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
    vec3 normal = normalize(vertexPos.xyz);
    vec3 normalMap = texture2D(normalMapTex, vUv).rgb * 2.0 - vec3(1.0);
    vec3 terrainNormal = combineNormals(normal, normalMap);

    vec3 groundColor = texture2D(surfaceTex, vUv).rgb;

    vec3 cloudsColor = texture2D(cloudsTex, vUv + calculateOffset(1.2, vertexPos.xyz, cameraPos)).rgb;

    vec3 lightDir = calculateLightDir(lightAngleDegrees);

    float lightAmount = dot(lightDir, normal);
    float lightAmountSurface = dot(lightDir, terrainNormal);

    vec3 reflectionDirSurface = normalize(2.0 * dot(terrainNormal, -lightDir.xyz) * normal + lightDir.xyz);
    vec3 reflectionDir = normalize(2.0 * dot(normal, -lightDir.xyz) * normal + lightDir.xyz);

    vec3 viewVector = normalize(cameraPos - vertexPos.xyz);

    float currSpecular = texture2D(specularMapTex, vUv).r;

    float specularAmountSurface = min(1.0, pow(max(0.0, dot(reflectionDirSurface, viewVector)), 100.0)) * currSpecular;
    float specularAmountClouds = min(1.0, pow(max(0.0, dot(reflectionDir, viewVector)), 20.0)) * currSpecular;

    float fresnel = (1.0 - pow(dot(vec3(0.0, 0.0, -1.0), normal), 0.1)) * 2.0;

    specularAmountSurface = specularAmountSurface * (1.0 - cloudsColor.r);
    specularAmountClouds = specularAmountClouds * cloudsColor.r;

    groundColor = groundColor * vec3(max(lightAmountSurface, 0.0));
    cloudsColor = cloudsColor * vec3(max(lightAmount, 0.0));

    float nightLights = max(0.0, (0.15 - lightAmount) * 2.0) * 2.0;
    vec3 nightColor = pow(texture2D(nightTex, vUv).rgb, vec3(2.0)) * nightLights * (1.0 - cloudsColor.r);

    vec3 surfaceColor = groundColor + nightColor + specularAmountSurface;
    vec3 cloudColor = cloudsColor + specularAmountClouds * 5.0;

    vec3 pixelColor = surfaceColor + cloudColor * cloudStrength + vec3(0, 0.5, 1.0) * fresnel;

    //gl_FragColor = vec4(terrainNormal, 1.0);
    //gl_FragColor = vec4(vec3(cloudColor), 1.0);
    gl_FragColor = vec4(tonemapper(pixelColor), 1.0);
}