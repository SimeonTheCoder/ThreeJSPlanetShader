uniform vec3 lightDir;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPos;

//Narkowicz ACES

const float segmentCount = 8.0;

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

void main() {
    float result = pow(max(0.0, dot(vNormal, lightDir)), 5.0);
    float lighting = pow(max(0.0, dot(vNormal, lightDir)) * 0.5 + 0.5, 1.0);
    // float fresnel = dot(vNormal, vec3(0.0, 0.0, 1.0));

    float columns = min(1.0, step(0.99, fract(vUv.x * segmentCount)) + step(0.99, fract(vUv.y * segmentCount)));

    vec2 uvs = fract(vUv * segmentCount) - vec2(0.5, 0.5);
    float distance = uvs.x * uvs.x + uvs.y * uvs.y;

    float light = lighting * 0.2 + distance;

    vec3 color = mix(vec3(0.7, 0.8, 0.9) * lighting, vec3(0.5) * lighting, columns);

    // gl_FragColor = vec4(distance, 0.0, 0.0, 1.0);
    gl_FragColor = vec4(color, mix(0.1, 1.0, clamp(columns + light, 0.0, 1.0)));
    // gl_FragColor = vec4(vec3(1.0, 0.0, 0.0), 0.1);
}