const db = require('./database');

async function handlePrivateMessage(sock, message) {

    const telefone = message.from;
    const texto = message.body.trim();

    let inscricao = await db.getInscricao(telefone);

    if (!inscricao) {
        await db.criarInscricao(telefone);
        inscricao = await db.getInscricao(telefone);
    }

    switch (inscricao.estado) {

        case "MENU":

            if (texto.toLowerCase() === "menu") {

                await message.reply(`👋 Bem-vindo!

1️⃣ Entrar no racha

Digite 1 para continuar.`);

                await db.atualizarEstado(telefone, "AGUARDANDO_OPCAO");
            }

            break;

        case "AGUARDANDO_OPCAO":

            if (texto === "1") {

                await message.reply("Informe seu nome:");

                await db.atualizarEstado(telefone, "AGUARDANDO_NOME");
            }

            break;

        case "AGUARDANDO_NOME":

            await db.atualizarNome(telefone, texto);

            await message.reply("Agora informe sua posição:");

            await db.atualizarEstado(telefone, "AGUARDANDO_POSICAO");

            break;

        case "AGUARDANDO_POSICAO":

            await db.atualizarPosicao(telefone, texto);

            await message.reply(`✅ Cadastro concluído!

Nome: ${inscricao.nome || texto}
Posição: ${texto}

Em breve será gerado seu PIX.`);

            await db.atualizarEstado(telefone, "AGUARDANDO_PAGAMENTO");

            break;

        default:
            await message.reply("Digite *menu*.");
    }

}

module.exports = {
    handlePrivateMessage
};