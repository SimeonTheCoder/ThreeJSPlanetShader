import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
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

const planetShader = await new PlanetShader({
	surfaceTex: new THREE.TextureLoader().load(
		'./textures/8k_earth_daymap.jpg',
	),
	cloudsTex: new THREE.TextureLoader().load('./textures/8k_earth_clouds.jpg'),
	nightTex: new THREE.TextureLoader().load(
		'./textures/8k_earth_nightmap.jpg',
	),
	specularMapTex: new THREE.TextureLoader().load(
		'./textures/8k_earth_specular_map.jpg',
	),
	normalMapTex: new THREE.TextureLoader().load(
		'./textures/8k_earth_normal_map.jpg',
	),
	perlinNoiseTex: convertArrToTexture(generatePerlinNoiseTexture(1024, 1024)),
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

function frame() {
	planetShader.uniforms.lightDir.value = calculateLightDir();
	planetShader.uniforms.planetPos.value.copy(planetObj.position);

	//lightAngleDegrees += 5.0 / 60.0 * 3.0;
	planetShader.uniforms.cameraPos.value.copy(camera.position);

	//planetObj.rotation.y += 0.001 * 3.0;
	//planetObj.rotation.x = 0.5;

	renderer.render(scene, camera);
}

function handleMouse(e) {
	const horizontalInput = (e.clientX / width - 0.5) * 2;
	const verticalInput = (e.clientY / height - 0.5) * 1.0;

	const inputAngleHorizontal = horizontalInput * Math.PI;
	const inputAngleVertical = verticalInput * Math.PI;

	const newAngleHorizontal = (1 / 2) * Math.PI + inputAngleHorizontal;

	const camPosX =
		Math.cos(newAngleHorizontal) *
		Math.cos(inputAngleVertical) *
		orbitDistance;
	const camPosY = Math.sin(inputAngleVertical) * orbitDistance;
	const camPosZ =
		Math.sin(newAngleHorizontal) *
		Math.cos(inputAngleVertical) *
		orbitDistance;

	camera.position.x = camPosX;
	camera.position.y = camPosY;
	camera.position.z = camPosZ;

	camera.lookAt(0, 0, 0);
	//camera.rotation.y = -inputAngle;
}

window.addEventListener('mousemove', handleMouse);
window.addEventListener('keydown', (e) => {
	if (e.key == ',') {
		lightAngleDegrees += 10;
	} else if (e.key == '.') {
		lightAngleDegrees -= 10;
	}
});
