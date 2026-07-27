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

            if (texto.toLowerCase() !== "menu") {
                return message.reply("Digite *menu* para iniciar.");
            }

            await message.reply(`👋 Bem-vindo ao Racha!

Digite *1* para iniciar sua inscrição.`);

            await db.atualizarEstado(telefone, "AGUARDANDO_OPCAO");
            break;

        case "AGUARDANDO_OPCAO":

            if (texto !== "1") {
                return message.reply("Digite apenas *1*.");
            }

            await message.reply("Informe seu nome:");

            await db.atualizarEstado(telefone, "AGUARDANDO_NOME");
            break;

        case "AGUARDANDO_NOME":

            await db.atualizarNome(telefone, texto);

            await message.reply(`Escolha uma opção:

1️⃣ Jogador de Linha

2️⃣ Goleiro`);

            await db.atualizarEstado(telefone, "AGUARDANDO_TIPO");
            break;

        case "AGUARDANDO_TIPO":

            // ==========================
            // GOLEIRO
            // ==========================
            if (texto === "2") {

                inscricao = await db.getInscricao(telefone);

                try {

                    await db.adicionarJogadorPrivado(
                        inscricao.nome,
                        telefone,
                        "goleiro",
                        1
                    );

                    await db.atualizarEstado(
                        telefone,
                        "FINALIZADO"
                    );

                    await message.reply(`✅ Inscrição concluída!

🥅 Você foi cadastrado como GOLEIRO.

Não é necessário realizar pagamento.

Boa partida!`);

                } catch (err) {

                    return message.reply("Esse nome já está na lista.");

                }

                return;
            }

            // ==========================
            // JOGADOR DE LINHA
            // ==========================
            if (texto === "1") {

                await db.atualizarPosicao(
                    telefone,
                    "linha"
                );

                await db.atualizarEstado(
                    telefone,
                    "AGUARDANDO_PAGAMENTO"
                );

                await message.reply(`💰 Você foi cadastrado como jogador de linha.

Agora vou gerar seu PIX.

Aguarde...`);

                return;
            }

            await message.reply("Digite apenas 1 ou 2.");
            break;

        case "AGUARDANDO_PAGAMENTO":

            await message.reply(`Seu PIX ainda não foi pago.

Assim que o pagamento for aprovado você entrará automaticamente na lista.`);

            break;

        case "FINALIZADO":

            await message.reply("Sua inscrição já foi concluída.");

            break;

        default:

            await db.atualizarEstado(telefone, "MENU");

            await message.reply("Digite *menu*.");

    }

}

module.exports = {
    handlePrivateMessage
};