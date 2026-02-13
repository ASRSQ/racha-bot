const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const qrcode = require('qrcode-terminal')
const { handleCommand } = require('./commandHandler')
require('./database')

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')

    const sock = makeWASocket({
        logger: P({ level: 'silent' }),
        auth: state
    })

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr) {
            console.log('📲 Escaneie o QR Code:')
            qrcode.generate(qr, { small: true })
        }

        if (connection === 'close') {
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            if (shouldReconnect) startBot()
        } else if (connection === 'open') {
            console.log('✅ Bot conectado!')
        }
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message) return
        if (msg.key.fromMe) return

        const messageText =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text

        if (!messageText) return

        const chatId = msg.key.remoteJid
        const senderId = msg.key.participant || msg.key.remoteJid

        // 🔥 ADAPTADOR COMPATÍVEL
        const fakeMessage = {
            body: messageText,
            from: chatId,
            author: senderId,
            reply: async (text) => {
                await sock.sendMessage(chatId, { text })
            },
            getChat: async () => ({
                isGroup: chatId.endsWith('@g.us'),
                sendMessage: async (text, options = {}) => {
                    await sock.sendMessage(chatId, { text }, options)
                }
            }),
            _data: {
                notifyName: msg.pushName
            }
        }

        await handleCommand(sock, fakeMessage)
    })
}

startBot()
