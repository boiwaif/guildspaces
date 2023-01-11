// Require the necessary discord.js classes
const fs = require('node:fs');
const path = require('node:path');
var randomWords = require('random-words');
const dayjs = require('dayjs');
var relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);
const {
	Client,
	Collection,
	Events,
	GatewayIntentBits,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle
} = require('discord.js');

const {
	token,
	hostServer
} = require('./config.json');

// Create a new client instance
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
	]
});
client.login(token);


function display(name) {
	let display = new EmbedBuilder()
		.setColor(0x0099FF)
		.setTitle(name)
		.setFooter({
			text: 'guildspaces'
		})
		.setTimestamp();
	return display;
}

function displayClear(size) {
	var size = size - 2;
	var newDisplay = display("Clearing Cache")
	if (size >= 1) {
		newDisplay.setDescription("Clearing " + size + " guilds");
	} else if (size > 0) {
		newDisplay.setDescription("Clearing " + size + " guild");
	} else {
		newDisplay.setDescription("Bot cache already clear!");
	}
	return newDisplay;
}

function buildScreens(guilds, page = 0) {
	const spacer = "\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0";
	const max = (25 - 25 % 3) / 3;
	const start = page * max;
	let active = display('Active Guilds');
	guilds = Array.from(guilds);
	for (var i = start; i < start + max && i < guilds.length; i++) {
		let guild = guilds[i][1];

		active.addFields({
			name: 'Server',
			value: guild.name,
			inline: true
		}, {
			name: 'Owner' + spacer + 'ID',
			value: (guild.owner ? "Yes" : "No\u00a0") + spacer + spacer + guild.id,
			inline: true
		}, {
			name: 'Created',
			value: dayjs(guild.createdAt).fromNow(),
			inline: true
		});
	}

	active.setFooter({
		text: 'page(' + (page + 1) + ')',
	})

	return active;
}


client.on("messageCreate", async message => {
	if (message.content == "?active") {
		var guilds = await client.guilds.fetch();
		var print = buildScreens(guilds);
		var forwards = new ActionRowBuilder()
			.addComponents(
				new ButtonBuilder()
				.setCustomId('refresh')
				.setLabel("Active: " + guilds.size)
				.setStyle(ButtonStyle.Secondary),
				new ButtonBuilder()
				.setCustomId('forwards')
				.setLabel('⏩')
				.setStyle(ButtonStyle.Primary)
			);

		message.channel.send({
			embeds: [print],
			components: [forwards]
		});
	}

	if (message.content == "?clear") {
		const guilds = await client.guilds.fetch();

		message.channel.send({
			embeds: [displayClear(guilds.size)]
		});

		for (var guild of guilds) {
			guild = guild[1];
			if (guild.id != hostServer) {
				if (guild.owner) {
					//Need to add check code for server users being present in these servers
					await guild.fetch().then(guild => guild.delete());
				} else {
					await guild.fetch().then(guild => guild.leave());
				}
			}

		}
	}
	if (message.content == "?create") {
		let blurb = display("Attemping to create guilds");
		message.channel.send({
			embeds: [blurb]
		});

		for (var i = 0; i <= 10; i++) {
			var serverName = randomWords({
				exactly: 2,
				join: ''
			});
			const newID = Math.floor(Math.random() * 10e6);
			try {
				const Guild = await client.guilds.create({
					name: serverName,
					channels: [{
						"name": "invite"
					}, ],
					roles: [{
						"name": "admin",
						"permissions": "8",
						"id": newID
					}]
				});
				const GuildChannel = Guild.channels.cache.find(channel => channel.name == "invite");
				const Invite = await GuildChannel.createInvite({
					maxAge: 0,
					unique: true,
					reason: "Testing."
				});
				message.channel.send(`Created guild. Here's the invite code: ${Invite.url}`);
			} catch (e) {
				//console.log("Error", e.stack);
				console.log("Error", e.name);
				console.log("Error", e.message);
			}
		}
	};
	if (message.content == "?admin") {
		const guild = await client.guilds.fetch(message.guildId);
		if (message.guildId != hostServer) {
			const GuildRole = await guild.roles.fetch();
			if (GuildRole.size > 1) {
				GuildRole.find(role => role.name == "invite");
			} else {
				guild.roles.create({
					"name": "admin",
					"admin": "8"
				});
				const GuildRole = await guild.roles.fetch()
				GuildRole.find(role => role.name == "admin");
			}
			message.member.edit(GuildRole);
		}
	};
	if (message.content == "?transfer") {
		const guild = await client.guilds.fetch(message.guildId);
		if (message.guildId != hostServer) {
			guild.setOwner(message.member).then(() => message.guild.leave());
		}
	};
	if (message.content == "?delete") {
		const guild = await client.guilds.fetch(message.guildId);
		if (message.guildId != hostServer) {
			guild.delete().catch(err => message.channel.send({
			embeds: [display("Failed to delete guild - lacking permissions")]})
			);
			
		}
	};
})


client.on("interactionCreate", async interaction => {
	if (interaction.customId == 'forwards') {
		var guilds = await client.guilds.fetch();
		var newpage = 1;
		var print = buildScreens(guilds, newpage);
		interaction.update({
			embeds: [print],
			ephemeral: true
		});
	}
	if (interaction.customId == 'refresh') {
		var guilds = await client.guilds.fetch();
		var newpage = 0;
		var print = buildScreens(guilds, newpage);
		var forwards = new ActionRowBuilder()
			.addComponents(
				new ButtonBuilder()
				.setCustomId('refresh')
				.setLabel("Active: " + guilds.size)
				.setStyle(ButtonStyle.Secondary),
				new ButtonBuilder()
				.setCustomId('forwards')
				.setLabel('⏩')
				.setStyle(ButtonStyle.Primary)
			);
		interaction.update({
			embeds: [print],
			components: [forwards],
			ephemeral: true
		});
	}
});