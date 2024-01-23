require('dotenv').config();

const functions = require('./functions.js');
const WebSocket = require('ws');
const { Client, IntentsBitField, EmbedBuilder, hyperlink } = require("discord.js");
const { Connection, clusterApiUrl } = require('@solana/web3.js');
const { initiateBidsWebSocketConnection } = require('./bids-websocket.js');
const anchor = require('@coral-xyz/anchor');
const IDL = require('../idl/nft-bidding.json');
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

// Function to initiate or reinitiate WebSocket connection
function initiateWebSocketConnection() {
    // const ws = new WebSocket(`wss://atlas-devnet.helius-rpc.com?api-key=${process.env.HELIUS_API_KEY}`); // DEVNET
    const ws = new WebSocket(`wss://atlas-mainnet.helius-rpc.com?api-key=${process.env.HELIUS_API_KEY}`); // MAINNET
    ws.on('open', () => handleWebSocketOpen(ws));
    ws.on('message', handleWebSocketMessage);
    ws.on('error', handleWebSocketError);
    ws.on('close', () => handleWebSocketClose());
}

function handleWebSocketOpen(ws) {
    console.log('Auction WebSocket is open');
    sendRequest(ws);
}

function handleWebSocketMessage(data) {
    processIncomingMessage(data).catch(console.error);
}

function handleWebSocketError(err) {
    console.error('Auction WebSocket error:', err);
}

function handleWebSocketClose() {
    console.log('Auction WebSocket is closed. Attempting to reconnect...');
    setTimeout(initiateWebSocketConnection, 5000); // Reconnect after 5 seconds
}

// Function to send a request to the WebSocket server
function sendRequest(ws) {
    const request = {
        jsonrpc: "2.0",
        id: 420,
        method: "transactionSubscribe",
        params: [
            {
                accountInclude: ["RadM2sDRatLmA8hnVo79sjUu2n9xpesNsaP5oeuVjmL"]
                // accountInclude: ["B3E6e8h6yhYFvMiEpTyAGi6DvgcisgFHy7wfetahvGuw"]
            },
            {
                commitment: "finalized",
                encoding: "jsonParsed",
                transactionDetails: "full",
                showRewards: false,
                maxSupportedTransactionVersion: 0
            }
        ]
    };
    ws.send(JSON.stringify(request));
}

async function processIncomingMessage(data) {
    const messageStr = data.toString('utf8');
    try {
        const messageObj = JSON.parse(messageStr);
        // console.log(messageObj);

        if (messageObj?.params?.result?.transaction?.meta?.logMessages[1] !== 'Program log: Instruction: CreateAuction' && messageObj.params) { // change to === in prod
            console.log('Success! This transaction is a createAuction transaction.');

            const signature = messageObj?.params?.result?.signature;

            // Borsh Deserialization Part
            (async () => {
                const conn = new Connection(`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`, 'finalized'); // Mainnet
                // const conn = new Connection(`https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`, 'finalized'); // Devnet
                const tx = await conn.getTransaction(signature);

                // console.log(signature);
                // console.log(tx);
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

                    // OPEN THE SECOND WEBSOCKET WITH THE AUCTION AS PARAMETER
                    initiateBidsWebSocketConnection(formatted?.accounts[3]?.pubkey.toString());

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
                        let truncatedMint = strMint.substring(0, 3) + '...' + strMint.substring(strMint.length - 3);
                        // console.log(truncatedMint);

                        // Using mint to get the image for displaying purpose
                        const mint = [
                            strMint
                        ];

                        (async () => {
                            const metaMint = await functions.getMetadata(mint);
                            // console.log(metaMint[0]?.offChainMetadata?.metadata?.image);

                            const channel = await client.channels.fetch(CHANNEL_ID);
                            const solscan = hyperlink('Solscan', `https://solscan.io/tx/${signature}`); // add ?cluster=devnet after the signature for devnet data
                            const solanafm = hyperlink('SolanaFM', `https://solana.fm/tx/${signature}`);
                            const solscanMint = hyperlink(truncatedMint, `https://solscan.io/token/${dataObject?.mint}`);

                            let mainImg = '';
                            if (!metaMint[0]?.offChainMetadata?.metadata?.image) {
                                mainImg = 'https://pbs.twimg.com/profile_banners/1446275363202502844/1697575408/1080x360';
                            } else {
                                mainImg = metaMint[0]?.offChainMetadata?.metadata?.image;
                            }

                            // Discord displaying
                            const createAuction = new EmbedBuilder()
                                .setTitle(BOT)
                                .setDescription("☀️ _A new auction has been created!_") // can change the emoji when inside the said service, right click on the emoji, copy text
                                .setColor('#fee185')
                                .setImage(`${mainImg}`)
                                .addFields(
                                    { name: 'Starts:', value: `<t:${dataObject?.startTimestamp}:R>`, inline: true },
                                    { name: 'Ends:', value: `<t:${dataObject?.endTimestamp}:R>`, inline: true },
                                    { name: 'Mint:', value: `${solscanMint}`, inline: true }
                                )
                                .addFields(
                                    { name: 'Links', value: `🔎 ${solscan} 🕵️ ${solanafm}`, inline: false }
                                )
                                .setFooter({ text: 'https://twitter.com/RadiantsDAO', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Logo_of_Twitter.svg/512px-Logo_of_Twitter.svg.png' });

                            // Sending embed
                            for (const [guildId, guild] of client.guilds.cache) {
                                if (config.guilds[guildId]) {
                                    const channelId = config.guilds[guildId];
                                    try {
                                        const channel = await client.channels.fetch(channelId.channelId); // Fetch the channel
                                        if (channel) {
                                            await channel.send({ embeds: [createAuction] });
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

                        })();
                    } else {
                        // If the string is short, display it as it is
                        // console.log(strMint);
                    }

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

client.login(process.env.TOKEN);

// Start WebSocket connection initially
// initiateWebSocketConnection();
module.exports = { initiateWebSocketConnection };
