require('dotenv').config();

const functions = require('./functions.js');
const WebSocket = require('ws');
const { Client, IntentsBitField, EmbedBuilder, hyperlink } = require("discord.js");
const BOT = process.env.BOT;
const CHANNEL_ID = process.env.CHANNEL_ID;

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent
    ]
});

// Create a WebSocket connection
// const ws = new WebSocket(`wss://atlas-devnet.helius-rpc.com?api-key=${process.env.HELIUS_API_KEY}`);
const ws = new WebSocket(`wss://atlas-mainnet.helius-rpc.com?api-key=${process.env.HELIUS_API_KEY}`);

// Function to send a request to the WebSocket server
function sendRequest(ws) {
    const request = {
        jsonrpc: "2.0",
        id: 420,
        method: "transactionSubscribe",
        params: [
            {
                accountInclude: ["B3E6e8h6yhYFvMiEpTyAGi6DvgcisgFHy7wfetahvGuw"]
            },
            {
                commitment: "processed",
                encoding: "jsonParsed",
                transactionDetails: "full",
                showRewards: false,
                maxSupportedTransactionVersion: 0
            }
        ]
    };
    ws.send(JSON.stringify(request));
}

// Console log 'BOT is online' et début du compteur.
client.on('ready', (c) => {
    console.log(`✔ ${c.user.tag} is online.`);
    startTime = Date.now();
});

// Define WebSocket event handlers
ws.on('open', function open() {
    console.log('WebSocket is open');
    startTime = Date.now();
    sendRequest(ws);  // Send a request once the WebSocket is open
});

ws.on('message', function incoming(data) {
    processIncomingMessage(data).catch(console.error);
});

async function processIncomingMessage(data) {
    const messageStr = data.toString('utf8');
    try {
        const messageObj = JSON.parse(messageStr);
        console.log(messageObj);

        if (messageObj?.params?.result?.transaction?.meta?.logMessages[1] !== 'Program log: Instruction: CreateAuction' && messageObj.params) { // change to === in prod
            console.log('Success! This transaction is a createAuction transaction.');

            const channel = await client.channels.fetch(CHANNEL_ID);
            const signature = messageObj?.params?.result?.signature;

            const solscan = hyperlink('Solscan', `https://solscan.io/tx/${signature}`);
            const solanafm = hyperlink('SolanaFM', `https://solana.fm/tx/${signature}`);

            const createAuction = new EmbedBuilder()
                .setTitle(BOT)
                .setDescription("_<a:love:1193901627510366228> A new auction has been created!_") // can change the emoji when inside the said service, right right on the emoji, copy text
                .setColor('DarkerGrey')
                .setImage('https://pbs.twimg.com/profile_banners/1446275363202502844/1697575408/1080x360')
                .addFields(
                    { name: 'Uptime:', value: `\`${functions.convertUptime(functions.countTime(startTime))}\``, inline: true },
                    { name: 'Current Version:', value: `\`${process.env.VERSION}\``, inline: true }
                )
                .addFields(
                    { name: 'Links', value: `🔎 ${solscan} 🕵️ ${solanafm}`, inline: false }
                )
                .setFooter({ text: 'https://twitter.com/RadiantsDAO', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Logo_of_Twitter.svg/512px-Logo_of_Twitter.svg.png' });

            await channel.send({ embeds: [createAuction] });
        } else {
            console.log('Whoops... Still not a createAuction transaction.')
        }
    } catch (e) {
        console.error('Failed to parse JSON:', e);
    }
}

ws.on('error', function error(err) {
    console.error('WebSocket error:', err);
});

ws.on('close', function close() {
    console.log('WebSocket is closed');
}); 

client.login(process.env.TOKEN);