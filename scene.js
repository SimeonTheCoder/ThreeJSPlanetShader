import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { PlanetShader } from './shaders/planet-shader.js';
import { TerrainShader } from './shaders/terrain-shader.js';
import { generatePerlinNoiseTexture } from './generators.js';
import { createTerrain } from './terrain.js';
import { SkyShader } from './shaders/sky-shader.js';

import renderCity from './main.js';
import { modules } from './modules.js';
import { generateField } from './wfc.js';

import { CanvasRecorder } from './node_modules/threejs-recorder/package/CanvasRecorder.js';
import { DomeShader } from './shaders/dome-shader.js';

let isSpaceView = true;

const width = window.innerWidth;
const height = window.innerHeight;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(90, width / height, 0.1, 1000);

const orbitDistance = 10;
camera.position.z = orbitDistance;

const renderer = new THREE.WebGLRenderer({ alpha: false });
renderer.setSize(width, height);

renderer.shadowMapEnabled = true;
renderer.shadowMapType = THREE.PCFSoftShadowMap;

const sun = new THREE.DirectionalLight('#ffffff', 1);
sun.position.set(0, 1, 1);
sun.target.position.set(0, 0, 0);
sun.target.updateMatrixWorld();
sun.updateMatrixWorld();
sun.shadowMapWidth = 2048;
sun.shadowMapHeight = 2048;
sun.castShadow = true;
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 100;
sun.shadow.camera.left = -50;
sun.shadow.camera.right = 50;
sun.shadow.camera.top = 50;
sun.shadow.camera.bottom = -50;
scene.add(sun);
scene.add(sun.target);

const controls = new OrbitControls(camera, renderer.domElement);
configureControls();

function configureControls() {
	controls.autoRotate = true;
	controls.autoRotateSpeed = 0.1;
	controls.enableDamping = true;
	// controls.enablePan = false;
	// controls.enableZoom = false;
}

document.body.appendChild(renderer.domElement);

const planetGeometry = new THREE.SphereGeometry(5, 128, 128);

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

const skyShader = await new SkyShader({
	perlinNoiseTex: noiseTexture,
}).init();

const terrainShader = await new TerrainShader({
	perlinNoiseTex: noiseTexture,
}).init();

const domeShader = await new DomeShader().init();

const planetObj = new THREE.Mesh(planetGeometry, planetShader.material);
let terrainGeometry = await createTerrain(
	scene,
	terrainShader.uniforms.SEED.value,
);

const terrainMesh = new THREE.Mesh(terrainGeometry, terrainShader.material);
terrainMesh.castShadow = true;

const atmosphere = new THREE.Mesh(
	new THREE.SphereGeometry(500, 300, 300),
	skyShader.material,
);

const dome = new THREE.Mesh(
	new THREE.SphereGeometry(50, 32, 32),
	domeShader.material,
);

scene.add(planetObj);
scene.add(terrainMesh);
scene.add(atmosphere);
scene.add(dome);

let lightAngleDegrees = 45.0;

renderer.setAnimationLoop(frame);

function calculateLightDir() {
	const lightAngleRadians = (lightAngleDegrees / 180.0) * Math.PI;
	const lightDir = new THREE.Vector3(
		Math.cos(lightAngleRadians),
		0,
		Math.sin(lightAngleRadians),
	);

	lightDir.normalize();

	return lightDir;
}

const clock = new THREE.Clock();

let paused = false;

function toggleScene() {
	isSpaceView = !isSpaceView;

	planetObj.visible = !isSpaceView;
	terrainMesh.visible = isSpaceView;
	dome.visible = isSpaceView;
	atmosphere.visible = isSpaceView;

	for (let obj of cityObjects) {
		obj.visible = isSpaceView;
	}
}

