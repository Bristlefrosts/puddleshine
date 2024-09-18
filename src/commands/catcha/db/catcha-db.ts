import * as database from '#db/database.js';

import type { D1PrismaClient } from '#/db/database.js';
import type { Prisma } from '@prisma/client';

async function findCatcha(prisma: D1PrismaClient, discordId: string) {
	const result = await prisma.catcha.findFirst({
		where: {
			user: {
				discordId: discordId,
			},
		},
		include: {
			user: true,
		},
	});

	return result;
}

async function initializeCatchaForUser(prisma: D1PrismaClient, discordId: string) {
	const result = await prisma.catcha.create({
		data: {
			lastRollPeriod: null,
			lastRollCount: null,
			lastClaim: null,

			user: {
				connectOrCreate: {
					where: {
						discordId: discordId,
					},
					create: database.createInitialUser(discordId),
				},
			},
		},
	});

	return result;
}

async function updateCatcha(prisma: D1PrismaClient, userUuid: string, data: Prisma.CatchaUpdateInput) {
	const result = await prisma.catcha.update({
		where: {
			userUuid: userUuid,
		},
		data: data,
	});
}

async function updateCatchas(prisma: D1PrismaClient, userUuids: string[], data: Prisma.CatchaUpdateInput) {
	const result = await prisma.catcha.updateMany({
		where: {
			OR: userUuids.map((uuid) => {
				return { userUuid: uuid };
			}),
		},
		data: data,
	});
}

async function findCardByUuid(prisma: D1PrismaClient, cardUuid: string) {
	const card = await prisma.catchaCard.findUnique({
		where: {
			uuid: cardUuid,
		},
	});

	return card;
}

async function insertCard(
	prisma: D1PrismaClient,
	userUuid: string,
	cardId: number,
	obtainedAt: Date,
	obtainedFrom: string,
	isInverted: boolean,
	variant: string | null,
) {
	const result = await prisma.catchaCard.create({
		data: {
			uuid: crypto.randomUUID(),
			cardId: cardId,

			obtainedAt: obtainedAt,
			obtainedFrom: obtainedFrom,

			isInverted: isInverted,
			variant: variant,

			catcha: {
				connect: {
					userUuid: userUuid,
				},
			},
		},
	});

	return result;
}

async function inserCardHistoryEvent(
	prisma: D1PrismaClient,
	cardUuid: string,
	timestamp: Date,
	event: string,
	eventDetails?: string,
	userUuid?: string,
) {
	const result = await prisma.catchaCardHistoryEvent.create({
		data: {
			timestamp: timestamp,

			event: event,
			eventDetails: eventDetails ? eventDetails : null,

			card: {
				connect: {
					uuid: cardUuid,
				},
			},

			catcha:
				userUuid ?
					{
						connect: {
							userUuid: userUuid,
						},
					}
				:	undefined,
		},
	});
}

async function claimCard(
	prisma: D1PrismaClient,
	options: {
		userUuid: string;
		cardId: number;
		claimTime: Date;
		isInverted: boolean;
		variant: string | null;
	},
) {
	const cardUuid = crypto.randomUUID();

	await prisma.$transaction([
		// Insert the card itself into the DB
		prisma.catchaCard.create({
			data: {
				uuid: cardUuid,
				cardId: options.cardId,

				obtainedAt: options.claimTime,
				obtainedFrom: 'ROLL', // Obtained from rolling

				isInverted: options.isInverted,
				variant: options.variant,

				catcha: {
					connect: {
						userUuid: options.userUuid,
					},
				},
			},
		}),
		// Insert the card history event
		prisma.catchaCardHistoryEvent.create({
			data: {
				timestamp: options.claimTime,

				event: 'CLAIM',
				eventDetails: null,

				card: {
					connect: {
						uuid: cardUuid,
					},
				},

				catcha: {
					connect: {
						userUuid: options.userUuid,
					},
				},
			},
		}),
		// Set the last claim time on the user's Catcha
		prisma.catcha.update({
			where: {
				userUuid: options.userUuid,
			},
			data: {
				lastClaim: options.claimTime,
				rollCache: null,
			},
		}),
	]);
}

async function claimBirthdayCard(prisma: D1PrismaClient, userUuid: string, birthdayYear: number, cardId: number) {
	const cardUuid = crypto.randomUUID();
	const currentDate = new Date();

	await prisma.$transaction([
		// Insert the card itself into the DB
		prisma.catchaCard.create({
			data: {
				uuid: cardUuid,
				cardId,

				obtainedAt: currentDate,
				obtainedFrom: 'BIRTHDAY', // Obtained from rolling

				isInverted: false,
				variant: null,

				untradeable: true,

				catcha: {
					connect: {
						userUuid: userUuid,
					},
				},
			},
		}),
		// Insert the card history event
		prisma.catchaCardHistoryEvent.create({
			data: {
				timestamp: currentDate,

				event: 'BIRTHDAY',
				eventDetails: birthdayYear.toString(),

				card: {
					connect: {
						uuid: cardUuid,
					},
				},

				catcha: {
					connect: {
						userUuid: userUuid,
					},
				},
			},
		}),
		// Set the last birthday claim year
		prisma.catcha.update({
			where: {
				userUuid: userUuid,
			},
			data: {
				lastBirthdayCardClaimed: birthdayYear,
				rollCache: null,
			},
		}),
	]);
}

async function burnCardUuids(prisma: D1PrismaClient, userUuid: string, cardUuids: string[]) {
	await prisma.$transaction([
		prisma.catchaCard.updateMany({
			where: {
				OR: cardUuids.map((cardUuid) => {
					return { uuid: cardUuid };
				}),
			},
			data: {
				burned: true,
			},
		}),
		prisma.catcha.update({
			where: {
				userUuid: userUuid,
			},
			data: { rollCache: null },
		}),
	]);
}

async function getCardCollection(prisma: D1PrismaClient, discordId: string) {
	const result = await prisma.catchaCard.findMany({
		where: {
			catcha: {
				user: {
					discordId: discordId,
				},
			},
		},
	});

	return result;
}

async function findUserCardsWithCardId(prisma: D1PrismaClient, userUuid: string, cardId: number) {
	const result = await prisma.catchaCard.findMany({
		where: {
			cardId,
			ownerUuid: userUuid,
		},
	});

	return result;
}

async function getCardHistoryEvents(prisma: D1PrismaClient, cardUuid: string) {
	const results = await prisma.catchaCardHistoryEvent.findMany({
		where: {
			cardUuid,
		},
		include: {
			catcha: {
				include: {
					user: true,
				},
			},
			card: true,
		},
		orderBy: {
			timestamp: 'desc',
		},
	});

	return results;
}

export {
	findCatcha,
	initializeCatchaForUser,
	updateCatcha,
	updateCatchas,
	findCardByUuid,
	findUserCardsWithCardId,
	insertCard,
	inserCardHistoryEvent,
	burnCardUuids,
	getCardCollection,
	getCardHistoryEvents,
	claimCard,
	claimBirthdayCard,
};
