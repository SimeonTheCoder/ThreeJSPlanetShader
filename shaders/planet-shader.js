import * as THREE from 'three';

import vertexSrc from './glsl/planet_vertex.vert?raw';
import fragmentSrc from './glsl/planet_shader.frag?raw';

export class PlanetShader {
    constructor(textures) {
        this.fragmentShader = fragmentSrc;
        this.vertexShader = vertexSrc;

        this.uniforms = {
            surfaceTex: { value: textures.surfaceTex },
            cloudsTex: { value: textures.cloudsTex },
            nightTex: { value: textures.nightTex },
            specularMapTex: { value: textures.specularMapTex },
            normalMapTex: { value: textures.normalMapTex },
            cameraPos: {value: new THREE.Vector3(0, 0, 0)},
            normalFactor: {value: 10.0},
            cloudStrength: {value: 0.6},
            lightAngleDegrees: {value: 60.0}
        };

        this.material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: this.vertexShader,
            fragmentShader: this.fragmentShader
        });
    }
}