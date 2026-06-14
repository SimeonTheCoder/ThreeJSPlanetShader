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

import { random, randomWithSeed, resetRandom } from './random.js';

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

const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const sun = new THREE.DirectionalLight('#ffffff', 1);
sun.position.set(0, 1, 1);
sun.target.position.set(0, 0, 0);
sun.target.updateMatrixWorld();
sun.updateMatrixWorld();
sun.shadowMapWidth = 2048;
sun.shadowMapHeight = 2048;
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

const atmosphere = new THREE.Mesh(
	new THREE.SphereGeometry(500, 300, 300),
	skyShader.material,
);

const dome = new THREE.Mesh(
	new THREE.SphereGeometry(100, 32, 32),
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

function mix(a, b, t) {
	return new THREE.Vector3(
		a.x * (1 - t) + b.x * t,
		a.y * (1 - t) + b.y * t,
		a.z * (1 - t) + b.z * t,
	);
}

function calculateAmbientColor(lightDir, ATMOSPHERE_COLOR) {
	const sun = Math.max(0.0, lightDir.dot(new THREE.Vector3(0, 1, 0)));
	const haze = Math.max(
		0.0,
		new THREE.Vector3(0, 1, 0)
			.normalize()
			.dot(new THREE.Vector3(0.0, 1.0, 0.0)),
	);
	const day = Math.max(0.0, lightDir.dot(new THREE.Vector3(0.0, 1.0, 0.0)));

	const longDay = Math.max(
		0.0,
		(lightDir.dot(new THREE.Vector3(0.0, 1.0, 0.0)) + 1.0) / 2.0,
	);

	const sunsetMask = sun * (1.0 - haze) * (1.0 - day) * 1.0;
	const sunsetColor = mix(
		new THREE.Vector3(
			1 - ATMOSPHERE_COLOR.x,
			1 - ATMOSPHERE_COLOR.y,
			1 - ATMOSPHERE_COLOR.z,
		),
		new THREE.Vector3(
			1 - ATMOSPHERE_COLOR.x * 3,
			1 - ATMOSPHERE_COLOR.y * 3,
			1 - ATMOSPHERE_COLOR.z * 3,
		),
		Math.pow(Math.min(1.0, Math.max(0.0, (0.2 - day) * 5.0)), 2.0),
	);

	const dayColor = mix(
		mix(
			new THREE.Vector3(
				1 - ATMOSPHERE_COLOR.x,
				1 - ATMOSPHERE_COLOR.y,
				1 - ATMOSPHERE_COLOR.z,
			),
			ATMOSPHERE_COLOR,
			day,
		),
		ATMOSPHERE_COLOR,
		haze,
	).multiplyScalar(longDay * 1.5);

	return mix(dayColor, sunsetColor, sunsetMask);
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

	const ambientColor = calculateAmbientColor(
		skyShader.uniforms.lightDir.value,
		skyShader.uniforms.ATMOSPHERE_COLOR.value,
	);

	ambientLight.intensity = skyShader.uniforms.hasAtmosphere.value
		? Math.max(
				0,
				skyShader.uniforms.lightDir.value.dot(
					new THREE.Vector3(0, 1, 0),
				) *
					0.7 +
					0.3,
			) * 1.5
		: 0;

	ambientLight.color = new THREE.Color().setRGB(
		ambientColor.x,
		ambientColor.y,
		ambientColor.z,
	);

	sun.intensity =
		Math.max(
			0,
			skyShader.uniforms.lightDir.value.dot(new THREE.Vector3(0, 1, 0)),
		) * 1.5;

	renderer.render(scene, camera);
}

export function selectPlanet(planet) {
	setPlanet(planet);
	setTerrain(planet);
	setSky(planet);

	updateScene(planet);
}

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

function setTerrain(planet) {
	const u = terrainShader.uniforms;

	u.hasWater.value = planet.hasWater;
	u.hasAtmosphere.value = planet.hasAtmosphere;

	u.ATMOSPHERE_COLOR.value = planet.atmosphereColor.clone();
	u.GROUND_COLOR.value = planet.groundColor.clone();

	u.SEED.value = planet.seed;
}

function setSky(planet) {
	const u = skyShader.uniforms;

	u.ATMOSPHERE_COLOR.value = planet.atmosphereColor.clone();

	u.hasAtmosphere.value = planet.hasAtmosphere;
	u.hasWater.value = planet.hasWater;
	u.SEED.value = planet.seed;
}

const fieldWidth = 30 * 3;
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
	1,
);

