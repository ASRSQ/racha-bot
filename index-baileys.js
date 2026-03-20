const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const P = require('pino');
const qrcode = require('qrcode-terminal');
const { handleCommand } = require('./commandHandler');
require('./database');

console.log("🚀 Iniciando Baileys...");

async function startBot() {

    console.log("📂 Carregando estado de autenticação...");
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const { version } = await fetchLatestBaileysVersion();

    console.log("🔄 Criando socket...");

    const sock = makeWASocket({
        version,
        logger: P({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false,

        // 🔥 FINGERPRINT CORRIGIDO
        browser: ['Ubuntu', 'Chrome', '20.0.04'],

        // 🔥 evita problemas de sync
        syncFullHistory: false,
        markOnlineOnConnect: true
    });

    console.log("✅ Socket criado.");

    sock.ev.on('connection.update', (update) => {

        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log("📲 Escaneie o QR abaixo:");
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'connecting') {
            console.log("🔄 Conectando...");
        }

        if (connection === 'open') {
            console.log("✅ BOT CONECTADO COM SUCESSO!");
        }

        if (connection === 'close') {
            console.log("❌ Conexão fechada!");

            const statusCode = lastDisconnect?.error?.output?.statusCode;

            console.log("Código:", statusCode);

            const shouldReconnect =
                statusCode !== DisconnectReason.loggedOut;

            if (shouldReconnect) {
                console.log("♻️ Reconectando em 5s...");
                setTimeout(() => startBot(), 5000);
            } else {
                console.log("🔐 Sessão inválida. Apague a pasta auth_info.");
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {

        const msg = messages[0];
        if (!msg.message) return;
        if (msg.key.fromMe) return;

        const messageText =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text;

        if (!messageText) return;

        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || msg.key.remoteJid;

        console.log(`📩 ${senderId}: ${messageText}`);

        const fakeMessage = {
            body: messageText,
            from: chatId,
            author: senderId,
            reply: async (text) => {
                await sock.sendMessage(chatId, { text });
            },
            getChat: async () => ({
                isGroup: chatId.endsWith('@g.us'),
                sendMessage: async (text, options = {}) => {
                    await sock.sendMessage(chatId, { text }, options);
                }
            }),
            _data: {
                notifyName: msg.pushName || "Jogador"
            }
        };

        try {
            await handleCommand(sock, fakeMessage);
        } catch (err) {
            console.error("💥 Erro:", err);
        }

    });
}

startBot();