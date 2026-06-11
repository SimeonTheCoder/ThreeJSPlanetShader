import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { PlanetShader } from './shaders/planet-shader.js';
import { TerrainShader } from './shaders/terrain-shader.js';
import { generatePerlinNoiseTexture } from './generators.js';
import { createTerrain } from './terrain.js';
import { SkyShader } from './shaders/sky-shader.js';

const width = window.innerWidth;
const height = window.innerHeight;

const scene = new THREE.Scene();

const light = new THREE.DirectionalLight('#ffffff', 1);
light.position.set(0, 1, 1);
light.target.position.set(0, 0, 0);
light.target.updateMatrixWorld();
light.updateMatrixWorld();
scene.add(light);
scene.add(light.target);

const camera = new THREE.PerspectiveCamera(90, width / height, 0.1, 1000);

const orbitDistance = 10;
camera.position.z = orbitDistance;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(width, height);

const controls = new OrbitControls(camera, renderer.domElement);
// configureControls();

function configureControls() {
	controls.autoRotate = true;
	controls.autoRotateSpeed = 0.5;
	controls.enableDamping = true;
	controls.enablePan = false;
	controls.enableZoom = false;
}

document.body.appendChild(renderer.domElement);

const planetGeometry = new THREE.SphereGeometry(1, 128, 128);

const loader = await new THREE.TextureLoader();
const noiseTexture = await loader.loadAsync('./textures/noise.png');
noiseTexture.minFilter = THREE.LinearFilter;
noiseTexture.magFilter = THREE.LinearFilter;
noiseTexture.generateMipmaps = false;
noiseTexture.colorSpace = THREE.NoColorSpace;
noiseTexture.needsUpdate = true;

// const noiseTexture = generatePerlinNoiseTexture(1024, 1024);

const planetShader = await new PlanetShader({
	perlinNoiseTex: noiseTexture,
}).init();

const planetObj = new THREE.Mesh(planetGeometry, planetShader.material);
planetObj.position.x = 1;
// scene.add(planetObj);

const terrainGeometry = await createTerrain(scene);

const terrainShader = await new TerrainShader({
	perlinNoiseTex: noiseTexture,
}).init();

const terrainMesh = new THREE.Mesh(terrainGeometry, terrainShader.material);
scene.add(terrainMesh);

const skyShader = await new SkyShader({
	perlinNoiseTex: noiseTexture,
}).init();

const atmosphere = new THREE.Mesh(
	new THREE.SphereGeometry(500, 300, 300),
	skyShader.material,
);
scene.add(atmosphere);

let lightAngleDegrees = 45.0;

renderer.setAnimationLoop(frame);

function calculateLightDir() {
	const lightAngleRadians = (lightAngleDegrees / 180.0) * Math.PI;
	const lightDir = new THREE.Vector3(
		Math.cos(lightAngleRadians),
		0,
		Math.sin(lightAngleRadians),
	);
	// const lightDir = new THREE.Vector3(
	// 	light.position.x - light.target.position.x,
	// 	light.position.y - light.target.position.y,
	// 	light.position.z - light.target.position.z,
	// );
	// const lightDir = light.target;
	// const lightDir = new THREE.Vector3(Math.sin(lightAngleRadians), Math.cos(lightAngleRadians), 0);

	// lightDir.applyMatrix4(camera.matrixWorldInverse);
	lightDir.normalize();

	return lightDir;
}

const clock = new THREE.Clock();

function frame() {
	const lightDir = calculateLightDir();

	planetShader.uniforms.lightDir.value = lightDir;
	terrainShader.uniforms.lightDir.value = new THREE.Vector3(
		lightDir.x,
		lightDir.z,
		0,
	).normalize();
	skyShader.uniforms.lightDir.value = new THREE.Vector3(
		lightDir.x,
		lightDir.z,
		0,
	).normalize();

	planetShader.uniforms.planetPos.value.copy(planetObj.position);

	lightAngleDegrees += clock.getDelta() * 5;
	planetShader.uniforms.cameraPos.value.copy(camera.position);
	terrainShader.uniforms.cameraPos.value.copy(camera.position);

	planetShader.uniforms.time.value = clock.getElapsedTime();
	skyShader.uniforms.time.value = clock.getElapsedTime();

	// planetObj.rotation.y += 0.001 * 3.0;
	//planetObj.rotation.x = 0.5;

	controls.update();

	renderer.render(scene, camera);
}

window.addEventListener('keydown', async (e) => {
	if (e.key == ',') {
		lightAngleDegrees += 10;
	} else if (e.key == '.') {
		lightAngleDegrees -= 10;
	}

	if (e.key == 'r') {
		const u = planetShader.uniforms;

		u.hasWater.value = Math.random() > 0.3;
		u.hasAtmosphere.value = Math.random() > 0.2;
		u.isGasGiant.value = Math.random() > 0.8;

		u.GROUND_COLOR.value.set(Math.random(), Math.random(), Math.random());
		u.WATER_COLOR.value.set(Math.random(), Math.random(), Math.random());
		u.ATMOSPHERE_COLOR.value.set(
			Math.random(),
			Math.random(),
			Math.random(),
		);
		u.CLOUD_COLOR.value.set(Math.random(), Math.random(), Math.random());

		u.SEED.value = Math.random() * 999;

		// u.perlinNoiseTex.value = convertArrToTexture(
		// 	generatePerlinNoiseTexture(1024, 1024),
		// );

		planetShader.uniforms.lightDir.value = calculateLightDir();
		terrainShader.uniforms.lightDir.value = calculateLightDir();

		planetShader.uniforms.planetPos.value.copy(planetObj.position);

		//lightAngleDegrees += 5.0 / 60.0 * 3.0;
		planetShader.uniforms.cameraPos.value.copy(camera.position);
	}
});
