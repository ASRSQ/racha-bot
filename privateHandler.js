const db = require('./database');

// Estas funções já existem no seu projeto
const {
    adicionarJogador,
    enviarLista
} = require('./botFunctions');

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

Digite 1 para iniciar sua inscrição.`);

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

            await message.reply(`Agora escolha:

1️⃣ Jogador de Linha

2️⃣ Goleiro`);

            await db.atualizarEstado(telefone, "AGUARDANDO_TIPO");

            break;

        case "AGUARDANDO_TIPO":

            if (texto === "2") {

                inscricao = await db.getInscricao(telefone);

                // adiciona direto
                await adicionarJogador(
                    inscricao.nome,
                    "goleiro",
                    telefone
                );

                await message.reply(`✅ Você foi inscrito como GOLEIRO.

Não é necessário realizar pagamento.

Nos vemos no racha! 🥅`);

                await enviarLista(sock);

                await db.atualizarEstado(telefone, "FINALIZADO");

                return;
            }

            if (texto === "1") {

                await db.atualizarPosicao(telefone, "linha");

                await message.reply(`💰 Você foi cadastrado como jogador de linha.

Agora vou gerar seu PIX.

Aguarde alguns segundos...`);

                await db.atualizarEstado(
                    telefone,
                    "AGUARDANDO_PAGAMENTO"
                );

                return;
            }

            await message.reply("Digite 1 ou 2.");

            break;

        case "AGUARDANDO_PAGAMENTO":

            await message.reply(`Seu PIX ainda está sendo aguardado.

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