const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');

require('dotenv').config();

// Your base58 encoded private key string
const privateKeyString = process.env.PRIVATE_KEY;

// Decode the base58 string to a Uint8Array
const privateKeyArray = bs58.decode(privateKeyString);

// Now privateKeyArray is a Uint8Array of the private key
console.log(privateKeyArray);

// To create a keypair from this array
const keypair = Keypair.fromSecretKey(privateKeyArray);

// If you need the array format for the .env file or other uses:
const privateKeyArrayFormat = Array.from(privateKeyArray);
console.log(privateKeyArrayFormat);
