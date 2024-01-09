require('dotenv').config();

const functions = require('./functions.js');
const { Client, IntentsBitField, EmbedBuilder } = require('discord.js');
const { Connection, LAMPORTS_PER_SOL, PublicKey, Message } = require('@solana/web3.js');
const connection = new Connection(process.env.SOL_MAINNET);
const connectionDevnet = new Connection(process.env.SOL_DEVNET);
const BOT = process.env.BOT;

const CHANNEL_ID = '1175109860115878000';

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

client.login(process.env.TOKEN);

