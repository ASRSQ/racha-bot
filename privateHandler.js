async function handlePrivateMessage(sock, message) {

    const texto = message.body.trim().toLowerCase();

    if (texto === "menu") {

        return message.reply(`👋 Olá!

Bem-vindo ao Racha!

1️⃣ Entrar no racha

2️⃣ Minha inscrição

Digite o número da opção.`);

    }

    if (texto === "1") {

        return message.reply("Informe seu nome completo:");

    }

    if (texto === "2") {

        return message.reply("Sua inscrição ainda não foi encontrada.");

    }

    return message.reply("Digite *menu*.");

}

module.exports = {
    handlePrivateMessage
};