import * as THREE from 'three';

let index = 1;
let seed = 0;

export function setSeed(randomSeed) {
	seed = randomSeed;
}

export function random() {
	index++;

	const result = Math.sin(
		new THREE.Vector2(seed, index).dot(new THREE.Vector2(12.9898, 78.233)) *
			43758.5453123,
	);
	return result - Math.floor(result);
}

export function randomWithSeed(seed) {
	index++;

	const result = Math.sin(
		new THREE.Vector2(seed, index).dot(new THREE.Vector2(12.9898, 78.233)) *
			43758.5453123,
	);
	return result - Math.floor(result);
}

export function resetRandom() {
	index = 0;
}
