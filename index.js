// index.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const logger = require('./logger');
require('./database'); // Garante conexão com banco
const { handleCommand } = require('./commandHandler');

logger.info('Iniciando o bot...');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: '/usr/bin/chromium',
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
    ]
  }
});

// QR Code
client.on('qr', qr => {
  logger.info('QR Code recebido, escaneie com seu celular!');
  const qrcode = require('qrcode-terminal');
  qrcode.generate(qr, { small: true });
});

// Bot pronto
client.on('ready', () => {
  logger.info('✅ Bot conectado e pronto para receber comandos!');
});

// Desconexão
client.on('disconnected', (reason) => {
  logger.warn(`Bot desconectado: ${reason}`);
});

// Mensagens
client.on('message_create', (message) => {
  handleCommand(client, message);
});

// Inicializa
client.initialize();
