import { modules } from './modules.js';

const ctx = document.querySelector('canvas').getContext('2d');

const width = document.querySelector('canvas').width;
const height = document.querySelector('canvas').height;

let cellsX = 60;
let cellsY = 60;

let cellWidth = width / cellsX;
let cellHeight = height / cellsY;

const colors = ['white', 'gray', 'green', 'red', 'blue', 'pink'];

function updateSize(field) {
	cellsX = field[0].length;
	cellsY = field.length;

	cellWidth = width / cellsX;
	cellHeight = height / cellsY;
}

export function renderField(field) {
	updateSize(field);

	for (let i = 0; i < field.length; i++) {
		for (let j = 0; j < field[i].length; j++) {
			renderModule(field[i][j], j, i);
		}
	}
}

export function renderModule(moduleIndex, cellX, cellY) {
	ctx.fillStyle = colors[moduleIndex];

	ctx.fillRect(cellX * cellWidth, cellY * cellHeight, cellWidth, cellHeight);

	// ctx.strokeRect(
	// 	cellX * cellWidth,
	// 	cellY * cellHeight,
	// 	cellWidth,
	// 	cellHeight,
	// );
}
