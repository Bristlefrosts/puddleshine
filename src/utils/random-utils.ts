type WeightedValue<T> = {
	value: T;
	probability: number | '*';
};

// https://stackoverflow.com/a/49434653
function gaussianRandom() {
	let u = 0;
	let v = 0;

	while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
	while (v === 0) v = Math.random();

	let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
	num = num / 10.0 + 0.5; // Translate to 0 -> 1

	if (num > 1 || num < 0) return gaussianRandom(); // resample between 0 and 1

	return num;
}

function pickRandomWeighted<T>(values: WeightedValue<T>[]): T {
	let pickedValue: T | undefined;
	let randomNumber = Math.random();
	let threshold = 0;

	for (let i = 0; i < values.length; i++) {
		if (values[i].probability === '*') {
			continue;
		}

		threshold += values[i].probability as number;
		if (threshold > randomNumber) {
			pickedValue = values[i].value;
			break;
		}
	}

	if (!pickedValue) {
		//nothing found based on probability value, so pick element marked with wildcard
		const wildcardValues = values.filter((value) => value.probability === '*');
		const randomElement = wildcardValues[Math.floor(Math.random() * wildcardValues.length)];
		pickedValue = randomElement.value;
	}

	return pickedValue;
}

export type { WeightedValue };
export { gaussianRandom, pickRandomWeighted };
