import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { PlanetShader } from './shaders/planet-shader.js';
import { generatePerlinNoiseTexture } from './generators.js';

const width = window.innerWidth;
const height = window.innerHeight;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(90, width / height, 0.1, 1000);

const orbitDistance = 1.6;
camera.position.z = orbitDistance;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(width, height);

const controls = new OrbitControls(camera, renderer.domElement);
configureControls();

function configureControls() {
	controls.autoRotate = true;
	controls.autoRotateSpeed = 0.5;
	controls.enableDamping = true;
	controls.enablePan = false;
	controls.enableZoom = false;
}

document.body.appendChild(renderer.domElement);

const planetGeometry = new THREE.SphereGeometry(1, 128, 128);

function convertArrToTexture(data2D) {
	const width = data2D[0].length;
	const height = data2D.length;

	const data = new Uint8Array(width * height); // RGB

	let index = 0;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const value = data2D[y][x] * 255;

			data[index++] = value; // R
			// data[index++] = value; // G
			// data[index++] = value; // B
		}
	}

	const texture = new THREE.DataTexture(data, width, height, THREE.RedFormat);

	texture.minFilter = THREE.LinearFilter;
	texture.magFilter = THREE.LinearFilter;
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.generateMipmaps = false;

	texture.needsUpdate = true;
	return texture;
}

const noiseTexture = convertArrToTexture(
	generatePerlinNoiseTexture(1024, 1024),
);

const planetShader = await new PlanetShader({
	perlinNoiseTex: noiseTexture,
}).init();

const planetObj = new THREE.Mesh(planetGeometry, planetShader.material);
// planetObj.position.x = 1;
scene.add(planetObj);

let lightAngleDegrees = 45.0;

renderer.setAnimationLoop(frame);

function calculateLightDir() {
	const lightAngleRadians = (lightAngleDegrees / 180.0) * Math.PI;
	const lightDir = new THREE.Vector3(
		Math.cos(lightAngleRadians),
		0,
		Math.sin(lightAngleRadians),
	);
	// const lightDir = new THREE.Vector3(Math.sin(lightAngleRadians), Math.cos(lightAngleRadians), 0);

	//lightDir.applyMatrix4(camera.matrixWorldInverse);
	lightDir.normalize();

	return lightDir;
}

const clock = new THREE.Clock();

function frame() {
	planetShader.uniforms.lightDir.value = calculateLightDir();
	planetShader.uniforms.planetPos.value.copy(planetObj.position);

	lightAngleDegrees += clock.getDelta() * 5;
	planetShader.uniforms.cameraPos.value.copy(camera.position);

	planetShader.uniforms.time.value = clock.getElapsedTime();

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
		planetShader.uniforms.planetPos.value.copy(planetObj.position);

		//lightAngleDegrees += 5.0 / 60.0 * 3.0;
		planetShader.uniforms.cameraPos.value.copy(camera.position);
	}
});
