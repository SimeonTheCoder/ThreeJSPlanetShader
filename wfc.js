function generateRules(modules) {
	for (let module of modules) {
		const left = [];
		const right = [];
		const up = [];
		const down = [];

		for (let other of modules) {
			const otherIndex = modules.indexOf(other);

			if (module.data[1][0] == other.data[1][2]) left.push(otherIndex);
			if (module.data[1][2] == other.data[1][0]) right.push(otherIndex);
			if (module.data[0][1] == other.data[2][1]) up.push(otherIndex);
			if (module.data[2][1] == other.data[0][1]) down.push(otherIndex);
		}

		module.left = left;
		module.right = right;
		module.up = up;
		module.down = down;
	}
}

function findLeastEntropy(field, options) {
	let minEntropyIndex = [0, 0];
	let minEntropyValue = 999;

	for (let i = 0; i < field.length; i++) {
		for (let j = 0; j < field[i].length; j++) {
			if (field[i][j] != -1) continue;
			if (options[i][j].length >= minEntropyValue) continue;

			minEntropyValue = options[i][j].length;
			minEntropyIndex = [i, j];
		}
	}

	return minEntropyIndex;
}

function isValidPosition(x, y, field) {
	return (
		!(x < 0 || x >= field[0].length) &&
		!(y < 0 || y >= field.length) &&
		field[y][x] == -1
	);
}

function updateNeighbours(x, y, field, options, modules) {
	if (isValidPosition(x - 1, y, field)) {
		const optionsCopy = [];

		for (let option of options[y][x - 1]) {
			if (!modules[field[y][x]].left.includes(option)) continue;
			optionsCopy.push(option);
		}

		options[y][x - 1] = optionsCopy;
	}

	if (isValidPosition(x + 1, y, field)) {
		const optionsCopy = [];

		for (let option of options[y][x + 1]) {
			if (!modules[field[y][x]].right.includes(option)) continue;
			optionsCopy.push(option);
		}

		options[y][x + 1] = optionsCopy;
	}

	if (isValidPosition(x, y - 1, field)) {
		const optionsCopy = [];

		for (let option of options[y - 1][x]) {
			if (!modules[field[y][x]].up.includes(option)) continue;
			optionsCopy.push(option);
		}

		options[y - 1][x] = optionsCopy;
	}

	if (isValidPosition(x, y + 1, field)) {
		const optionsCopy = [];

		for (let option of options[y + 1][x]) {
			if (!modules[field[y][x]].down.includes(option)) continue;
			optionsCopy.push(option);
		}

		options[y + 1][x] = optionsCopy;
	}
}

function isDone(field) {
	for (let i = 0; i < field.length; i++) {
		for (let j = 0; j < field[i].length; j++) {
			if (field[i][j] == -1) return false;
		}
	}

	return true;
}

function chooseState(options, modules) {
	let sum = 0;

	for (let i = 0; i < options.length; i++)
		sum += modules[options[i]].weight ? modules[options[i]].weight : 1;

	const pick = Math.floor(Math.random() * sum);

	let choice = 0;

	sum = 0;

	for (let i = 0; i < options.length; i++) {
		sum += modules[options[i]].weight ? modules[options[i]].weight : 1;
		if (sum > pick) return i;
	}

	return 0;
}

export function generateField(
	cellsX,
	cellsY,
	modules,
	setupFunction,
	buildingsCount,
) {
	generateRules(modules);

	const field = [];
	const options = [];

	for (let i = 0; i < cellsY / 3; i++) {
		const fieldCurrRow = [];
		const optionsCurrRow = [];

		for (let j = 0; j < cellsX / 3; j++) {
			const cell = [];
			for (let k = 0; k < modules.length; k++) cell.push(k);

			fieldCurrRow.push(setupFunction(i, j));
			optionsCurrRow.push(cell);
		}

		field.push(fieldCurrRow);
		options.push(optionsCurrRow);
	}

	for (let i = 0; i < cellsY / 3; i++) {
		for (let j = 0; j < cellsX / 3; j++) {
			if (field[i][j] == -1) continue;
			updateNeighbours(j, i, field, options, modules);
		}
	}

	let steps = 0;

	while (steps++ < ((cellsX / 3) * cellsY) / 3 + 5 && !isDone(field)) {
		const [leastY, leastX] = findLeastEntropy(field, options);

		const pick = chooseState(options[leastY][leastX], modules);

		field[leastY][leastX] = options[leastY][leastX][pick];
		options[leastY][leastX] = [];

		updateNeighbours(leastX, leastY, field, options, modules);
	}

	const result = [];

	for (let i = 0; i < cellsY; i++) {
		const resultCurrRow = [];

		for (let j = 0; j < cellsX; j++) {
			const module = field[Math.floor(i / 3)][Math.floor(j / 3)];

			const curr = modules[module].data[i % 3][j % 3];

			if (curr == 0 && module != 0) {
				resultCurrRow.push(
					Math.floor(Math.random() * buildingsCount) + 2,
				);

				continue;
			}

			resultCurrRow.push(curr);
		}

		result.push(resultCurrRow);
	}

	return result;
}
