const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
} = require('@whiskeysockets/baileys');

const P = require('pino');
const qrcode = require('qrcode-terminal');
const { handleCommand } = require('./commandHandler');
require('./database');

console.log("🚀 Iniciando Baileys...");

async function startBot() {

    console.log("📂 Carregando estado de autenticação...");

    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    console.log("🔄 Criando socket...");

const sock = makeWASocket({
    logger: P({ level: 'debug' }),
    auth: state,
    printQRInTerminal: false,
    browser: ['Windows', 'Chrome', '120.0.0.0']
});

    console.log("✅ Socket criado.");

    // ===============================
    // EVENTO DE CONEXÃO
    // ===============================
    sock.ev.on('connection.update', (update) => {

        console.log("📡 connection.update recebido:");
        console.log(JSON.stringify(update, null, 2));

        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log("📲 QR RECEBIDO!");
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

            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

            console.log("Reconectar?", shouldReconnect);

            if (shouldReconnect) {
                console.log("♻️ Tentando reconectar...");
                startBot();
            } else {
                console.log("🔐 Sessão encerrada. Apague a pasta auth_info para gerar novo QR.");
            }
        }
    });

    // ===============================
    // SALVAR CREDENCIAIS
    // ===============================
    sock.ev.on('creds.update', saveCreds);

    // ===============================
    // RECEBER MENSAGENS
    // ===============================
    sock.ev.on('messages.upsert', async ({ messages }) => {

        console.log("📩 Evento messages.upsert recebido");

        const msg = messages[0];
        if (!msg.message) return;
        if (msg.key.fromMe) return;

        const messageText =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text;

        if (!messageText) return;

        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || msg.key.remoteJid;

        console.log("Mensagem:", messageText);
        console.log("Chat:", chatId);
        console.log("Sender:", senderId);

        // ===============================
        // ADAPTADOR COMPATÍVEL
        // ===============================
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
            console.error("💥 Erro no handleCommand:", err);
        }

    });
}

startBot();
