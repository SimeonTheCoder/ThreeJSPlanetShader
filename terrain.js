import * as THREE from 'three';
import { generatePerlinNoiseTexture, octaveNoise } from './generators.js';
import { TerrainShader } from './shaders/terrain-shader.js';

function lerp(a, b, t) {
	return (1 - t) * a + t * b;
}

function random(st) {
	const result =
		Math.sin(st.dot(new THREE.Vector2(12.9898, 78.233))) * 43758.5453123;
	return result - Math.floor(result);
}

export async function createTerrain(scene, seed) {
	// scene.clear();
	console.log(seed);

	const geometry = new THREE.PlaneGeometry(500, 500, 250, 250);
	geometry.rotateX(-Math.PI / 2);

	const positions = geometry.attributes.position;

	for (let i = 0; i < positions.count; i++) {
		const x = positions.getX(i);
		const z = positions.getZ(i);

		const scale = lerp(0.005, 0.01, random(new THREE.Vector2(seed + 1, 0)));

		let h =
			octaveNoise(new THREE.Vector2(x * scale + seed, z * scale + seed)) *
			lerp(0.3, 0.9, random(new THREE.Vector2(seed + 2, 0)));

		const craterCoefficient = Math.max(
			0,
			Math.min(1, (x * scale) ** 4 + (z * scale) ** 4),
		);

		h = h * craterCoefficient * 2 + 0 * (1 - craterCoefficient);

		const height = 2 * (h - 0.5) * 50;

		positions.setY(i, height);
	}

	geometry.computeVertexNormals();

	return geometry;
}
