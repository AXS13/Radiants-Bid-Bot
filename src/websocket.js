require('dotenv').config();

const functions = require('./functions.js');
const WebSocket = require('ws');
const { Client, IntentsBitField, EmbedBuilder, hyperlink } = require("discord.js");
const { Connection, clusterApiUrl } = require('@solana/web3.js');
const anchor = require('@coral-xyz/anchor');
const IDL = require('../idl/nft_bidding.json');
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
const ws = new WebSocket(`wss://atlas-devnet.helius-rpc.com?api-key=${process.env.HELIUS_API_KEY}`); // DEVNET
// const ws = new WebSocket(`wss://atlas-mainnet.helius-rpc.com?api-key=${process.env.HELIUS_API_KEY}`); // MAINNET

// Function to send a request to the WebSocket server
function sendRequest(ws) {
    const request = {
        jsonrpc: "2.0",
        id: 420,
        method: "transactionSubscribe",
        params: [
            {
                accountInclude: ["RadM2sDRatLmA8hnVo79sjUu2n9xpesNsaP5oeuVjmL"]
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

// Console log 'BOT is online' and start the uptime timer.
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

        if (messageObj?.params?.result?.transaction?.meta?.logMessages[1] === 'Program log: Instruction: CreateAuction' && messageObj.params) { // change to === in prod
            console.log('Success! This transaction is a createAuction transaction.');

            const signature = messageObj?.params?.result?.signature;

            // Borsh Deserialization Part
            (async () => {
                const conn = new Connection(clusterApiUrl('devnet'));
                const tx = await conn.getTransaction(signature);

                // console.log('tx: ', tx.transaction.message.instructions[0]);

                if (tx) {
                    const coder = new anchor.BorshCoder(IDL);
                    const ix = coder.instruction.decode(
                        tx.transaction.message.instructions[0].data,
                        'base58',
                    );
                    if (!ix) throw new Error("Could not parse data.");
                    const accountMetas = tx.transaction.message.instructions[0].accounts.map(
                        (idx) => ({
                            pubkey: tx.transaction.message.accountKeys[idx],
                            isSigner: tx.transaction.message.isAccountSigner(idx),
                            isWritable: tx.transaction.message.isAccountWritable(idx),
                        }),
                    );
                    const formatted = coder.instruction.format(ix, accountMetas);
                    // console.log(ix, formatted);

                    // Conversion of the deserialized data from a fake object to a JSON object 
                    function convertStringToObject(str) {
                        // Add quotes around the keys
                        str = str.replace(/([a-zA-Z0-9_]+)(?=:)/g, '"$1"');

                        // Add quotes around string-type values
                        str = str.replace(/: ([a-zA-Z0-9_]+)/g, ': "$1"');

                        try {
                            return JSON.parse(str);
                        } catch (e) {
                            console.error("Error while parsing the string: ", e);
                            return null;
                        }
                    }

                    let dataString = `${formatted?.args[0]?.data}`;
                    let dataObject = convertStringToObject(dataString);

                    // console.log(dataObject);

                    // Truncation of the NFT mint to display it in discord as a shortened clickable link
                    let strMint = dataObject?.mint;

                    // Check if the length is greater than 6 to avoid truncating short strings
                    if (strMint.length > 6) {
                        let truncatedMint = strMint.substring(0, 3) + '...' + str.substring(strMint.length - 3);
                        // console.log(truncatedMint);
                    } else {
                        // If the string is short, display it as it is
                        // console.log(strMint);
                    }

                    // Using mint to get the image for displaying purpose
                    const mint = [
                        strMint
                    ];

                    (async () => {
                        const metaMint = await functions.getMetadata(mint);
                        // console.log(metaMint[0]?.offChainMetadata?.metadata?.image);
                    })();

                    const channel = await client.channels.fetch(CHANNEL_ID);
                    const solscan = hyperlink('Solscan', `https://solscan.io/tx/${signature}`);
                    const solanafm = hyperlink('SolanaFM', `https://solana.fm/tx/${signature}`);
                    const solscanMint = hyperlink(truncatedMint, `https://solscan.io/token/${dataObject?.mint}`);

                    // Discord displaying
                    const createAuction = new EmbedBuilder()
                        .setTitle(BOT)
                        .setDescription("_<a:love:1193901627510366228> A new auction has been created!_") // can change the emoji when inside the said service, right right on the emoji, copy text
                        .setColor('DarkerGrey')
                        .setImage(`${metaMint[0]?.offChainMetadata?.metadata?.image}`)
                        .addFields(
                            { name: 'Starts:', value: `\`<t:${dataObject?.startTimestamp}:R>\``, inline: true },
                            { name: 'Ends:', value: `\`<t:${dataObject?.endTimestamp}:R>\``, inline: true },
                            { name: 'Mint:', value: `${solscanMint}`, inline: true }
                        )
                        .addFields(
                            { name: 'Uptime:', value: `\`${functions.convertUptime(functions.countTime(startTime))}\``, inline: true },
                            { name: 'Current Version:', value: `\`${process.env.VERSION}\``, inline: true }
                        )
                        .addFields(
                            { name: 'Links', value: `🔎 ${solscan} 🕵️ ${solanafm}`, inline: false }
                        )
                        .setFooter({ text: 'https://twitter.com/RadiantsDAO', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Logo_of_Twitter.svg/512px-Logo_of_Twitter.svg.png' });

                    // Sending embed
                    await channel.send({ embeds: [createAuction] });

                } else {
                    console.log('Transaction not found or lacks additional data');
                }
            })();
            
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