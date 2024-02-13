require('dotenv').config();

const WebSocket = require('ws');
const { Client, IntentsBitField, EmbedBuilder, hyperlink } = require("discord.js");
const { Connection } = require('@solana/web3.js');
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

const BIDDING_CODER = new anchor.BorshCoder(IDL);
const confirmTransactionInitialTimeout = 120 * 1000;
const providerUrl = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;

const providerOptions = {
    preflightCommitment: 'confirmed',
    commitment: 'confirmed',
};
const providerConnection = new Connection(providerUrl, {
    commitment: providerOptions.commitment,
    confirmTransactionInitialTimeout
});

const readOnlyWallet = {
    publicKey: Keypair.generate().publicKey,
    signTransaction: async (tx) => {
        throw new Error(
            "Can't call signTransaction() on read only wallet"
        );
    },
    signAllTransactions: async (txs) => {
        throw new Error(
            "Can't call signAllTransactions() on read only wallet"
        );
    },
};
// Set the provider
// Returns a provider read from the ANCHOR_PROVIDER_URL environment variable
export const provider = new anchor.AnchorProvider(providerConnection, readOnlyWallet, providerOptions)
anchor.setProvider(provider);

// Generate the program client from IDL
export const program = new anchor.Program(IDL, new PublicKey("bidoyoucCtwvPJwmW4W9ysXWeesgvGxEYxkXmoXTaHy"), provider);
// Function to initiate or reinitiate WebSocket connection
function initiateHighBidWebSocketConnection(program = "bidoyoucCtwvPJwmW4W9ysXWeesgvGxEYxkXmoXTaHy") {
    // const ws = new WebSocket(`wss://atlas-devnet.helius-rpc.com?api-key=${process.env.HELIUS_API_KEY}`); // DEVNET
    const ws = new WebSocket(`wss://atlas-mainnet.helius-rpc.com?api-key=${process.env.HELIUS_API_KEY}`); // MAINNET
    ws.on('open', () => handleWebSocketOpen(ws, program));
    ws.on('message', handleWebSocketMessage);
    ws.on('error', handleWebSocketError);
    ws.on('close', () => handleWebSocketClose(program));
}

function handleWebSocketOpen(ws, program) {
    console.log('Program WebSocket is open, program: ', program);
    sendRequest(ws, program);
}

function handleWebSocketMessage(data) {
    processIncomingMessage(data).catch(console.error);
}

function handleWebSocketError(err) {
    console.error('Bids WebSocket error:', err);
}

function handleWebSocketClose() {
    console.log('Bids WebSocket is closed. Attempting to reconnect...');
    setTimeout(initiateHighBidWebSocketConnection(program), 5000); // Reconnect after 5 seconds
}

