require('dotenv').config();

const functions = require('./functions.js');
const { Connection, clusterApiUrl } = require('@solana/web3.js');
const anchor = require('@coral-xyz/anchor');
const IDL = require('../idl/nft_bidding.json');

const transactionSignature = 'yvupzbRZGwFbDGPz89dXfbHrR6fjW7EvPxKf57dWrXLJzbEEmVUyHMFfXzLkLeqSZPNt2K56da74WAZ5Vw6cRPb';

(async () => {
    const conn = new Connection(clusterApiUrl('devnet'));
    const tx = await conn.getTransaction(transactionSignature);

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
        console.log(formatted?.args[0]?.data);

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

        console.log(dataObject);



    } else {
        console.log('Transaction not found or lacks additional data');
    }
})();

/* DEVNET TEST FOR MINT IMG DISPLAYING

ttt = '7FfLHuJasGVyE25UHrbgmErnnQsFokCPE113M1Fk8RFC'
// Using mint to get the image for displaying purpose
const mint = [
    ttt
];

(async () => {
    const metaMint = await functions.getMetadata(mint);
    console.log(metaMint[0]?.offChainMetadata?.metadata?.image);
    console.log(metaMint);
})();

*/
