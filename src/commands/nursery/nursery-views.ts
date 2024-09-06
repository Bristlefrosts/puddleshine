import { messageResponse } from '#discord/responses.js';
import { getKitDescription } from './game/kit.js';

import type { Nursery } from './game/nursery-manager.js';

import * as config from '#config.js';

function buildNurseryStatusView(nursery: Nursery, noAlerts?: boolean) {
	const lines: string[] = [];

	let nextFoodPoint = '';

	if (nursery.food.foodPoints >= nursery.food.max) {
		nextFoodPoint = 'Full';
	} else {
		if (nursery.food.nextFoodPointPercentage) {
			nextFoodPoint = nursery.food.nextFoodPointPercentage.toFixed(1).toString() + '%';
		} else {
			nextFoodPoint = '0%';
		}
	}

	lines.push('```');

	if (nursery.isPaused) {
		lines.push(`${nursery.displayName}'s nursery [${nursery.season}] [PAUSED]`);
	} else {
		lines.push(`${nursery.displayName}'s nursery [${nursery.season}]`);
	}

	lines.push(`Food Meter: ${nursery.food.foodPoints} (${nextFoodPoint})`);
	lines.push('');

	if (!noAlerts) {
		if (nursery.alerts.length > 0) {
			const mostRecentAlerts = nursery.alerts.slice(undefined, config.NURSERY_SHORT_ALERTS);

			for (const alert of mostRecentAlerts) {
				lines.push(`| ${alert.alert}`);
			}

			if (nursery.alerts.length > config.NURSERY_SHORT_ALERTS) {
				lines.push(`| (use [alerts] to view the rest of your ${nursery.alerts.length} alerts)`);
			}
		} else {
			lines.push('You have no alerts.');
		}

		lines.push('');
	}

	if (nursery.kits && nursery.kits.length > 0) {
		for (let i = 0; i < nursery.kits.length; i++) {
			const kitNumber = i + 1;
			const kit = nursery.kits[i];

			if (kit.wanderingSince !== undefined) continue;

			const age = kit.age.toFixed(2);
			const health = (kit.health * 100).toFixed(1);
			const hunger = (kit.hunger * 100).toFixed(1);
			const bond = (kit.bond * 100).toFixed(1);
			const temperature = kit.temperatureClass;

			lines.push(`[${kitNumber}] ${kit.fullName}:`);
			lines.push(
				`- Age: ${age} moons | Health: ${health}% | Hunger: ${hunger}% | Bond: ${bond}% | Temp: ${temperature}`,
			);
		}
	} else {
		lines.push("You don't have any kits. Try /nursery breed to get some!");
	}

	if (nursery.kitsNeedingAttention.length > 0) {
		lines.push('');

		if (nursery.kitsNeedingAttention.length === 1) {
			lines.push(`${nursery.kitsNeedingAttention[0].fullName} needs your attention.`);
		} else if (nursery.kitsNeedingAttention.length === 2) {
			lines.push(
				`${nursery.kitsNeedingAttention[0].fullName} and ${nursery.kitsNeedingAttention[1].fullName} need your attention.`,
			);
		} else {
			const namesNeedingAttention = nursery.kitsNeedingAttention.map((kit) => kit.fullName);
			const last = namesNeedingAttention.pop();

			lines.push(`${namesNeedingAttention.join(', ')}, and ${last} need your attention.`);
		}
	}

	lines.push('```');

	return lines.join('\n');
}

function buildNurseryHomeView(nursery: Nursery) {
	const lines: string[] = [];

	let nextFoodPoint = '';

	if (nursery.food.foodPoints >= nursery.food.max) {
		nextFoodPoint = 'Full';
	} else {
		if (nursery.food.nextFoodPointPercentage) {
			nextFoodPoint = nursery.food.nextFoodPointPercentage.toFixed(1).toString() + '%';
		} else {
			nextFoodPoint = '0%';
		}
	}

	lines.push('```');

	if (nursery.isPaused) {
		lines.push(`${nursery.displayName}'s nursery [${nursery.season}] [PAUSED]`);
	} else {
		lines.push(`${nursery.displayName}'s nursery [${nursery.season}]`);
	}

	lines.push(`Food Meter: ${nursery.food.foodPoints} (${nextFoodPoint})`);
	lines.push('');

	if (nursery.kits && nursery.kits.length > 0) {
		for (let i = 0; i < nursery.kits.length; i++) {
			const kitNumber = i + 1;
			const kit = nursery.kits[i];

			lines.push(`[${kitNumber}] ${kit.fullName}: ${getKitDescription(kit)}`);
		}
	} else {
		lines.push("You don't have any kits. Try /nursery breed to get some!");
	}

	lines.push('```');

	return lines.join('\n');
}

function nurseryMessageResponse(nursery: Nursery, messages: string[], showStatus?: boolean, noAlerts?: boolean) {
	const nurseryView = showStatus ? buildNurseryStatusView(nursery, noAlerts) : buildNurseryHomeView(nursery);

	return messageResponse({
		content: messages.map((message) => `> ${message}`).join('\n') + '\n' + nurseryView,
	});
}

export { buildNurseryStatusView, buildNurseryHomeView, nurseryMessageResponse };