let cityObjects = await renderCity(field, [
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
// const recorder = new CanvasRecorder(canvas, {
// 	fps: 60,
// 	duration: 30, // seconds
// 	filename: 'my-animation',
// 	// mimeType: 'video/webm',
// });

async function updateScene(newPlanet) {
	terrainShader.uniforms.SEED.value = planetShader.uniforms.SEED.value;
	terrainMesh.geometry = await createTerrain(
		scene,
		planetShader.uniforms.SEED.value,
	);

	planetShader.uniforms.lightDir.value = calculateLightDir();
	terrainShader.uniforms.lightDir.value = calculateLightDir();

	planetShader.uniforms.planetPos.value.copy(planetObj.position);

	//lightAngleDegrees += 5.0 / 60.0 * 3.0;
	planetShader.uniforms.cameraPos.value.copy(camera.position);

	dome.visible = !newPlanet.hasAtmosphere;

	const density = randomWithSeed(newPlanet.seed) ** 1 * 30;

	let newField = generateField(
		fieldWidth,
		fieldHeight,
		modules,
		(i, j) => {
			const x =
				((j - fieldWidth / 6) / fieldWidth) *
				6 *
				Math.sqrt(density / 30) *
				2;
			const y =
				((i - fieldHeight / 6) / fieldHeight) *
				6 *
				Math.sqrt(density / 30) *
				2;

			const d = x * x + y * y;

			const radius = 0.8;

			return d < radius ? -1 : 0;
			// return 0;
		},
		density,
		planetShader.uniforms.SEED.value,
	);

	console.log(newField);

	for (let i = 0; i < field.length; i++) {
		for (let j = 0; j < field[i].length; j++) {
			field[i][j] = newField[i][j];
		}
	}

	const currCity = await renderCity(field, [
		'gray',
		'green',
		'red',
		'blue',
		'pink',
	]);

	console.log(isSpaceView);

	for (let obj of currCity) {
		scene.add(obj);
		obj.visible = isSpaceView;
	}

	for (let obj of cityObjects) {
		scene.remove(obj);
	}

	cityObjects = currCity;
}

function randomPlanet(seed) {
	resetRandom();

	const newPlanet = {
		seed: seed,
	};

	newPlanet.hasWater = randomWithSeed(newPlanet.seed) > 0.3;
	newPlanet.hasAtmosphere = randomWithSeed(newPlanet.seed) > 0.2;
	newPlanet.isGasGiant = randomWithSeed(newPlanet.seed) > 0.8;
	newPlanet.groundColor = new THREE.Vector3(
		randomWithSeed(newPlanet.seed),
		randomWithSeed(newPlanet.seed),
		randomWithSeed(newPlanet.seed),
	);
	newPlanet.waterColor = new THREE.Vector3(
		randomWithSeed(newPlanet.seed),
		randomWithSeed(newPlanet.seed),
		randomWithSeed(newPlanet.seed),
	);
	newPlanet.atmosphereColor = new THREE.Vector3(
		randomWithSeed(newPlanet.seed),
		randomWithSeed(newPlanet.seed),
		randomWithSeed(newPlanet.seed),
	);
	newPlanet.cloudColor = new THREE.Vector3(
		randomWithSeed(newPlanet.seed),
		randomWithSeed(newPlanet.seed),
		randomWithSeed(newPlanet.seed),
	);

	return newPlanet;
}

window.addEventListener('keydown', async (e) => {
	if (e.key == ',') {
		lightAngleDegrees += 10;
	} else if (e.key == '.') {
		lightAngleDegrees -= 10;
	}

	// if (e.key == 'j') recorder.start();
	if (e.key == 'p') paused = !paused;
	if (e.key == 't') toggleScene();

	if (e.key == 'r') {
		const newPlanet = randomPlanet(Math.random());
		selectPlanet(newPlanet);
	}
});

toggleScene();
// selectPlanet(randomPlanet(12));

await selectPlanet({
	seed: 1024,
	hasWater: true,
	hasAtmosphere: true,
	isGasGiant: false,
	groundColor: new THREE.Vector3(1.0, 0.0, 0.0),
	atmosphereColor: new THREE.Vector3(1.0, 0.5, 0.0),
	waterColor: new THREE.Vector3(1.0, 1.0, 0.0),
	cloudColor: new THREE.Vector3(1.0, 0.0, 1.0),
});
