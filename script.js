import renderCity from './main.js';
import { modules } from './modules.js';
// import { renderField } from './rendering.js';
import { generateField } from './wfc.js';

const width = 10 * 3;
const height = 10 * 3;

// const field = generateField(width, height, modules, (i, j) =>
// 	i == 0 || i == width - 1 || j == 0 || j == height - 1 ? 0 : -1,
// );

const field = generateField(
	width,
	height,
	modules,
	(i, j) => {
		const x = ((j - width / 6) / width) * 6;
		const y = ((i - height / 6) / height) * 6;

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

// renderField(field);
