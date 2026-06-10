import * as THREE from 'three';
import { generatePerlinNoiseTexture, octaveNoise } from './generators.js';
import { TerrainShader } from './shaders/terrain-shader.js';

export async function createTerrain(scene) {
	// scene.clear();

	const geometry = new THREE.PlaneGeometry(300, 300, 50, 50);
	geometry.rotateX(-Math.PI / 2);

	const positions = geometry.attributes.position;

	for (let i = 0; i < positions.count; i++) {
		const x = positions.getX(i);
		const z = positions.getZ(i);

		const scale = 0.005;

		let h = octaveNoise(new THREE.Vector2(x * scale, z * scale));

		const craterCoefficient = Math.max(
			0,
			Math.min(1, (x * scale) ** 2 + (z * scale) ** 2),
		);

		h = h * craterCoefficient * 2 + 0 * (1 - craterCoefficient);

		const height = 2 * (h - 0.5) * 50;

		positions.setY(i, height);
	}

	geometry.computeVertexNormals();

	return geometry;
}
