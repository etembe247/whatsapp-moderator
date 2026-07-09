const { Client, LocalAuth } = require('whatsapp-web.js');
const axios = require('axios');
const FormData = require('form-data');
const readline = require('readline'); // Built-in Node library to ask for your phone number

// SETUP CONFIGURATION
const SIGHTENGINE_USER_ID = 'YOUR_SIGHTENGINE_USER_ID'; 
const SIGHTENGINE_SECRET = 'YOUR_SIGHTENGINE_SECRET';

// YOUR CUSTOM HIGH-PRIORITY BANNED WORDS
const CUSTOM_BANNED_WORDS = [
    'mad', 'stupid', 'crazy', 'idiot', 'bastered', 'bastard', 
    'kill', 'die', 'fuck', 'sex', 'bitch', 'asshole', 'dick', 'pussy',
    'mama', 'kpai', 'opueh', 'toto', 'short','mumu', 'silly', 'fool', 'dumb', 'loser', 'jerk', 'moron',``
];

const BANNED_WORDS_SET = new Set();

// STEALTH & ANTI-BAN TIMINGS
const MIN_DELAY = 1500; 
const MAX_DELAY = 3500; 
const RATE_LIMIT_COOLDOWN = 4000; 
let lastActionTime = 0;

// Set up readline interface to capture phone number safely via console
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Initialize Client using Windows built-in Microsoft Edge to bypass internet download errors
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled', 
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
    }
});

// Helper function to load massive dictionaries
async function loadMassiveWordDatabase() {
    console.log('🔄 Loading 18+ adult database into memory...');
    CUSTOM_BANNED_WORDS.forEach(word => BANNED_WORDS_SET.add(word.toLowerCase()));

    try {
        const sources = [
            'https://githubusercontent.com',
            'https://githubusercontent.com'
        ];

        for (const url of sources) {
            const response = await axios.get(url);
            const words = response.data.split(/\r?\n/);
            words.forEach(word => {
                const cleanWord = word.trim().toLowerCase();
                if (cleanWord.length > 1) BANNED_WORDS_SET.add(cleanWord);
            });
        }
        console.log(`✅ Database loaded successfully! Tracking ${BANNED_WORDS_SET.size} active words.`);
    } catch (error) {
        console.error('⚠️ Offline: Running on your custom high-priority word list only.');
    }
}

const humanDelay = (ms) => new Promise(res => setTimeout(res, ms));

// TRIGGER TEXT CODE PAIRING LOGIC INSTEAD OF PRINTING QR
client.on('qr', async (qr) => {
    // Stop the QR code from displaying and request phone authentication instead
    console.log('\n📱 WhatsApp is requesting authentication.');
    
    // Prompt the user in the terminal
    const phoneNumber = await question('👉 Enter the bot\'s phone number (with country code, e.g., 2348012345678): ');
    
    try {
        console.log('🔄 Requesting an 8-character pairing code from WhatsApp servers...');
        const pairingCode = await client.requestPairingCode(phoneNumber);
        
        console.log('\n=============================================');
        console.log(`🔑 YOUR WHATSAPP PAIRING CODE IS: ${pairingCode}`);
        console.log('=============================================\n');
        console.log('Follow these instructions on your phone right now:');
        console.log('1. Open WhatsApp -> Settings -> Linked Devices.');
        console.log('2. Tap "Link a Device".');
        console.log('3. At the bottom of the camera screen, tap "Link with phone number instead".');
        console.log(`4. Enter the code displayed above: ${pairingCode}\n`);
    } catch (err) {
        console.error('❌ Failed to retrieve pairing code from WhatsApp:', err.message);
    }
});

client.on('ready', () => {
    console.log('\n🤖 SUCCESS: Stealth Moderator Bot is fully connected and active!\n');
    rl.close();
});

// Primary group scanning listener
client.on('message_create', async (msg) => {
    if (!msg.from.endsWith('@g.us')) return; 
    if (msg.fromMe) return;                  

    try {
        const chat = await msg.getChat();
        const botUser = chat.participants.find(p => p.id._serialized === client.info.wid._serialized);
        if (!botUser || !botUser.isAdmin) return;

        let shouldDelete = false;
        let reason = '';

        // 1. FAST ULTRA-SCALABLE TEXT FILTER
        if (msg.body) {
            const wordsInMessage = msg.body.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()??"']/g,"").split(/\s+/);
            for (const word of wordsInMessage) {
                if (BANNED_WORDS_SET.has(word)) {
                    shouldDelete = true;
                    reason = `Offensive Word ("${word}")`;
                    break;
                }
            }
        }

        // 2. SILENT ANTI-LINK FILTER
        const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/ig;
        if (!shouldDelete && linkRegex.test(msg.body)) {
            shouldDelete = true;
            reason = 'Link Sharing';
        }

        // 3. SILENT STATUS TAG & MENTION FILTER
        if (!shouldDelete && (msg.isStatus || msg.mentionedIds.includes(msg.from) || msg.body.includes('@g.us'))) {
            shouldDelete = true;
            reason = 'Mass Mention/Status Tag';
        }

        // 4. SILENT IMAGE/VIDEO NUDITY FILTER
        if (!shouldDelete && msg.hasMedia && (msg.type === 'image' || msg.type === 'video')) {
            const media = await msg.downloadMedia();
            if (media && media.data) {
                const imageBuffer = Buffer.from(media.data, 'base64');
                const isNude = await checkNudity(imageBuffer, media.mimetype);
                if (isNude) {
                    shouldDelete = true;
                    reason = 'NSFW Media';
                }
            }
        }

        // EXECUTING STEALTH DELETION WITH HUMAN PAUSE RATIOS
        if (shouldDelete) {
            const now = Date.now();
            if (now - lastActionTime < RATE_LIMIT_COOLDOWN) {
                await humanDelay(RATE_LIMIT_COOLDOWN);
            }

            const randomDelay = Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;
            console.log(`[TARGET DETECTED] Found ${reason}. Executing silent deletion in ${randomDelay}ms...`);
            
            await humanDelay(randomDelay);
            await msg.delete(true); 
            
            lastActionTime = Date.now();
            console.log(`[DELETED] Successfully wiped violation.`);
        }

    } catch (error) {
        console.error('Error during message moderation evaluation:', error.message);
    }
});

// SIGHTENGINE CORE INTEGRATION
async function checkNudity(buffer, mimeType) {
    try {
        const form = new FormData();
        const extension = mimeType.split('/') || 'jpg';
        
        form.append('media', buffer, { filename: `media.${extension}`, contentType: mimeType });
        form.append('models', 'nudity-2.1');
        form.append('api_user', SIGHTENGINE_USER_ID);
        form.append('api_secret', SIGHTENGINE_SECRET);

        const response = await axios.post('https://sightengine.com', form, {
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        if (response.data && response.data.status === 'success') {
            const nudity = response.data.nudity;
            if (nudity.sexual_activity > 0.5 || nudity.sexual_display > 0.5 || nudity.erotica > 0.5) {
                return true;
            }
        }
        return false;
    } catch (apiError) {
        console.error('Sightengine API moderation failure:', apiError.message);
        return false; 
    }
}

// Load database first, then launch bot connection
loadMassiveWordDatabase().then(() => {
    client.initialize();
});
