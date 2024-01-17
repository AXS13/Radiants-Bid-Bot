require('dotenv').config();

const functions = {

    // Count the time in seconds between now and the last reboot of the bot
    countTime(startTime) {
        const currentTime = Date.now();
        const elapsedTimeInSeconds = Math.floor((currentTime - startTime) / 1000);
        return elapsedTimeInSeconds;
    },

    // Convert the uptime of the bot from seconds to a more readable format
    convertUptime(seconds) {
        const days = Math.floor(seconds / (3600 * 24));
        seconds -= days * 3600 * 24;
        const hours = Math.floor(seconds / 3600);
        seconds -= hours * 3600;
        const minutes = Math.floor(seconds / 60);
        seconds -= minutes * 60;
        return days + " days " + hours + " hours " + minutes + " minutes " + seconds + " seconds";
    },

    // Get Mint
    async getMetadata(tokens) {
        const response = await fetch(`https://api.helius.xyz/v0/token-metadata?api-key=${process.env.HELIUS_API_KEY}`, {
            // const response = await fetch(`https://api-devnet.helius.xyz/v0/token-metadata?api-key=${process.env.HELIUS_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                mintAccounts: tokens,
                includeOffChain: true,
                disableCache: false,
            }),
        });

        const data = await response.json();
        return data;
    },

    async getAssetsByOwner(owner) {
        const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'my-id',
                method: 'getAssetsByOwner',
                params: {
                    ownerAddress: owner,
                    page: 1, // Starts at 1
                    limit: 1000,
                },
            }),
        });
        const data = await response.json();
        return data;
    },

};

module.exports = functions;