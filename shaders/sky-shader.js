import * as THREE from 'three';

import { random } from '../random.js';

export class SkyShader {
	constructor(textures) {
		function t(t) {
			return t < 0.5 ? t ** 4 * 8 : 1 - (1 - t) ** 4 * 8;
		}

		const stars = [];

		for (let i = 0; i < 200; i++) {
			const ta = random();
			const tb = random();

			const angleA = ta * 6.28;
			const angleB = tb * 3.14;

			const z = Math.sin(angleB);
			const l = Math.cos(angleB);

			const dirX = Math.cos(angleA);
			const dirY = Math.sin(angleA);

			const pos = new THREE.Vector3(dirX * l, z, dirY * l);
			stars.push(pos);
		}

		this.uniforms = {
			perlinNoiseTex: { value: textures.perlinNoiseTex },
			lightDir: { value: new THREE.Vector3(1, 0, 0) },
			hasAtmosphere: { value: random() > 0.2 },
			hasWater: { value: random() > 0.5 },
			SEED: { value: random() * 999 },
			starPos: { value: stars },
			time: { value: 0 },
			ATMOSPHERE_COLOR: { value: new THREE.Vector3(0, 0.5, 1) },
			// ATMOSPHERE_COLOR: { value: new THREE.Vector3(1, 0, 0) },
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
			'./shaders/glsl/sky_shader.frag',
		).then((r) => r.text());
		this.vertexShader = await fetch('./shaders/glsl/sky_vertex.vert').then(
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
		});
	}
}
