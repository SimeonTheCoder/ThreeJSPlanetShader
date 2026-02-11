import * as THREE from 'three';
import { PlanetShader } from './shaders/planet-shader';

const width = window.innerWidth;
const height = window.innerHeight;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(90, width / height, 0.1, 1000);
camera.position.z = 2;

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

let lightAngleDegrees = 60.0;

function frame() {
    lightAngleDegrees += 5.0 / 60.0;
    planetShader.uniforms.lightAngleDegrees.value = lightAngleDegrees;
    planetShader.uniforms.cameraPos.value.copy(camera.position);

    planetObj.rotation.y += 0.001;
    planetObj.rotation.x = 0.5;

    renderer.render(scene, camera);
}

renderer.setAnimationLoop(frame);