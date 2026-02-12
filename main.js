import * as THREE from 'three';
import { PlanetShader } from './shaders/planet-shader';

const width = window.innerWidth;
const height = window.innerHeight;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(90, width / height, 0.1, 1000);
camera.position.z = 1.6;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(width, height);

document.body.appendChild(renderer.domElement);

const planetGeometry = new THREE.SphereGeometry(1, 128, 128); 

const planetShader = new PlanetShader({
    surfaceTex: new THREE.TextureLoader().load("./textures/8k_earth_daymap.jpg"),
    cloudsTex: new THREE.TextureLoader().load("./textures/8k_earth_clouds.jpg"),
    nightTex: new THREE.TextureLoader().load("./textures/8k_earth_nightmap.jpg"),
    specularMapTex: new THREE.TextureLoader().load("./textures/8k_earth_specular_map.jpg"),
    normalMapTex: new THREE.TextureLoader().load("./textures/8k_earth_normal_map.jpg"),
});

const planetObj = new THREE.Mesh(planetGeometry, planetShader.material);
scene.add(planetObj);

let lightAngleDegrees = 45.0;

renderer.setAnimationLoop(frame);

function calculateLightDir() {
    const lightAngleRadians = lightAngleDegrees / 180.0 * Math.PI;
    const lightDir = new THREE.Vector3(Math.cos(lightAngleRadians), 0, Math.sin(lightAngleRadians));

    //lightDir.applyMatrix4(camera.matrixWorldInverse); 
    lightDir.normalize();

    return lightDir;
}

function frame() {
    planetShader.uniforms.lightDir.value = calculateLightDir();

    //lightAngleDegrees += 5.0 / 60.0 * 3.0;
    planetShader.uniforms.lightAngleDegrees.value = lightAngleDegrees;
    planetShader.uniforms.cameraPos.value.copy(camera.position);

    //planetObj.rotation.y += 0.001 * 3.0;
    //planetObj.rotation.x = 0.5;

    renderer.render(scene, camera);
}

window.addEventListener('mousemove', (e) => {
    const horizontalInput = ((e.clientX / width) - 0.5) * 2;
    const verticalInput = ((e.clientY / height) - 0.5) * 1.0;

    const inputAngleHorizontal = horizontalInput * Math.PI;
    const inputAngleVertical = verticalInput * Math.PI;
    
    const newAngleHorizontal = 1 / 2 * Math.PI + inputAngleHorizontal;

    const orbitDistance = 1.6;

    const camPosX = Math.cos(newAngleHorizontal) * Math.cos(inputAngleVertical) * orbitDistance;
    const camPosY = Math.sin(inputAngleVertical) * orbitDistance;
    const camPosZ = Math.sin(newAngleHorizontal) * Math.cos(inputAngleVertical) * orbitDistance;

    camera.position.x = camPosX;
    camera.position.y = camPosY;
    camera.position.z = camPosZ;

    camera.lookAt(0, 0, 0);
    //camera.rotation.y = -inputAngle;
});