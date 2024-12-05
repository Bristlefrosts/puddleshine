import * as DAPI from 'discord-api-types/v10';

import { deferMessage, editInteractionResponse } from '#discord/responses-deferred.js';
import { simpleEphemeralResponse } from '#discord/responses.js';
import { parseCommandOptions } from '#discord/parse-options.js';
import { parseList } from '#utils/parse-list.js';

import * as nurseryDB from '#commands/nursery/db/nursery-db.js';
import * as nurseryManager from '#commands/nursery/game/nursery-manager.js';
import * as nurseryViews from '#commands/nursery/nursery-views.js';
import { addNewEventToKit, findLastEventofType, KitEventType } from '#commands/nursery/game/kit-events.js';

import * as config from '#config.js';

import type { Subcommand } from '#commands/subcommand.js';

const SUBCOMMAND_NAME = 'feed';

const FeedSubcommand: Subcommand = {
	name: SUBCOMMAND_NAME,

	subcommand: {
		type: DAPI.ApplicationCommandOptionType.Subcommand,
		name: SUBCOMMAND_NAME,
		description: 'Feed your kits.',

		options: [
			{
				type: DAPI.ApplicationCommandOptionType.String,
				name: 'kits',
				description: 'The kits to feed by name or position ("all" to feed all of them at once)',
				required: true,
			},
		],
	},

	async execute(options) {
		const deferredExecute = async () => {
			try {
				const appId = options.env.DISCORD_APPLICATION_ID;
				const discordToken = options.env.DISCORD_TOKEN;
				const interactionToken = options.interaction.token;

				const { kits: kitsOption } = parseCommandOptions(options.commandOptions);

				if (!kitsOption || kitsOption.type !== DAPI.ApplicationCommandOptionType.String) return;

				const feedMessages: string[] = [];
				const feedTime = new Date();
				const feedTimestamp = Math.floor(feedTime.getTime() / 1000);
				const kitNamesToFeed = parseList(kitsOption.value) as string[];

				const nursery = await nurseryManager.getNursery(options.user, options.env);

				if (nursery.isPaused) {
					await editInteractionResponse(
						appId,
						discordToken,
						interactionToken,
						nurseryViews.nurseryMessageResponse(nursery, {
							view: 'home',
							messages: ['Your nursery is currently paused.'],
						}).data!,
					);

					return;
				}

				if (nursery.kits.length < 1) {
					await editInteractionResponse(
						appId,
						discordToken,
						interactionToken,
						nurseryViews.nurseryMessageResponse(nursery, {
							view: 'home',
							messages: ["You don't have any kits to feed."],
						}).data!,
					);

					return;
				}

				let kitsToFeed = nurseryManager.locateKits(nursery, kitNamesToFeed);

				if (kitsToFeed.length < 1) {
					await editInteractionResponse(
						appId,
						discordToken,
						interactionToken,
						nurseryViews.nurseryMessageResponse(nursery, {
							view: 'status',
							messages: ["Couldn't find kits with the provided input."],
						}).data!,
					);

					return;
				}

				kitsToFeed = kitsToFeed.filter((kit) => {
					if (kit.wanderingSince !== undefined) {
						feedMessages.push(`You can't see ${kit.fullName} anywhere.`);
						return false;
					}

					const lastFeedEvent = findLastEventofType(kit, KitEventType.Feed);
					if (!lastFeedEvent) return true;

					const secondsSinceLastFeed = feedTimestamp - lastFeedEvent.timestamp;

					if (secondsSinceLastFeed < config.NURSERY_FEED_COOLDOWN && kit.hunger >= 0.7) {
						feedMessages.push(`${kit.fullName} complains about not being hungry and refuses to eat.`);
						return false;
					}

					return true;
				});

				if (kitsToFeed.length < 1) {
					await editInteractionResponse(
						appId,
						discordToken,
						interactionToken,
						nurseryViews.nurseryMessageResponse(nursery, {
							view: 'status',
							messages: feedMessages,
						}).data!,
					);

					return;
				}

				const foodPointsNeeded = kitsToFeed.length * config.NURSERY_FEED_FOOD_POINTS;

				if (foodPointsNeeded > nursery.food.foodPoints) {
					await editInteractionResponse(
						appId,
						discordToken,
						interactionToken,
						nurseryViews.nurseryMessageResponse(nursery, {
							view: 'status',
							messages: ["You don't have enough food to feed the kits."],
						}).data!,
					);

					return;
				}

				nursery.food.foodPoints -= foodPointsNeeded;
				nursery.food.food -= foodPointsNeeded;

				const dbUpdate = kitsToFeed.map((kit) => {
					let hunger = kit.hunger + config.NURSERY_FEED_HUNGER_REGEN;
					if (hunger > 1) hunger = 1;

					nursery.kits[kit.index].hunger = hunger;
					feedMessages.push(`You've fed ${kit.fullName}.`);

					addNewEventToKit(kit, KitEventType.Feed, '{{KIT_FULL_NAME}} was fed.');

					return { uuid: kit.uuid, hunger, events: JSON.stringify(kit.events) };
				});

				await nurseryDB.feedKits(options.env.PRISMA, nursery.uuid, feedTime, nursery.food.food, dbUpdate);

				await editInteractionResponse(
					appId,
					discordToken,
					interactionToken,
					nurseryViews.nurseryMessageResponse(nursery, {
						view: 'status',
						messages: feedMessages,
					}).data!,
				);
			} catch (error) {
				console.error(error);
			}
		};

		options.ctx.waitUntil(deferredExecute());

		return deferMessage();
	},
};

export default FeedSubcommand;
