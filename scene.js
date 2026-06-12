import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

import { PlanetShader } from './shaders/planet-shader.js';
import { TerrainShader } from './shaders/terrain-shader.js';
import { SkyShader } from './shaders/sky-shader.js';

import { createTerrain } from './terrain.js';

const textureLoader = new THREE.TextureLoader();

async function loadSharedNoiseTexture() {
	const tex = await textureLoader.loadAsync('./textures/noise.png');

	tex.minFilter = THREE.LinearFilter;
	tex.magFilter = THREE.LinearFilter;
	tex.generateMipmaps = false;
	tex.colorSpace = THREE.NoColorSpace;
	tex.needsUpdate = true;

	return tex;
}

const sharedNoiseTexture = await loadSharedNoiseTexture();

export async function createPlanetViewer({
	parent,
	width = 400,
	height = 400,
} = {}) {
	//--------------------------------------------------
	// Scene
	//--------------------------------------------------

	const scene = new THREE.Scene();

	const camera = new THREE.PerspectiveCamera(90, width / height, 0.1, 1000);

	camera.position.z = 10;

	const renderer = new THREE.WebGLRenderer({
		antialias: true,
	});

	renderer.setSize(width, height);

	parent.appendChild(renderer.domElement);

	//--------------------------------------------------
	// Controls
	//--------------------------------------------------

	const controls = new OrbitControls(camera, renderer.domElement);

	controls.autoRotate = true;
	controls.autoRotateSpeed = 0.5;
	controls.enableDamping = true;
	controls.enablePan = false;
	controls.enableZoom = false;

	//--------------------------------------------------
	// Light
	//--------------------------------------------------

	const light = new THREE.DirectionalLight('#fff', 1);

	light.position.set(0, 1, 1);

	light.target.position.set(0, 0, 0);
	light.target.updateMatrixWorld();

	scene.add(light);
	scene.add(light.target);

	//--------------------------------------------------
	// Geometry
	//--------------------------------------------------

	const planetGeometry = new THREE.SphereGeometry(5, 128, 128);

	//--------------------------------------------------
	// Shaders
	//--------------------------------------------------

	const planetShader = await new PlanetShader({
		perlinNoiseTex: sharedNoiseTexture,
	}).init();

	const terrainShader = await new TerrainShader({
		perlinNoiseTex: sharedNoiseTexture,
	}).init();

	const skyShader = await new SkyShader({
		perlinNoiseTex: sharedNoiseTexture,
	}).init();

	//--------------------------------------------------
	// Meshes
	//--------------------------------------------------

	const planetMesh = new THREE.Mesh(planetGeometry, planetShader.material);

	scene.add(planetMesh);

	const terrainGeometry = await createTerrain(scene);

	const terrainMesh = new THREE.Mesh(terrainGeometry, terrainShader.material);

	// scene.add(terrainMesh);

	const atmosphere = new THREE.Mesh(
		new THREE.SphereGeometry(500, 300, 300),
		skyShader.material,
	);

	// scene.add(atmosphere);

	//--------------------------------------------------
	// Animation state
	//--------------------------------------------------

	let lightAngleDegrees = 45;

	const clock = new THREE.Clock();

	function calculateLightDir() {
		const radians = (lightAngleDegrees / 180) * Math.PI;

		return new THREE.Vector3(
			Math.cos(radians),
			0,
			Math.sin(radians),
		).normalize();
	}

	function frame() {
		const lightDir = calculateLightDir();

		planetShader.uniforms.lightDir.value.copy(lightDir);

		terrainShader.uniforms.lightDir.value
			.set(lightDir.x, lightDir.z, 0)
			.normalize();

		skyShader.uniforms.lightDir.value
			.set(lightDir.x, lightDir.z, 0)
			.normalize();

		planetShader.uniforms.planetPos.value.copy(planetMesh.position);

		lightAngleDegrees += clock.getDelta() * 5;

		planetShader.uniforms.cameraPos.value.copy(camera.position);

		terrainShader.uniforms.cameraPos.value.copy(camera.position);

		planetShader.uniforms.time.value = clock.getElapsedTime();

		skyShader.uniforms.time.value = clock.getElapsedTime();

		controls.update();

		renderer.render(scene, camera);
	}

	renderer.setAnimationLoop(frame);

	//--------------------------------------------------
	// Public API
	//--------------------------------------------------

	function setPlanet(planet) {
		const u = planetShader.uniforms;

		u.hasWater.value = planet.hasWater;
		u.hasAtmosphere.value = planet.hasAtmosphere;
		u.isGasGiant.value = planet.isGasGiant;

		u.GROUND_COLOR.value = planet.groundColor.clone();

		u.WATER_COLOR.value = planet.waterColor.clone();

		u.ATMOSPHERE_COLOR.value = planet.atmosphereColor.clone();

		u.CLOUD_COLOR.value = planet.cloudColor
			? planet.cloudColor.clone()
			: new THREE.Vector3(1, 1, 1);

		u.SEED.value = planet.seed;
	}

	function dispose() {
		renderer.setAnimationLoop(null);

		controls.dispose();
		renderer.dispose();

		parent.removeChild(renderer.domElement);
	}

	return {
		scene,
		camera,
		renderer,
		controls,
		setPlanet,
		dispose,
	};
}

const container1 = document.getElementById('planet1');
const container2 = document.getElementById('planet2');
const container3 = document.getElementById('planet3');

const viewer1 = await createPlanetViewer({
	parent: container1,
	width: 400,
	height: 400,
});

const viewer2 = await createPlanetViewer({
	parent: container2,
	width: 400,
	height: 400,
});

const viewer3 = await createPlanetViewer({
	parent: container3,
	width: 400,
	height: 400,
});

viewer1.setPlanet({
	hasWater: true,
	hasAtmosphere: true,
	isGasGiant: false,
	groundColor: new THREE.Vector3(0.3, 0.8, 0.2),
	waterColor: new THREE.Vector3(0.1, 0.2, 1.0),
	atmosphereColor: new THREE.Vector3(0.5, 0.8, 1.0),
	cloudColor: new THREE.Vector3(1, 1, 1),
	seed: 123,
});

viewer2.setPlanet({
	hasWater: false,
	hasAtmosphere: false,
	isGasGiant: false,
	groundColor: new THREE.Vector3(0.7, 0.2, 0.1),
	waterColor: new THREE.Vector3(),
	atmosphereColor: new THREE.Vector3(),
	cloudColor: new THREE.Vector3(),
	seed: 456,
});

viewer3.setPlanet({
	hasWater: false,
	hasAtmosphere: true,
	isGasGiant: true,
	groundColor: new THREE.Vector3(1.0, 0.7, 0.2),
	waterColor: new THREE.Vector3(),
	atmosphereColor: new THREE.Vector3(1.0, 0.6, 0.2),
	cloudColor: new THREE.Vector3(1, 1, 1),
	seed: 789,
});
