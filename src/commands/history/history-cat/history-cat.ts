import * as DAPI from 'discord-api-types/v10';

import * as db from '#db/database.js';
import * as historyDB from '#commands/history/db/history-db.js';
import { ClanRank } from '#utils/clans.js';
import { generateRandomSuffix } from '#utils/clan-names.js';
import { Gender } from '#cat/gender.js';

import type { HistoryCat as DBHistoryCat } from '@prisma/client';

import * as config from '#config.js';

type HistoryCat = {
	uuid: string;

	index: number;
	position: number;

	fullName: string;
	prefix: string;
	suffix: string;

	gender: Gender;

	ageMoons: number;
	isDead: boolean;

	rank: ClanRank;
};

function calculateAge(historyCat: DBHistoryCat) {
	const ageMoons = historyCat.age;

	const currentTimestamp = Math.floor(new Date().getTime() / 1000);
	const ageLastUpdatedAt = Math.floor(historyCat.ageUpdated.getTime() / 1000);
	const secondsSinceLastUpdate = currentTimestamp - ageLastUpdatedAt;

	return ageMoons + secondsSinceLastUpdate * config.HISTORY_AGE_PER_SECOND;
}

async function getHistoryCats(discordId: string, env: Env) {
	const user = await db.getUserWithDiscordId(env.PRISMA, discordId);

	if (!user) return [];

	const historyCats = await historyDB.findHistoryCats(env.PRISMA, user.uuid);
	if (!historyCats || historyCats.length === 0) return [];

	const listCats: HistoryCat[] = [];
	const apprenticesToPromote: HistoryCat[] = [];

	let i = 0;
	for (const historyCat of historyCats) {
		const age = historyCat.isDead ? historyCat.age : calculateAge(historyCat);

		const cat: HistoryCat = {
			uuid: historyCat.uuid,

			index: i,
			position: i + 1,

			fullName: historyCat.namePrefix + historyCat.nameSuffix,
			prefix: historyCat.namePrefix,
			suffix: historyCat.nameSuffix,

			gender: (historyCat.gender as Gender) ?? Gender.Other,

			ageMoons: age,
			isDead: historyCat.isDead,

			rank: historyCat.rank as ClanRank,
		};

		i += 1;

		if (cat.rank === ClanRank.WarriorApprentice || cat.rank === ClanRank.MedicineCatApprentice) {
			if (cat.ageMoons >= config.HISTORY_PROMOTE_AGE) {
				const newSuffix = generateRandomSuffix();
				const newRank = cat.rank === ClanRank.MedicineCatApprentice ? ClanRank.MedicineCat : ClanRank.Warrior;

				cat.suffix = newSuffix;
				cat.fullName = cat.prefix + newSuffix;
				cat.rank = newRank;

				listCats.push(cat);
				apprenticesToPromote.push(cat);

				continue;
			}
		}

		listCats.push(cat);
	}

	if (apprenticesToPromote.length > 0) {
		await historyDB.promoteApprentices(
			env.PRISMA,
			apprenticesToPromote.map((apprentice) => {
				return { uuid: apprentice.uuid, newSuffix: apprentice.suffix, newRank: apprentice.rank };
			}),
		);
	}

	return listCats;
}

export { getHistoryCats };
