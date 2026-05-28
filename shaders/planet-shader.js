import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class PlanetShader {
	constructor(textures) {
		this.uniforms = {
			surfaceTex: { value: textures.surfaceTex },
			cloudsTex: { value: textures.cloudsTex },
			nightTex: { value: textures.nightTex },
			specularMapTex: { value: textures.specularMapTex },
			normalMapTex: { value: textures.normalMapTex },
			cameraPos: { value: new THREE.Vector3(0, 0, 0) },
			normalFactor: { value: 1.0 },
			cloudStrength: { value: 0.6 },
			lightDir: { value: new THREE.Vector3(1, 0, 0) },
			planetPos: { value: new THREE.Vector3(0, 0, 0) },
		};

		this.material = new THREE.ShaderMaterial({
			uniforms: this.uniforms,
			vertexShader: this.vertexShader,
			fragmentShader: this.fragmentShader,
			side: THREE.DoubleSide,
		});
	}

	async init() {
		this.fragmentShader = await fetch(
			'./shaders/glsl/planet_shader.frag',
		).then((r) => r.text());
		this.vertexShader = await fetch(
			'./shaders/glsl/planet_vertex.vert',
		).then((r) => r.text());

		this.createMaterial();
		return this;
	}

	createMaterial() {
		this.material = new THREE.ShaderMaterial({
			uniforms: this.uniforms,
			vertexShader: this.vertexShader,
			fragmentShader: this.fragmentShader,
			side: THREE.DoubleSide,
		});
	}
}
