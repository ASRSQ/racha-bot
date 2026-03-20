// index.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const logger = require('./logger');
require('./database'); // garante conexão com banco
const { handleCommand } = require('./commandHandler');
const qrcode = require('qrcode-terminal');

logger.info('🚀 Iniciando o bot...');

const client = new Client({
    authStrategy: new LocalAuth(),
    takeoverOnConflict: true,
    takeoverTimeoutMs: 0,
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ],
        timeout: 60000
    }
});


// 🔐 QR CODE
client.on('qr', (qr) => {
    logger.info('📱 QR Code recebido, escaneie com seu celular!');
    qrcode.generate(qr, { small: true });
});


// 🔐 AUTENTICADO
client.on('authenticated', () => {
    logger.info('🔐 Autenticado com sucesso!');
});


// 📶 CARREGAMENTO
client.on('loading_screen', (percent, message) => {
    logger.info(`📶 Carregando WhatsApp: ${percent}% - ${message}`);
});


// ✅ PRONTO
client.on('ready', async () => {
    logger.info('✅ Bot conectado e pronto!');

    try {
        const info = client.info;
        logger.info(`📱 Número conectado: ${info.wid.user}`);
    } catch (err) {
        logger.error('Erro ao pegar info do cliente:', err);
    }
});


// ⚠️ DESCONECTADO
client.on('disconnected', (reason) => {
    logger.warn(`⚠️ Bot desconectado: ${reason}`);
    
    // reconectar automaticamente
    logger.info('🔄 Tentando reconectar...');
    client.initialize();
});


// 💬 MENSAGENS
client.on('message', async (message) => {
    try {
        await handleCommand(client, message);
    } catch (err) {
        logger.error('Erro ao processar mensagem:', err);
    }
});


// ❌ ERROS GERAIS
process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
});


// 🚀 INICIALIZAÇÃO
client.initialize();