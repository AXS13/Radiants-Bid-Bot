const functions = {

    // Count the time in seconds between now and the last reboot of the bot
    countTime(startTime) {
        const currentTime = Date.now();
        const elapsedTimeInSeconds = Math.floor((currentTime - startTime) / 1000);
        return elapsedTimeInSeconds;
    },

    // Convert the uptime of the bot from seconds to a more readable format
    convertUptime(seconds) {
        const days = Math.floor(seconds / (3600*24));
        seconds -= days * 3600 * 24;
        const hours = Math.floor(seconds / 3600);
        seconds -= hours * 3600;
        const minutes = Math.floor(seconds / 60);
        seconds -= minutes * 60;
        return days + " days " + hours + " hours " + minutes + " minutes " + seconds + " seconds";
    },
    

};

module.exports = functions;