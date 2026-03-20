// index.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const logger = require('./logger');
require('./database');
const { handleCommand } = require('./commandHandler');
const qrcode = require('qrcode-terminal');

logger.info('🚀 Iniciando o bot...');

const client = new Client({
    authStrategy: new LocalAuth(),
    takeoverOnConflict: true,
    takeoverTimeoutMs: 0,
    puppeteer: {
    headless: true,
    executablePath: '/usr/bin/chromium-browser', // 👈 MUITO IMPORTANTE
    dumpio: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
    ],
}
});


// 📱 QR CODE
client.on('qr', (qr) => {
    logger.info('📱 QR Code recebido, escaneie com seu celular!');
    qrcode.generate(qr, { small: true });
});


// 🔐 AUTENTICAÇÃO
client.on('authenticated', () => {
    logger.info('🔐 Autenticado com sucesso!');
});


// 📶 LOADING DO WHATSAPP
client.on('loading_screen', (percent, message) => {
    logger.info(`📶 ${percent}% - ${message}`);
});


// 🔄 MUDANÇA DE ESTADO
client.on('change_state', (state) => {
    logger.info(`🔄 Estado mudou: ${state}`);
});


// ✅ PRONTO
client.on('ready', async () => {
    logger.info('✅ Bot conectado e pronto!');

    try {
        // espera extra (resolve travamento comum)
        await new Promise(resolve => setTimeout(resolve, 5000));

        const info = client.info;
        logger.info(`📱 Número conectado: ${info?.wid?.user}`);
    } catch (err) {
        logger.error('Erro ao obter info:', err);
    }
});


// ⚠️ DESCONECTADO
client.on('disconnected', (reason) => {
    logger.warn(`⚠️ Bot desconectado: ${reason}`);

    logger.info('🔄 Tentando reconectar...');
    setTimeout(() => {
        client.initialize();
    }, 5000);
});


// 💬 MENSAGENS
client.on('message', async (message) => {
    try {
        await handleCommand(client, message);
    } catch (err) {
        logger.error('Erro ao processar mensagem:', err);
    }
});


// ❌ ERROS GLOBAIS
process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
});


// 🚀 START
client.initialize();