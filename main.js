import * as THREE from 'three';
import { FBXLoader } from 'https://unpkg.com/three@0.179.1/examples/jsm/loaders/FBXLoader.js';
import { random } from './random.js';

const manager = new THREE.LoadingManager();
const loader = new FBXLoader(manager);

manager.setURLModifier((url) => {
	return './assets/' + url.split(/[/\\]/).pop();
});

const PREFABS = [
	'corridor.fbx',
	'corridor.fbx',
	'corridor.fbx',
	'corner.fbx',
	'corner.fbx',
	'corner.fbx',
	'corner.fbx',
	'cross.fbx',
	'tjunction.fbx',
	'tjunction.fbx',
	'tjunction.fbx',
	'tjunction.fbx',
	'dome.fbx',
	'tanks.fbx',
	'model.fbx',
];
const ROTATIONS = [
	new THREE.Vector3(0, 0, 0),
	new THREE.Vector3(Math.PI / 2, 0, Math.PI / 2),
	new THREE.Vector3(Math.PI / 2, 0, 0),
	new THREE.Vector3(Math.PI / 2, 0, 0),
	new THREE.Vector3(Math.PI / 2, 0, -Math.PI / 2),
	new THREE.Vector3(Math.PI / 2, 0, (-Math.PI * 3) / 2),
	new THREE.Vector3(Math.PI / 2, 0, -Math.PI),
	new THREE.Vector3(Math.PI / 2, 0, 0),
	new THREE.Vector3(Math.PI / 2, 0, 0),
	new THREE.Vector3(Math.PI / 2, 0, Math.PI / 2),
	new THREE.Vector3(Math.PI / 2, 0, (Math.PI * 3) / 2),
	new THREE.Vector3(Math.PI / 2, 0, -Math.PI),
	new THREE.Vector3(0, 0, 0),
	new THREE.Vector3(0, 0, 0),
	new THREE.Vector3(0, 0, 0),
];
const SCALES = [
	new THREE.Vector3(0.01 * 0.75, 0.02 * 0.75, 0.01 * 0.75),
	new THREE.Vector3(0.01 * 0.75, 0.02 * 0.75, 0.01 * 0.75),
	new THREE.Vector3(0.01 * 0.75, 0.02 * 0.75, 0.01 * 0.75),
	new THREE.Vector3(0.01 * 0.75, 0.02 * 0.75, 0.01 * 0.75),
	new THREE.Vector3(0.01 * 0.75, 0.02 * 0.75, 0.01 * 0.75),
	new THREE.Vector3(0.01 * 0.75, 0.02 * 0.75, 0.01 * 0.75),
	new THREE.Vector3(0.01 * 0.75, 0.02 * 0.75, 0.01 * 0.75),
	new THREE.Vector3(0.01 * 0.75, 0.02 * 0.75, 0.01 * 0.75),
	new THREE.Vector3(0.01 * 0.75, 0.02 * 0.75, 0.01 * 0.75),
	new THREE.Vector3(0.01 * 0.75, 0.02 * 0.75, 0.01 * 0.75),
	new THREE.Vector3(0.01 * 0.75, 0.02 * 0.75, 0.01 * 0.75),
	new THREE.Vector3(0.01 * 0.75, 0.02 * 0.75, 0.01 * 0.75),
	new THREE.Vector3(0.015, 0.015, 0.015),
	new THREE.Vector3(0.01, 0.01, 0.005),
	new THREE.Vector3(0.01, 0.01, 0.01),
];

async function loadPrefab(path, index) {
	return new Promise((resolve, reject) => {
		loader.load(
			path,
			(object) => {
				object.scale.set(
					SCALES[index].x,
					SCALES[index].y,
					SCALES[index].z,
				);
				// object.scale.set(0.01 * 0.75, 0.02 * 0.75, 0.01 * 0.75);

				const box = new THREE.Box3().setFromObject(object);
				const center = box.getCenter(new THREE.Vector3());

				// object.position.x -= center.x;
				// object.position.z -= center.z;
				// object.position.y -= center.y;

				object.rotation.set(
					ROTATIONS[index].x,
					ROTATIONS[index].y,
					ROTATIONS[index].z,
				);

				object.traverse((child) => {
					if (!child.isMesh) return;

					const mat = child.material;

					if (mat) {
						mat.transparent = false;
						mat.opacity = 1;

						if ('alphaMap' in mat) mat.alphaMap = null;

						mat.depthWrite = true;
						mat.depthTest = true;
						mat.needsUpdate = true;
					}
				});

				const height = new THREE.Box3()
					.setFromObject(object)
					.getSize(new THREE.Vector3()).y;

				resolve({
					object,
					height,
				});
			},
			undefined,
			reject,
		);
	});
}

export default async function renderCity(matrix, colors) {
	const scene = [];

	const cellSize = 2;
	const gap = 0.3;
	const spacing = cellSize + gap;

	const rows = matrix.length;
	const cols = matrix[0].length;

	const cityWidth = cols * spacing;
	const cityDepth = rows * spacing;

	const offsetX = -(cityWidth - spacing) / 2;
	const offsetZ = -(cityDepth - spacing) / 2;

	const planeGeometry = new THREE.PlaneGeometry(spacing, spacing);

	const materials = colors.map(
		(color) =>
			new THREE.MeshStandardMaterial({
				color,
			}),
	);

	// --------------------------------------------------
	// Load all prefab FBXs once
	// --------------------------------------------------

	const prefabAssets = {};

	await Promise.all(
		Object.entries(PREFABS).map(async ([prefabId, path]) => {
			prefabAssets[prefabId] = await loadPrefab(path, prefabId);
		}),
	);

	// --------------------------------------------------
	// Collect matrices per prefab
	// --------------------------------------------------

	const prefabMatrices = {};

	for (const prefabId of Object.keys(prefabAssets)) {
		prefabMatrices[prefabId] = [];
	}

	const dummy = new THREE.Object3D();

	let roadIndex = 0;

	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < cols; col++) {
			const prefabId = matrix[row][col];

			if (prefabId === 0) continue;

			const x = col * spacing + offsetX;
			const z = row * spacing + offsetZ;

			const asset = prefabAssets[prefabId];

			if (!asset) continue;

			// const floors = Math.floor(random() * 5) + 1;

			// for (let floor = 0; floor < floors; floor++) {
			dummy.position.set(x, asset.height * 0, z);

			dummy.rotation.set(
				asset.object.rotation.x,
				asset.object.rotation.y,
				asset.object.rotation.z,
			);

			const scale = prefabId < 12 ? 1 : random() * 2 + 1;

			dummy.scale.set(
				asset.object.scale.x * scale,
				asset.object.scale.y * scale,
				asset.object.scale.z * scale,
			);

			dummy.updateMatrix();

			prefabMatrices[prefabId].push(dummy.matrix.clone());
			// }
		}
	}

	// --------------------------------------------------
	// Create InstancedMeshes
	// --------------------------------------------------

	for (const [prefabId, asset] of Object.entries(prefabAssets)) {
		const matrices = prefabMatrices[prefabId];

		if (!matrices || matrices.length === 0) continue;

		asset.object.traverse((child) => {
			if (!child.isMesh) return;

			const instanced = new THREE.InstancedMesh(
				child.geometry,
				child.material,
				matrices.length,
			);

			for (let i = 0; i < matrices.length; i++) {
				instanced.setMatrixAt(i, matrices[i]);
			}

			instanced.instanceMatrix.needsUpdate = true;

			scene.push(instanced);
		});
	}

	return scene;
}
