import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

function random(uv) {
	const result =
		Math.sin(uv.dot(new THREE.Vector2(12.9898, 78.233))) * 43758.5453123;
	return result - Math.floor(result);
}

function randomGradient(uv) {
	const angle = random(uv) * 6.28;
	return new THREE.Vector2(Math.cos(angle), Math.sin(angle));
}

function lerp(a, b, t) {
	return (1 - t) * a + t * b;
}

function sampleGradient(floor, gradient, period) {
	const x = ((floor.x % period) + period) % period;
	const y = ((floor.y % period) + period) % period;
	return gradient[y][x];
}

function perlin(uv, gradient, scale) {
	const floor = new THREE.Vector2(Math.floor(uv.x), Math.floor(uv.y));
	const fract = new THREE.Vector2(uv.x - floor.x, uv.y - floor.y);

	// console.log(floor);

	// if (floor.x >= scale * 5 - 1) floor.x = 0;
	// if (floor.y >= scale * 5 - 1) floor.y = 0;

	const a = sampleGradient(floor, gradient, scale);
	const b = sampleGradient(
		new THREE.Vector2(floor.x + 1, floor.y),
		gradient,
		scale,
	);
	const c = sampleGradient(
		new THREE.Vector2(floor.x, floor.y + 1),
		gradient,
		scale,
	);
	const d = sampleGradient(
		new THREE.Vector2(floor.x + 1, floor.y + 1),
		gradient,
		scale,
	);

	const da = fract.clone();
	const db = fract.clone().add(new THREE.Vector2(-1, 0));
	const dc = fract.clone().add(new THREE.Vector2(0, -1));
	const dd = fract.clone().add(new THREE.Vector2(-1, -1));

	const u = new THREE.Vector2(
		fract.x * fract.x * (3 - 2 * fract.x),
		fract.y * fract.y * (3 - 2 * fract.y),
	);

	const dotA = a.dot(da);
	const dotB = b.dot(db);
	const dotC = c.dot(dc);
	const dotD = d.dot(dd);

	const ab = lerp(dotA, dotB, u.x);
	const cd = lerp(dotC, dotD, u.x);

	return lerp(ab, cd, u.y) / 2 + 0.5;
}

function octaveNoise(uv, gradient) {
	let result = 0;
	let multiplier = 1;

	for (let i = 1; i <= 8; i++) {
		result +=
			perlin(uv.clone().multiplyScalar(2 ** i), gradient, 2 ** i) *
			multiplier;
		multiplier /= 2;
	}

	return result / 2;
}

export function generatePerlinNoiseTexture(sizeX, sizeY) {
	const texture = [];

	const gradient = [];

	for (let y = 0; y < 3000; y++) {
		const currRow = [];

		for (let x = 0; x < 3000; x++) {
			currRow.push(randomGradient(new THREE.Vector2(x, y)));
		}

		gradient.push(currRow);
	}

	for (let y = 0; y < sizeY; y++) {
		const currRow = [];

		for (let x = 0; x < sizeX; x++) {
			const v = octaveNoise(
				new THREE.Vector2((x / sizeX) * 10.0, (y / sizeY) * 10.0),
				gradient,
			);
			currRow.push(v);
		}

		texture.push(currRow);
	}

	return texture;
}

// function generateVoronoiTexture(sizeX, sizeY) {
// 	const points = [];

// 	for (let y = 0; y < sizeY / 100; y++) {
// 		const currRow = [];

// 		for (let x = 0; x < sizeX / 100; x++) {
// 			currRow.push({
// 				x: (Math.random() * 100 + x * 100) / sizeX,
// 				y: (Math.random() * 100 + y * 100) / sizeY,
// 			});
// 		}

// 		points.push(currRow);
// 	}

// 	const result = [];

// 	for (let y = 0; y < sizeY; y++) {
// 		const currRow = [];

// 		for (let x = 0; x < sizeX; x++) {
// 			let closestDistance = 100;

// 			const uv = {
// 				x: x / sizeX,
// 				y: y / sizeY,
// 			};

// 			const indexX = Math.floor(x / 100);
// 			const indexY = Math.floor(y / 100);

// 			const neighbourhood = [];

// 			for (let i = -1; i <= 1; i++) {
// 				for (let j = -1; j <= 1; j++) {
// 					if (indexY + i < 0 || indexY + i >= Math.floor(sizeY / 100))
// 						continue;
// 					if (indexX + j < 0 || indexX + j >= Math.floor(sizeX / 100))
// 						continue;

// 					neighbourhood.push(points[indexY + i][indexX + j]);
// 				}
// 			}

// 			for (let point of neighbourhood) {
// 				// console.log(`(${uv.x}, ${uv.y}) VS (${point.x}, ${point.y})`);

// 				const currDistance = Math.sqrt(
// 					(uv.x - point.x) ** 2 + (uv.y - point.y) ** 2,
// 				);
// 				closestDistance = Math.min(closestDistance, currDistance);
// 			}

// 			currRow.push(closestDistance / Math.sqrt(0.01));
// 		}

// 		result.push(currRow);
// 	}

// 	return result;
// }
