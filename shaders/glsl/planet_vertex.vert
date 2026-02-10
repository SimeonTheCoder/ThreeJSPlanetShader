varying vec2 vUv;
varying vec4 vertexPos;

void main() {
    vUv = uv;

    vec4 pos = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * pos;

    vertexPos = pos;
}