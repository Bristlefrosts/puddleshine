import { Gender, KitGender } from '#cat/gender.js';

import * as config from '#config.js';

import type { NurseryKit } from '@prisma/client';
import type { Pelt } from '#cat/pelts.js';
import type { Eyes } from '#cat/eyes.js';

type Kit = {
	uuid: string;
	position: number;
	index: number;

	prefix: string;
	fullName: string;

	gender: Gender;
	pelt: Pelt;
	eyes: Eyes;

	age: number;
	health: number;
	hunger: number;
	bond: number;
	temperature: number;

	isDead?: boolean;
};

function calculateAgeMoons(kit: NurseryKit) {
	const ageMoons = kit.ageMoons;

	const currentTimestamp = Math.floor(new Date().getTime() / 1000);
	const ageLastUpdatedAt = Math.floor(kit.ageUpdated.getTime() / 1000);
	const secondsSinceLastUpdate = currentTimestamp - ageLastUpdatedAt;

	return ageMoons + secondsSinceLastUpdate * config.NURSERY_KIT_AGE_PER_SECOND;
}

function calculateHunger(kit: NurseryKit) {
	const hunger = kit.hunger;

	const currentTimestamp = Math.floor(new Date().getTime() / 1000);
	const hungerLastUpdatedAt = Math.floor(kit.hungerUpdated.getTime() / 1000);
	const secondsSinceLastUpdate = currentTimestamp - hungerLastUpdatedAt;

	return hunger - secondsSinceLastUpdate * config.NURSERY_KIT_HUNGER_PER_SECOND;
}

function calculateHealth(kit: NurseryKit, hunger: number) {
	const health = kit.health;

	const currentTimestamp = Math.floor(new Date().getTime() / 1000);
	const healthLastUpdatedAt = Math.floor(kit.healthUpdated.getTime() / 1000);
	const secondsSinceLastUpdate = currentTimestamp - healthLastUpdatedAt;

	if (hunger <= 0) {
		const secondsHungry = Math.floor(Math.abs(hunger) / config.NURSERY_KIT_HUNGER_PER_SECOND);
		const newHealth = health - secondsHungry * config.NURSERY_KIT_HEALTH_DECREASE;

		if (newHealth < 0) return 0; // TODO: Implement dying

		return newHealth;
	} else {
		const newHealth = health + secondsSinceLastUpdate * config.NURSERY_KIT_HEALTH_REGEN;

		if (newHealth > 1) return 1;

		return health + secondsSinceLastUpdate * config.NURSERY_KIT_HEALTH_REGEN;
	}
}

function calculateTemperature() {}

function getKit(kit: NurseryKit, index: number): Kit {
	const age = calculateAgeMoons(kit);
	const hunger = calculateHunger(kit);
	const health = calculateHealth(kit, hunger);

	return {
		uuid: kit.uuid,
		position: index + 1,
		index,

		prefix: kit.namePrefix,
		fullName: kit.namePrefix + 'kit',

		gender: kit.gender as Gender,
		pelt: JSON.parse(kit.pelt) as Pelt,
		eyes: JSON.parse(kit.eyes) as Eyes,

		age,
		health,
		hunger: hunger > 0 ? hunger : 0,
		bond: kit.bond,
		temperature: kit.temperature,

		isDead: false,
	};
}

export { getKit };
export type { Kit };
