const { ChatClient, JoinRateLimiter, ConnectionRateLimiter, ConnectionPool } = require('@kararty/dank-twitch-irc');
const axios = require('axios');

const existingChannels = new Set();
const channelMessageTimestamps = new Map();

const TWITCH_CLIENT_ID = 'TWICH_CLIENT_ID';
const TWITCH_ACCESS_TOKEN = 'TWITCH_ACCESS_TOKEN';

const client = new ChatClient({
    username: 'USERNAME',
    password: 'PASSWORD',
    rateLimits: 'BOT TYPE',
    ignoreUnhandledPromiseRejections: true,
    installDefaultMixins: false,
    connection: {
        type: 'websocket',
        secure: true,
    },
    maxChannelCountPerConnection: 5000,
    connectionRateLimits: {
        parallelConnections: 3500,
        releaseTime: 20,
    }
});

client.use(new JoinRateLimiter(client));
client.use(new ConnectionPool(client, { poolSize: 150 }));
client.use(new ConnectionRateLimiter(client));

client.on('ready', () => console.log('connected'));

function processChannels(channels) {
    const newChannels = channels.filter(channel => 
        !existingChannels.has(channel.user_login)
    );

    newChannels.forEach(channel => existingChannels.add(channel.user_login));

    if (newChannels.length > 0) {
        client.joinAll(newChannels.map(channel => channel.user_login));
    }
}

async function fetchChannels() {
    let cursor;
    try {
        do {
            const response = await axios.get(`https://api.twitch.tv/helix/streams?first=100${cursor ? `&after=${cursor}` : ''}`, {
                headers: {
                    'Client-ID': TWITCH_CLIENT_ID,
                    'Authorization': `Bearer ${TWITCH_ACCESS_TOKEN}`
                }
            });
            cursor = response.data.pagination.cursor;
            processChannels(response.data.data);
        } while (cursor);
    } catch (error) {
        console.error('Error fetching channels:', error);
    }
}

function scheduleChannelFetch() {
    fetchChannels()
        .then(() => setTimeout(scheduleChannelFetch, 300000)) // Fetch every 5 minutes
        .catch(() => setTimeout(scheduleChannelFetch, 1000));
}

client.connect();
scheduleChannelFetch();

setInterval(() => {
    console.log(`connections: ${client.connections.length}, joined: ${client.joinedChannels.size}`);
}, 15000);

const validClipMessages = [
    "10/10 clip", "lol", "lmao"
];

const validClipMessagePatterns = [
    /^LETSGO{5,10}$/, 
    /^LET'?S\sGO{5,10}$/, 
    /^AHAH{5,10}$/, 
    /^WHAAA{5,10}T$/, 
    /^LMFAOO{5,10}$/, 
    /^LOOO{5,10}L$/, 
    /^OMG{5,10}$/, 
    /^LMAOO{5,10}$/, 
    /^HYPEE{5,10}$/, 
    /^OOOOO{5,10}$/
];

function isValidClipMessage(message) {
    const trimmedMessage = message.trim();
    if (validClipMessages.includes(trimmedMessage)) {
        return true;
    }
    return validClipMessagePatterns.some(pattern => pattern.test(trimmedMessage));
}

function canSendMessage(channelName) {
    const lastMessageTime = channelMessageTimestamps.get(channelName);
    if (!lastMessageTime) return true;
    const oneHour = 60 * 60 * 1000;
    return (Date.now() - lastMessageTime) > oneHour;
}

function updateLastMessageTime(channelName) {
    channelMessageTimestamps.set(channelName, Date.now());
}

client.on("PRIVMSG", (msg) => {
    if (isValidClipMessage(msg.messageText) &&
        !msg.messageText.includes('http://') && !msg.messageText.includes('https://')) {
        if (msg.displayName === 'Nightbot' || msg.displayName === 'StreamElements') {
            return; // Ignore messages from Nightbot and StreamElements
        }
        if (canSendMessage(msg.channelName)) {
            console.log(`[#${msg.channelName}] ${msg.displayName}: ${msg.messageText}`);
            // Send the message to the Python endpoint
            axios.post('http://localhost:5000/clip', {
                channel: msg.channelName,
                message: msg.messageText
            }).then(response => {
                console.log(`Message sent to Python server: ${response.status}`);
                updateLastMessageTime(msg.channelName);
            }).catch(error => {
                console.error(`Error sending message to Python server: ${error}`);
            });
        } else {
            console.log(`Message not sent due to rate limit for channel: ${msg.channelName}`);
        }
    }
});
