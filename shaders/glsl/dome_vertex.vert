varying vec2 vUv;
varying vec3 vPos;
varying vec3 vNormal;

void main() {
    vUv = uv;

    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vPos = worldPos.xyz;

    vNormal = normalize(mat3(modelMatrix) * normal);

    gl_Position = projectionMatrix * viewMatrix * worldPos;
}