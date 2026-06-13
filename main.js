import * as THREE from 'three';
import { FBXLoader } from 'https://unpkg.com/three@0.179.1/examples/jsm/loaders/FBXLoader.js';

const manager = new THREE.LoadingManager();
const loader = new FBXLoader(manager);

// THIS is the magic line
manager.setURLModifier((url) => {
	return './assets/' + url.split(/[/\\]/).pop();
});

export default async function renderCity(matrix, colors) {
	const scene = [];

	const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
	scene.push(ambientLight);

	// const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
	// directionalLight.position.set(20, 30, 20);
	// directionalLight.castShadow = true;
	// scene.push(directionalLight);

	// scene.push(new THREE.AxesHelper(500));

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

	// -----------------------
	// Load FBX
	// -----------------------

	const buildingPrefab = await new Promise((resolve, reject) => {
		loader.load(
			'./model.fbx',
			(object) => {
				object.scale.setScalar(0.01);

				const box = new THREE.Box3().setFromObject(object);
				const center = box.getCenter(new THREE.Vector3());

				// center X/Z
				object.position.x -= center.x;
				object.position.z -= center.z;

				// align bottom to ground
				object.position.y -= box.min.y;

				object.traverse((child) => {
					if (child.isMesh) {
						child.castShadow = true;
						child.receiveShadow = true;

						const mat = child.material;

						if (mat) {
							mat.transparent = false;
							mat.opacity = 1;

							// kill accidental alpha maps
							if ('alphaMap' in mat) mat.alphaMap = null;

							mat.depthWrite = true;
							mat.depthTest = true;

							mat.needsUpdate = true;
						}
					}
				});

				resolve(object);
			},
			undefined,
			reject,
		);
	});

	// Measure height AFTER centering
	const buildingHeight = new THREE.Box3()
		.setFromObject(buildingPrefab)
		.getSize(new THREE.Vector3()).y;

	console.log('Building height:', buildingHeight);

	// -----------------------
	// Materials
	// -----------------------

	const materials = colors.map(
		(color) =>
			new THREE.MeshStandardMaterial({
				color,
			}),
	);

	generateCity();
	// ============================================================
	// City
	// ============================================================

	function generateCity() {
		const dummy = new THREE.Object3D();
		dummy.receiveShadow = true;
		dummy.castShadow = true;

		let roadCount = 0;

		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < cols; col++) {
				if (matrix[row][col] === 1) {
					roadCount++;
				}
			}
		}

		const roads = new THREE.InstancedMesh(
			planeGeometry,
			materials[0],
			roadCount,
		);

		roads.receiveShadow = true;

		scene.push(roads);

		let roadIndex = 0;

		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < cols; col++) {
				const prefabId = matrix[row][col];

				if (prefabId === 0) continue;

				const x = col * spacing + offsetX;
				const z = row * spacing + offsetZ;

				// Roads
				if (prefabId === 1) {
					dummy.position.set(x, 0.05, z);
					dummy.rotation.set(-Math.PI / 2, 0, 0);
					dummy.scale.set(1, 1, 1);

					dummy.updateMatrix();

					roads.setMatrixAt(roadIndex++, dummy.matrix);

					continue;
				}

				// Buildings
				const floors = Math.floor(Math.random() * 5) + 1;

				for (let floor = 0; floor < floors; floor++) {
					const section = buildingPrefab.clone(true);

					section.position.set(x, floor * buildingHeight, z);

					scene.push(section);
				}
			}
		}

		roads.instanceMatrix.needsUpdate = true;
	}

	return scene;
}
