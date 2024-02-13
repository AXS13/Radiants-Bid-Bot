require('dotenv').config();

const functions = require('./functions.js');
const { Client, IntentsBitField, EmbedBuilder, PermissionsBitField  } = require('discord.js');
const { Connection } = require('@solana/web3.js');
// const { initiateWebSocketConnection } = require('./create-auction-websocket.js');
// const { initiateBidsWebSocketConnection } = require('./bids-websocket.js');
const { initiateHighBidWebSocketConnection } = require('./highbid-websocket.js');
const fs = require('fs').promises;
let config = require('../src/assets/discords.json');
// const connection = new Connection(process.env.SOL_MAINNET);
// const connectionDevnet = new Connection(process.env.SOL_DEVNET);
const BOT = process.env.BOT;

// const CHANNEL_ID = '1175109860115878000';

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent
    ]
});

// Console log 'BOT is online' et début du compteur.
client.on('ready', (c) => {
    console.log(`✔ ${c.user.tag} is online.`);
    startTime = Date.now();
});

// /status
client.on('interactionCreate', (interaction) => {
    // If the interaction is not a chat input command, return
    if (!interaction.isChatInputCommand()) return;

    // Status command action code
    if (interaction.commandName === 'status') {
        const statusEmbed = new EmbedBuilder()
            .setTitle(BOT + "'s Status")
            .setDescription("✔ The application is fully up and running!")
            .setColor('DarkerGrey')
            .setImage('https://pbs.twimg.com/profile_banners/1446275363202502844/1697575408/1080x360')
            .addFields(
                { name: 'Uptime:', value: `\`${functions.convertUptime(functions.countTime(startTime))}\``, inline: true },
                { name: 'Current Version:', value: `\`${process.env.VERSION}\``, inline: true }
            )
            .setFooter({ text: 'https://twitter.com/RadiantsDAO', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Logo_of_Twitter.svg/512px-Logo_of_Twitter.svg.png' });

        interaction.reply({ embeds: [statusEmbed] });
    }
})

// !setchannel
client.on('messageCreate', async message => {
    if (message.content.startsWith('!setchannel')) {
        // Check if the user has Administrator permissions
        if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const channelId = message.channel.id;
            const guildId = message.guild.id;

            // Set the channel ID for the guild in the config
            config.guilds[guildId] = { channelId };

            // Write to config.json using fs.promises.writeFile (Promise-based)
            try {
                await fs.writeFile('./src/assets/discords.json', JSON.stringify(config, null, 2));
                message.reply('Channel set successfully for bot messages.');
            } catch (error) {
                console.error('Error writing to config file:', error);
                message.reply('Failed to update the configuration.');
            }
        } else {
            // User does not have Administrator permissions
            message.reply('You do not have permission to use this command.');
        }
    }
});
/*
client.on('ready', async (c) => { // Make sure this function is async
    for (const [guildId, guild] of client.guilds.cache) {
        if (config.guilds[guildId]) {
            const channelId = config.guilds[guildId];
            try {
                const channel = await client.channels.fetch(channelId.channelId); // Fetch the channel
                if (channel) {
                    await channel.send('☀️ Hi everyone, happy to meet you, I am the new Radiants Bid Bot!');
                } else {
                    console.log(`Channel not found in guild: ${guildId}`);
                }
            } catch (error) {
                console.error(`Failed to send message in guild: ${guildId}, error: ${error}`);
            }
        } else {
            console.log(`No channel configured for guild: ${guildId}`);
        }
    }
});
*/


client.login(process.env.TOKEN);
// initiateWebSocketConnection();
initiateHighBidWebSocketConnection();