// Function to send a request to the WebSocket server
function sendRequest(ws, program) {
    const request = {
        jsonrpc: "2.0",
        id: 420,
        method: "transactionSubscribe",
        params: [
            {
                accountInclude: [program]
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

        if (messageObj && messageObj.method == "transactionNotification") { // change to === in prod

            console.log('Success! This transaction is a DepositNft transaction.');

            const transaction = [messageObj.params.result.transaction];
            // console.log(transaction);

            const occurrenceCounter = {};
            const acceptedCollections = {
                "2SBsLb5CwstwxxDmbanRdvV9vzeACRdvYEJjpPSFjJpE": "Bears Reloaded",
                "GxPPZB5q1nsUTPw8Kkp4qUpbegrGxHiJfgzm3V43zjAy": "Ded Monkes",
                "5f2zrjBonizqt6LiHSDfbTPH74sHMZFahYQGyPNh825G": "BAPE",
                "BiwemBos3Su9QcNUiwkZMbSKi7m959t5oVpmPnM9Z3SH": "LIFINITY Flares"
            };
            (async () => {
                for (const txResponse of transaction) {

                    // console.log("txResponse: ", txResponse);
                    const signature = txResponse.transaction.signatures[0];
                    console.log(`Processing tx: ${signature}`);

                    if (txResponse.meta && txResponse.meta.err !== null) {
                    continue;
                    }

                    const instructions = txResponse.transaction.message.instructions;
                    // console.log("instructions: ", instructions);

                    for (const ix of instructions) {
                        const ixProgram = ix.programId;

                        if (ixProgram !== "bidoyoucCtwvPJwmW4W9ysXWeesgvGxEYxkXmoXTaHy") {
                            continue;
                        }

                        const decodedIx = BIDDING_CODER.instruction.decode(bs58.decode(ix.data));
                        if (!decodedIx) {
                            console.log(`Failed to decode instruction for signature ${signature}`);
                            continue;
                        }

                        console.log('Decoded Ix name: ', decodedIx.name);

                        if (decodedIx.name === 'updateHighBid') {
                            console.log('Update High Bid Transaction');
                            const highBidIx = decodedIx.data;

                            // Auction ID from IX
                            // const nftEscrowAccount = new PublicKey(ix.accounts[1]);

                            // Timestamp of HighestBid
                            // const highestBidTs = Number(highBidIx.args.highestBidTs);
                            const highestBidderPubkey = highBidIx.args.highestBidder;
                            const highestBidPubkey = highBidIx.args.highestBid;
                            let bidData =  await program.account.bidEscrow.fetch(highestBidPubkey);
                            let collectionsInBid = await bidData.collections;
                            for(let i = 0; i < collectionsInBid.length; i++) {
                                let currentCollectionObject = collectionsInBid[i];
                                let currentCollectionCount = Number(currentCollectionObject.count);
                                let currentCollectionId = currentCollectionObject.value.toString();
                                if(currentCollectionId !== "SUB1orE6jSMF8K627BPLXyJY5LthVyDriAxTXdCF4Cy") {
                                    let currentCollectionName = acceptedCollections[currentCollectionId];
                                    occurrenceCounter[currentCollectionName] = currentCollectionCount;
                                }
                            }

                            // After the loop, log the occurrence counts
                            console.log("Occurrences by Collection Name:", occurrenceCounter);

                            let dedMonkesCount = occurrenceCounter['Ded Monkes'] || 0;
                            let bearsReloadedCount = occurrenceCounter['Bears Reloaded'] || 0;
                            let bapeCount = occurrenceCounter['BAPE'] || 0;
                            let lifinityCount = occurrenceCounter['LIFINITY Flares'] || 0;

                            mainImg = 'https://pbs.twimg.com/profile_banners/1446275363202502844/1697575408/1080x360';

                            let totalNftsCount = dedMonkesCount + bearsReloadedCount + bapeCount + lifinityCount;
                            let hype = '';
                            let title = '';

                            switch (true) {
                                case (totalNftsCount < 10):
                                    hype = '🔥'
                                    title = 'A new offering has just been presented.';
                                    break;
                                case (totalNftsCount > 10 && totalNftsCount < 50):
                                    hype = '🔥🔥'
                                    title = 'A remarkable new offering has been revealed, drawing considerable attention.';
                                    break;
                                case (totalNftsCount > 50):
                                    hype = '🔥🔥🔥'
                                    title = 'A truly sensational and unprecedented offering has just been unveiled, stirring immense excitement and awe.';
                                    break;
                                default:
                                    console.log('Default Switch');
                            }

                            // Discord displaying
                            (async () => {
                                const channel = await client.channels.fetch(CHANNEL_ID);

                                const solscan = hyperlink('Solscan', `https://solscan.io/account/${highestBidderPubkey}`);
                                const solanafm = hyperlink('SolanaFM', `https://solana.fm/address/${highestBidderPubkey}`);

                                const DM = hyperlink('Ded Monkes', 'https://twitter.com/DegenMonkes');
                                const BR = hyperlink('Bears Reloaded', 'https://twitter.com/BearsReloaded');
                                const BP = hyperlink('BAPE', 'https://twitter.com/WeAreBuilders_');
                                const LF = hyperlink('LIFINITY Flares', 'https://twitter.com/Lifinity_io');

                                const newBid = new EmbedBuilder()
                                    .setTitle(BOT)
                                    .setDescription(`☀️ _**${title}** ${hype}_`) // can change the emoji when inside the said service, right click on the emoji, copy text
                                    .setColor('#fce185')
                                    .setImage(`${mainImg}`)
                                    .addFields(
                                        {
                                            name: 'Offerings:', value: `💀 ${DM}: **${dedMonkesCount}x** NFTs\n🐻 ${BR}: **${bearsReloadedCount}x** NFTs\n🐵 ${BP}: **${bapeCount}x** NFTs\n🔥 ${LF}: **${lifinityCount}x** NFTs\n🏆 Total: **${totalNftsCount}** NFTs 🔥`, inline: true
                                        },
                                    )
                                    .addFields(
                                        { name: 'Bidder:', value: `\`${highestBidderPubkey.toString()}\``, inline: false }
                                    )
                                    .addFields(
                                        { name: 'Links:', value: `🔎 ${solscan} 🕵️ ${solanafm}`, inline: false }
                                    )
                                    .setFooter({ text: 'https://twitter.com/RadiantsDAO', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Logo_of_Twitter.svg/512px-Logo_of_Twitter.svg.png' });

                                // Sending embed
                                for (const [guildId, guild] of client.guilds.cache) {
                                    if (config.guilds[guildId]) {
                                        const channelId = config.guilds[guildId];
                                        try {
                                            const channel = await client.channels.fetch(channelId.channelId); // Fetch the channel
                                            if (channel) {
                                                await channel.send({ embeds: [newBid] });
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
                        }
                    }
                }
            })();

        } else {
            console.log('Whoops... Still not a DepositNft transaction.')
        }
    } catch (e) {
        console.error('Failed to parse JSON:', e);
    }
}

client.login(process.env.TOKEN);
//initiateHighBidWebSocketConnection();
module.exports = { initiateHighBidWebSocketConnection };