function frame() {
	const lightDir = calculateLightDir();

	sun.position.set(
		skyShader.uniforms.lightDir.value.x,
		skyShader.uniforms.lightDir.value.y,
		skyShader.uniforms.lightDir.value.z,
	);

	planetShader.uniforms.planetPos.value.copy(planetObj.position);
	planetShader.uniforms.cameraPos.value.copy(camera.position);
	planetShader.uniforms.time.value = !paused ? clock.getElapsedTime() : 0;
	planetShader.uniforms.lightDir.value = lightDir;

	// ligghtAnleDegrees += clock.getDelta() * 5;
	terrainShader.uniforms.cameraPos.value.copy(camera.position);
	skyShader.uniforms.time.value = !paused ? clock.getElapsedTime() : 0;

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
	domeShader.uniforms.lightDir.value = new THREE.Vector3(
		lightDir.x,
		lightDir.z,
		0,
	).normalize();

	// planetObj.rotation.y += 0.001 * 3.0;
	//planetObj.rotation.x = 0.5;

	if (!paused) {
		controls.update();
		// camera.rotateX((30 / 180) * Math.PI);
	}

	renderer.render(scene, camera);
}

export function setPlanet(planet) {
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

export function setTerrain(planet) {
	const u = terrainShader.uniforms;

	u.hasWater.value = planet.hasWater;
	u.hasAtmosphere.value = planet.hasAtmosphere;

	u.ATMOSPHERE_COLOR.value = planet.atmosphereColor.clone();
	u.GROUND_COLOR.value = planet.groundColor.clone();

	u.SEED.value = planet.seed;
}

export function setSky(planet) {
	const u = skyShader.uniforms;

	u.ATMOSPHERE_COLOR.value = planet.atmosphereColor.clone();

	u.hasAtmosphere.value = planet.hasAtmosphere;
	u.hasWater.value = planet.hasWater;
	u.SEED.value = planet.seed;
}

const fieldWidth = 10 * 3;
const fieldHeight = fieldWidth;

const offsetHeight = terrainGeometry.attributes.position.getY(
	Math.floor(terrainGeometry.attributes.position.count / 2),
);

terrainMesh.translateY(-offsetHeight);

const field = generateField(
	fieldWidth,
	fieldHeight,
	modules,
	(i, j) => {
		const x = ((j - fieldWidth / 6) / fieldWidth) * 6;
		const y = ((i - fieldHeight / 6) / fieldHeight) * 6;

		const d = x * x + y * y;

		const radius = 0.8;

		return d < radius ? -1 : 0;
		// return 0;
	},
	4,
);

const cityObjects = await renderCity(field, [
	'gray',
	'green',
	'red',
	'blue',
	'pink',
]);

for (let obj of cityObjects) {
	scene.add(obj);
}

// Get your canvas element
const canvas = renderer.domElement;

// Or with custom options
const recorder = new CanvasRecorder(canvas, {
	fps: 60,
	duration: 30, // seconds
	filename: 'my-animation',
	// mimeType: 'video/webm',
});

window.addEventListener('keydown', async (e) => {
	if (e.key == ',') {
		lightAngleDegrees += 10;
	} else if (e.key == '.') {
		lightAngleDegrees -= 10;
	}

	if (e.key == 'j') recorder.start();
	if (e.key == 'p') paused = !paused;
	if (e.key == 't') toggleScene();

	if (e.key == 'r') {
		const newPlanet = {
			hasWater: Math.random() > 0.3,
			hasAtmosphere: Math.random() > 0.2,
			isGasGiant: Math.random() > 0.8,
			groundColor: new THREE.Vector3(
				Math.random(),
				Math.random(),
				Math.random(),
			),
			waterColor: new THREE.Vector3(
				Math.random(),
				Math.random(),
				Math.random(),
			),
			atmosphereColor: new THREE.Vector3(
				Math.random(),
				Math.random(),
				Math.random(),
			),
			cloudColor: new THREE.Vector3(
				Math.random(),
				Math.random(),
				Math.random(),
			),
			seed: Math.random() * 999,
		};

		setPlanet(newPlanet);
		setTerrain(newPlanet);
		setSky(newPlanet);

		terrainShader.uniforms.SEED.value = planetShader.uniforms.SEED.value;
		terrainMesh.geometry = await createTerrain(
			scene,
			terrainShader.uniforms.SEED.value,
		);

		planetShader.uniforms.lightDir.value = calculateLightDir();
		terrainShader.uniforms.lightDir.value = calculateLightDir();

		planetShader.uniforms.planetPos.value.copy(planetObj.position);

		//lightAngleDegrees += 5.0 / 60.0 * 3.0;
		planetShader.uniforms.cameraPos.value.copy(camera.position);
	}
});

toggleScene();
