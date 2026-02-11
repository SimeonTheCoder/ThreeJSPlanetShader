varying vec2 vUv;
varying vec4 vPos;
varying vec3 vNormal;

void main() {
    vUv = uv;

    vec4 pos = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * pos;

    vNormal = normalize(mat3(modelMatrix) * normal);

    vPos = pos;
}