const db = require('./database');

async function handlePrivateMessage(client, message) {

    const chat = await message.getChat();

    // Se for grupo não faz nada
    if (chat.isGroup) return;

    const telefone = message.from;
    const texto = message.body.trim();

    console.log("Mensagem privada:");
    console.log(telefone);
    console.log(texto);

    await message.reply(
`👋 Olá!

Este é o atendimento do Racha.

Digite:

menu`
    );

}

module.exports = {
    handlePrivateMessage
};