require('dotenv').config();

const functions = require('./functions.js');
const WebSocket = require('ws');
const { Client, IntentsBitField, EmbedBuilder, hyperlink } = require("discord.js");
const { Connection, clusterApiUrl } = require('@solana/web3.js');
let config = require('../src/assets/discords.json');
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
function initiateBidsWebSocketConnection() {
    // const ws = new WebSocket(`wss://atlas-devnet.helius-rpc.com?api-key=${process.env.HELIUS_API_KEY}`); // DEVNET
    const ws = new WebSocket(`wss://atlas-mainnet.helius-rpc.com?api-key=${process.env.HELIUS_API_KEY}`); // MAINNET
    ws.on('open', () => handleWebSocketOpen(ws));
    ws.on('message', handleWebSocketMessage);
    ws.on('error', handleWebSocketError);
    ws.on('close', () => handleWebSocketClose());
}

function handleWebSocketOpen(ws, ) {
    console.log('Bids WebSocket is open.');
    sendRequest(ws);
}

function handleWebSocketMessage(data) {
    processIncomingMessage(data).catch(console.error);
}

function handleWebSocketError(err) {
    console.error('Bids WebSocket error:', err);
}

function handleWebSocketClose() {
    console.log('Bids WebSocket is closed. Attempting to reconnect...');
    setTimeout(initiateBidsWebSocketConnection, 5000); // Reconnect after 5 seconds
}

