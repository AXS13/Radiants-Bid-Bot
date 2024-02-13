require('dotenv').config();

const functions = require('./functions.js');
const { Connection, clusterApiUrl } = require('@solana/web3.js');
const anchor = require('@coral-xyz/anchor');
const IDL = require('../idl/nft-bidding.json');

/*
const transactionSignature = '4T4wy3sjbhf2PjgbKCiycmWz6M6p6bAAyhocMU27ngEkyHTWvFeEyjT7RqsqwUZ3CTkhbr33KdPfrWS2Q75t3d5M';

(async () => {
    const conn = new Connection(`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`, 'finalized');
    const tx = await conn.getTransaction(transactionSignature);

    //console.log('tx: ', tx.transaction.message.instructions[0]);

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
        // console.log(ix, formatted?.accounts[3]?.pubkey.toString());
        //console.log(formatted?.args[0]?.data);

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
*/

//DEVNET TEST FOR MINT IMG DISPLAYING

tttt = ["CPYXdB45JxUZDgh5ccGUPtgZeXz1Nwr57oQcsw8Uy2TC"];
// Using mint to get the image for displaying purpose

(async () => {
    const response = await functions.getAssetsByOwner(ttt.toString());

    const acceptedCollections = {
        "rad7j6PpBLzBas3Yrt59Tsd5ohVuyt614PkBYznBh1a": "Radiants"
    };

    let imgLink = '';

    // Iterate through each item in the 'items' array
    response.result.items.forEach(item => {
        // let name = item.content?.metadata?.name || 'Name not found';

        // Check if the item has the required grouping and if it matches the desired values
        item.grouping?.forEach(group => {
            let i = 0;
            if (group.group_key === 'collection' && acceptedCollections[group.group_value]) {
                // Get the collection name
                const collectionName = acceptedCollections[group.group_value];
                imgLink = response?.result?.items[i]?.content?.links?.image;

                // Log the name and corresponding collection name
                console.log(`Collection: ${collectionName}`);
            } else {
                i++;
            }
        });
    });

    console.log("Data:", imgLink);

})();


