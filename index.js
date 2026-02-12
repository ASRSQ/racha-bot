// index.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const logger = require('./logger');
require('./database'); // Importa para garantir que o banco de dados conecte
const { handleCommand } = require('./commandHandler');

logger.info('Iniciando o bot...');
// index.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const logger = require('./logger');
require('./database'); // Importa para garantir que o banco de dados conecte
const { handleCommand } = require('./commandHandler');

logger.info('Iniciando o bot...');
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    browserWSEndpoint: process.env.PUPPETEER_BROWSER_WS_ENDPOINT,
  }
});




client.on('qr', qr => {
    logger.info('QR Code recebido, escaneie com seu celular!');
    const qrcode = require('qrcode-terminal');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    logger.info('✅ Bot conectado e pronto para receber comandos!');
});

client.on('disconnected', (reason) => {
    logger.warn(`Bot desconectado: ${reason}`);
});

// Delega todo o processamento de mensagens para o commandHandler
client.on('message_create', (message) => {
    handleCommand(client, message);
});

client.initialize();




client.on('qr', qr => {
    logger.info('QR Code recebido, escaneie com seu celular!');
    const qrcode = require('qrcode-terminal');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    logger.info('✅ Bot conectado e pronto para receber comandos!');
});

client.on('disconnected', (reason) => {
    logger.warn(`Bot desconectado: ${reason}`);
});

// Delega todo o processamento de mensagens para o commandHandler
client.on('message_create', (message) => {
    handleCommand(client, message);
});

client.initialize();