// Function to send a request to the WebSocket server
function sendRequest(ws) {
    const request = {
        jsonrpc: "2.0",
        id: 420,
        method: "transactionSubscribe",
        params: [
            {
                accountInclude: ["CPYXdB45JxUZDgh5ccGUPtgZeXz1Nwr57oQcsw8Uy2TC"]
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

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

async function processIncomingMessage(data) {
    const messageStr = data.toString('utf8');
    try {
        const messageObj = JSON.parse(messageStr);
        // console.log('Tx found:', messageObj?.params?.result?.signature);

        if (messageObj?.params?.result?.transaction?.meta?.logMessages[5] === 'Program log: Instruction: DepositNft' && messageObj.params) { // change to === in prod

            console.log('Success! This transaction is a DepositNft transaction.');

            const transactionSignature = messageObj?.params?.result?.signature;
            // console.log(transactionSignature);
            (async () => {
                const conn = new Connection(`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`, 'finalized');
                console.log("Waiting starts");
                await delay(5000); // Timeout needed to fetch mainnet tx
                console.log("5 seconds have passed");
                const tx = await conn.getTransaction(transactionSignature, 'finalized');

                // console.log('tx: ', tx);

                if (tx) {
                    const coder = new anchor.BorshCoder(IDL);
                    const ix = coder.instruction.decode(
                        tx.transaction.message.instructions[2].data,
                        'base58',
                    );
                    if (!ix) throw new Error("Could not parse data.");
                    const accountMetas = tx.transaction.message.instructions[2].accounts.map(
                        (idx) => ({
                            pubkey: tx.transaction.message.accountKeys[idx],
                            isSigner: tx.transaction.message.isAccountSigner(idx),
                            isWritable: tx.transaction.message.isAccountWritable(idx),
                        }),
                    );

                    const formatted = coder.instruction.format(ix, accountMetas);
                    if (formatted.accounts[5].name === 'Bid Escrow') {
                        // console.log(formatted.accounts[5].pubkey.toString());

                        // MAINNET TEST TO FETCH ALL NFTS AND CNFTS
                        // owner = 'Gkb8wxgqhixY3K8NNrM5KZuSY5yFftud8Jp2D5KMXLPQ';
                        owner = formatted.accounts[5].pubkey.toString();

                        (async () => {
                            const response = await functions.getAssetsByOwner(owner);

                            // Mapping of addresses to names
                            // Don't forget to add the collection id as well as the name of the collection if you add another collection to bid with
                            const acceptedCollections = {
                                "2SBsLb5CwstwxxDmbanRdvV9vzeACRdvYEJjpPSFjJpE": "Bears Reloaded",
                                "GxPPZB5q1nsUTPw8Kkp4qUpbegrGxHiJfgzm3V43zjAy": "Ded Monkes",
                                "5f2zrjBonizqt6LiHSDfbTPH74sHMZFahYQGyPNh825G": "BAPE",
                            };

                            // Counter for occurrences based on collection names
                            const occurrenceCounter = {};

                            // Iterate through each item in the 'items' array
                            response.result.items.forEach(item => {
                                // let name = item.content?.metadata?.name || 'Name not found';

                                // Check if the item has the required grouping and if it matches the desired values
                                item.grouping?.forEach(group => {
                                    if (group.group_key === 'collection' && acceptedCollections[group.group_value]) {
                                        // Get the collection name
                                        const collectionName = acceptedCollections[group.group_value];

                                        // Increment the counter for this collection name
                                        occurrenceCounter[collectionName] = (occurrenceCounter[collectionName] || 0) + 1;

                                        // Log the name and corresponding collection name
                                        // console.log(`Name: ${name}, Collection: ${collectionName}`);
                                    }
                                });
                            });

                            // After the loop, log the occurrence counts
                            console.log("Occurrences by Collection Name:", occurrenceCounter);

                            let dedMonkesCount = occurrenceCounter['Ded Monkes'] || 0;
                            let bearsReloadedCount = occurrenceCounter['Bears Reloaded'] || 0;
                            let BAPECount = occurrenceCounter['BAPE'] || 0;

                            mainImg = 'https://pbs.twimg.com/profile_banners/1446275363202502844/1697575408/1080x360';

                            let totalNftsCount = dedMonkesCount + bearsReloadedCount + BAPECount;
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

                            // GET MINT IMAGE
                            const responseImg = await functions.getAssetsByOwner('CPYXdB45JxUZDgh5ccGUPtgZeXz1Nwr57oQcsw8Uy2TC');
                            const acceptedCollection = {
                                "rad7j6PpBLzBas3Yrt59Tsd5ohVuyt614PkBYznBh1a": "Radiants"
                            };
                        
                            let imgLink = '';
                        
                            // Iterate through each item in the 'items' array
                            responseImg.result.items.forEach(item => {
                                // let name = item.content?.metadata?.name || 'Name not found';
                        
                                // Check if the item has the required grouping and if it matches the desired values
                                item.grouping?.forEach(group => {
                                    let i = 0;
                                    if (group.group_key === 'collection' && acceptedCollection[group.group_value]) {
                                        // Get the collection name
                                        const collectionName = acceptedCollection[group.group_value];
                                        imgLink = responseImg?.result?.items[i]?.content?.links?.image;
                        
                                        // Log the name and corresponding collection name
                                        console.log(`Collection: ${collectionName}`);
                                    } else {
                                        i++;
                                    }
                                });
                            });
                        
                            //console.log("Data:", imgLink);

                            // Discord displaying
                            (async () => {
                                const solscan = hyperlink('Solscan', `https://solscan.io/account/${owner}`);
                                const solanafm = hyperlink('SolanaFM', `https://solana.fm/address/${owner}`);

                                const DM = hyperlink('Ded Monkes', 'https://twitter.com/DegenMonkes');
                                const BR = hyperlink('Bears Reloaded', 'https://twitter.com/BearsReloaded');
                                const BAPE = hyperlink('BAPE', 'https://twitter.com/wearebuilders_');

                                const newBid = new EmbedBuilder()
                                    .setTitle(BOT)
                                    .setDescription(`☀️ _**${title}** ${hype}_`) // can change the emoji when inside the said service, right click on the emoji, copy text
                                    .setThumbnail(`${imgLink}`)
                                    .setColor('#fee185')
                                    .setImage(`${mainImg}`)
                                    .addFields(
                                        {
                                            name: 'Offerings:', value: `💀 ${DM}: **${dedMonkesCount}x** NFTs\n🐻 ${BR}: **${bearsReloadedCount}x** NFTs\n🦍 ${BAPE}: **${BAPECount}x** NFTs\n🏆 Total: **${totalNftsCount}** NFTs 🔥`, inline: true
                                        },
                                    )
                                    .addFields(
                                        { name: 'Bidder:', value: `\`${formatted.accounts[0].pubkey.toString()}\``, inline: false }
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
                                                if (totalNftsCount !== 0) {
                                                    await channel.send({ embeds: [newBid] });
                                                } else {
                                                    console.log('No NFTs to display. Most likely a failed transaction or unsupported collection.');
                                                }
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
                        })();
                    } else {
                        console.log('Error in retrieving Bid Escrow Pubkey');
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
initiateBidsWebSocketConnection();
module.exports = { initiateBidsWebSocketConnection };





