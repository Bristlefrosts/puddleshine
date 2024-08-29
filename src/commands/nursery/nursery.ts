import * as DAPI from 'discord-api-types/v10';

import { messageResponse, simpleEphemeralResponse, simpleMessageResponse } from '#discord/responses.js';
import { parseCommandOptions } from '#discord/parse-options.js';

import StatusSubcommand from './subcommands/status.js';
import HomeSubcommand from './subcommands/home.js';
import BreedSubcommand from './subcommands/breed.js';
import FeedSubcommand from './subcommands/feed.js';
import CooldownsSubcommand from './subcommands/cooldowns.js';
import CheckSubcommand from './subcommands/check.js';
import PromoteSubcommand from './subcommands/promote.js';
import CoolSubcommand from './subcommands/cool.js';

import type { Command } from '../command.js';
import type { Subcommand } from '#commands/subcommand.js';

const subcommands: { [name: string]: Subcommand } = {
	[StatusSubcommand.name]: StatusSubcommand,
	[HomeSubcommand.name]: HomeSubcommand,
	[BreedSubcommand.name]: BreedSubcommand,
	[FeedSubcommand.name]: FeedSubcommand,
	[CooldownsSubcommand.name]: CooldownsSubcommand,
	[CheckSubcommand.name]: CheckSubcommand,
	[PromoteSubcommand.name]: PromoteSubcommand,
	[CoolSubcommand.name]: CoolSubcommand,
};

const NurseryCommand: Command = {
	name: 'nursery',

	commandData: {
		type: DAPI.ApplicationCommandType.ChatInput,
		name: 'nursery',
		description: 'Take care of kits.',

		integration_types: [DAPI.ApplicationIntegrationType.GuildInstall, DAPI.ApplicationIntegrationType.UserInstall],
		contexts: [
			DAPI.InteractionContextType.Guild,
			DAPI.InteractionContextType.BotDM,
			DAPI.InteractionContextType.PrivateChannel,
		],

		options: Object.values(subcommands).map((subcommand) => subcommand.subcommand),
	},

	async execute({ interaction, user, subcommandGroup, subcommand, options, env, ctx }) {
		if (!subcommand) return simpleEphemeralResponse('No subcommand provided.');

		const subcommandName = subcommand.name;

		if (subcommands[subcommandName])
			return await subcommands[subcommandName].execute({ interaction, user, commandOptions: options, env, ctx });
	},

	async onMessageComponent({ interaction, user, componentType, customId, parsedCustomId, values, env, ctx }) {},
};

export default NurseryCommand;
