const { PublicKey, Connection, Keypair, clusterApiUrl } = require('@solana/web3.js');
const BufferLayout = require('@solana/buffer-layout');
const anchor = require('@coral-xyz/anchor');
const borsh = require('borsh');
const bs58 = require('bs58');




async function getParsedTransactionDetailsIncludingRawText(transactionSignature) {
    const connection = new Connection(clusterApiUrl('devnet'));
    const parsedTransaction = await connection.getParsedTransaction(transactionSignature, { maxSupportedTransactionVersion: 0 });

    if (parsedTransaction && parsedTransaction.meta) {
        return {
            instructions: parsedTransaction.transaction.message.instructions,
            rawTextData: parsedTransaction.meta, // or a specific field within meta
            raw: parsedTransaction// or a specific field within meta
        };
    } else {
        return null;
    }
}

const transactionSignature = 'gjvLrTL3MVfi7CDMu8xPM4ocZxzADTgbYNLwXPdWE8fYHfDhzwJccRP1VDrQ27cryF5FeKfKfNzK4xTmA5gpdsN';

getParsedTransactionDetailsIncludingRawText(transactionSignature).then(data => {
    if (data) {
        console.log('Parsed Instructions:', data.instructions);
    } else {
        console.log('Transaction not found or lacks additional data');
    }
});

/*
function decodeBase58Data(encodedData) {
    try {
        let decodedBuffer = bs58.decode(encodedData);
        console.log("Decoded Buffer: ", decodedBuffer);
    } catch (error) {
        console.error("Error decoding Base58 data: ", error);
    }
}
*/



/*
// Define a layout for the publicKey as a 32-byte array
function publicKey(property = 'publicKey') {
    return BufferLayout.blob(32, property);
}

// Define a custom layout for signed 64-bit integers (8 bytes)
function i64(property = 'i64') {
    return BufferLayout.blob(8, property);
}

// Function to convert 8-byte buffer to BigInt (signed 64-bit integer)
function bufferToBigInt(buffer) {
    let hex = [];
    for (let byte of buffer) {
        hex.push(byte.toString(16).padStart(2, '0'));
    }
    // Assumes little-endian format; adjust if your data is big-endian
    return BigInt('0x' + hex.reverse().join(''));
}

// Define the CreateAuctionArgsLayout
const CreateAuctionArgsLayout = BufferLayout.struct([
    i64('startTimestamp'),
    i64('endTimestamp'),
    i64('duration'),
    publicKey('owner'),
    publicKey('mint'),
    publicKey('winner'),
    publicKey('highestBid'),
    publicKey('highestBidder'),
    BufferLayout.nu64('highestBidTs')
], 'CreateAuctionArgs');

// Encoded data (Base64 string)
let base64Data = '3gZz6PSBtXka5nuf7DGeeFxWBiRG233kkAiR2bi6662zkA7HR2KuXjop3XLopxroSux4yz2Jjyr8xcftXhRaiUDnMsASJgYeTacm25hBVsW4vTS7D5Eeno91txPTH3FLCS9rBbQ7cwN7U6qX6BZwKPf1uHEf8mcuL8Jy481z4YxN4xcikkX15byQB8ee29d2CkAuVj9JfE2XcnR3BsAeaKR6ynrk5bJuW7E1tPLF4FmS9q8JMMBiyipUg2WhPMiiVuRGCgN8Zvkj3A8ZtQUiqC5azqp24xYBGtVaVj7BbQ42keehF6THuNewp7keRaF912dEr1wtq4MVrHm5D1gbJRbgvhN5SN2oqpebD6mrQCTb';
let dataBuffer = Buffer.from(base64Data, 'base64'); // Convert Base64 to Buffer
let hexString = dataBuffer.toString('hex'); // Convert Buffer to Hex
console.log('Hex decoded: ', hexString);

// Decode the data using the defined layout
const decodedData = CreateAuctionArgsLayout.decode(dataBuffer);

console.log('Decoded Data:', decodedData);

// Optionally, convert timestamp buffers to BigInts
decodedData.startTimestamp = bufferToBigInt(decodedData.startTimestamp);
decodedData.endTimestamp = bufferToBigInt(decodedData.endTimestamp);
decodedData.duration = bufferToBigInt(decodedData.duration);
decodedData.owner = decodedData.owner.toString('utf-8');

console.log('Processed Decoded Data:', decodedData);

/*
// Assuming you have the IDL for your Solana program
const IDL = {
    "version": "0.1.0",
    "name": "auction_program",
    "instructions": [
        {
            "name": "createAuction",
            "accounts": [],
            "args": [
                {
                    "name": "startTimestamp",
                    "type": "i64"
                },
                {
                    "name": "endTimestamp",
                    "type": "i64"
                },
                {
                    "name": "duration",
                    "type": "i64"
                },
                {
                    "name": "owner",
                    "type": "publicKey"
                },
                {
                    "name": "mint",
                    "type": "publicKey"
                },
                {
                    "name": "winner",
                    "type": "publicKey"
                },
                {
                    "name": "highestBid",
                    "type": "publicKey"
                },
                {
                    "name": "highestBidder",
                    "type": "publicKey"
                },
                {
                    "name": "highestBidTs",
                    "type": "u64"
                },
                {
                    "name": "allowlists",
                    "type": {
                        "vec": {
                            "defined": "AllowlistEntry"
                        }
                    }
                }
            ]
        }
    ],
    "accounts": [],
    "types": [
        {
            "name": "AllowlistEntry",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "kind",
                        "type": "u8"
                    },
                    {
                        "name": "value",
                        "type": "publicKey"
                    }
                ]
            }
        }
    ]
};

// Create a BorshCoder instance with your IDL
const bidCoder = new anchor.BorshCoder(IDL);

// The Borsh-encoded data you want to decode
let data = '3gZz6PSBtXka5nuf7DGeeFxWBiRG233kkAiR2bi6662zkA7HR2KuXjop3XLopxroSux4yz2Jjyr8xcftXhRaiUDnMsASJgYeTacm25hBVsW4vTS7D5Eeno91txPTH3FLCS9rBbQ7cwN7U6qX6BZwKPf1uHEf8mcuL8Jy481z4YxN4xcikkX15byQB8ee29d2CkAuVj9JfE2XcnR3BsAeaKR6ynrk5bJuW7E1tPLF4FmS9q8JMMBiyipUg2WhPMiiVuRGCgN8Zvkj3A8ZtQUiqC5azqp24xYBGtVaVj7BbQ42keehF6THuNewp7keRaF912dEr1wtq4MVrHm5D1gbJRbgvhN5SN2oqpebD6mrQCTb';
let dataBufferAnchor = Buffer.from(data, 'base64'); // Convert Base64 to Buffer

// Decode the data into a specific account type
let decodedAuctionStateData = bidCoder.accounts.decode("AuctionState", dataBufferAnchor);


console.log(decodedAuctionStateData);
*/






