import * as THREE from 'three';

export class DomeShader {
	constructor(textures) {
		this.uniforms = {
			lightDir: { value: new THREE.Vector3(1, 0, 0) },
		};

		this.material = new THREE.ShaderMaterial({
			uniforms: this.uniforms,
			vertexShader: this.vertexShader,
			fragmentShader: this.fragmentShader,
			side: THREE.DoubleSide,
			transparent: true,
			depthWrite: false,
			opacity: 0.1,
		});

		this.material.renderOrder = 999;
	}

	async init() {
		this.fragmentShader = await fetch(
			'./shaders/glsl/dome_shader.frag',
		).then((r) => r.text());
		this.vertexShader = await fetch('./shaders/glsl/dome_vertex.vert').then(
			(r) => r.text(),
		);

		this.createMaterial();
		return this;
	}

	createMaterial() {
		this.material = new THREE.ShaderMaterial({
			uniforms: this.uniforms,
			vertexShader: this.vertexShader,
			fragmentShader: this.fragmentShader,
			side: THREE.DoubleSide,
			transparent: true,
			depthWrite: false,
			opacity: 0.1,
		});

		this.material.renderOrder = 999;
	}
}
