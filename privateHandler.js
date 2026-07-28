const db = require('./database');

async function handlePrivateMessage(sock, message) {

    const telefone = message.from;
    const texto = message.body.trim();

    // ==========================
    // CONFIGURAÇÃO DA PARTIDA
    // ==========================

    const partida = await db.getPartida();

    if (!partida.permite_inscricao_privado) {

        return message.reply(`⚽ As inscrições estão fechadas no momento.

Aguarde a abertura da próxima partida.`);

    }

    // ==========================
    // BUSCA INSCRIÇÃO
    // ==========================

    let inscricao = await db.getInscricao(telefone);

    // Primeira conversa
    if (!inscricao) {

        await db.criarInscricao(telefone);

        await db.atualizarEstado(
            telefone,
            "AGUARDANDO_NOME"
        );

        return message.reply(`👋 Bem-vindo ao Bot do Racha!

Vamos fazer sua inscrição.

Qual é o seu nome?`);

    }

    switch (inscricao.estado) {

        // ==========================
        // NOME
        // ==========================

        case "AGUARDANDO_NOME":

    if (texto.length < 3) {

        return message.reply(
            "Informe um nome válido."
        );

    }

    // Verifica se já existe um jogador com esse nome
    db.get(
        'SELECT 1 FROM jogadores WHERE nome_jogador = ?',
        [texto],
        async (err, row) => {

            if (err) {
                return message.reply("Erro ao consultar o banco de dados.");
            }

            if (row) {

                return message.reply(`⚠️ Já existe um jogador inscrito com esse nome.

Se essa inscrição for sua, não é necessário realizar um novo cadastro.

Caso seja outra pessoa com o mesmo nome, tente se inscrever utilizando um nome diferente, como:

• João Silva
• João S.
• João (Centro)

Depois envie o novo nome.`);

            }

            await db.atualizarNome(
                telefone,
                texto
            );

            await db.atualizarEstado(
                telefone,
                "AGUARDANDO_TIPO"
            );

            return message.reply(`Perfeito, *${texto}*!

Agora escolha sua posição:

1️⃣ Jogador de Linha

2️⃣ Goleiro

Você também pode responder:

• linha
• goleiro`);

        });

    return;

            if (texto.length < 3) {

                return message.reply(
                    "Informe um nome válido."
                );

            }

            await db.atualizarNome(
                telefone,
                texto
            );

            await db.atualizarEstado(
                telefone,
                "AGUARDANDO_TIPO"
            );

            return message.reply(`Perfeito, *${texto}*!

Agora escolha sua posição:

1️⃣ Jogador de Linha

2️⃣ Goleiro

Você também pode responder:

• linha
• goleiro`);

        // ==========================
        // POSIÇÃO
        // ==========================

        case "AGUARDANDO_TIPO": {

            const resposta = texto.toLowerCase();

            const linha =
                resposta === "1" ||
                resposta.includes("linha");

            const goleiro =
                resposta === "2" ||
                resposta.includes("goleiro") ||
                resposta.includes("gol");

            // ======================
            // GOLEIRO
            // ======================

            if (goleiro) {

                inscricao = await db.getInscricao(
                    telefone
                );

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

                    return message.reply(`✅ Inscrição concluída!

🥅 Você foi cadastrado como GOLEIRO.

Boa partida!`);

                } catch (err) {

                    return message.reply(
                        "Esse nome já está na lista."
                    );

                }

            }

            // ======================
            // LINHA
            // ======================

            if (linha) {

                await db.atualizarPosicao(
                    telefone,
                    "linha"
                );

                if (partida.pagamento_obrigatorio) {

                    await db.atualizarEstado(
                        telefone,
                        "AGUARDANDO_PAGAMENTO"
                    );

                    return message.reply(`💰 Perfeito!

Agora vou gerar seu PIX.

Aguarde alguns segundos...`);

                }

                // ======================
                // SEM PAGAMENTO
                // ======================

                inscricao = await db.getInscricao(
                    telefone
                );

                try {

                    await db.adicionarJogadorPrivado(
                        inscricao.nome,
                        telefone,
                        "linha",
                        0
                    );

                    await db.atualizarEstado(
                        telefone,
                        "FINALIZADO"
                    );

                    return message.reply(`✅ Inscrição concluída!

Você já está na lista.

Boa partida! ⚽`);

                } catch (err) {

                    return message.reply(
                        "Esse nome já está na lista."
                    );

                }

            }

            return message.reply(`Resposta inválida.

Digite:

1️⃣ Linha

2️⃣ Goleiro`);

        }

        // ==========================
        // PAGAMENTO
        // ==========================

        case "AGUARDANDO_PAGAMENTO":

            return message.reply(`💰 Seu PIX ainda está aguardando pagamento.

Assim que o pagamento for aprovado você será colocado automaticamente na lista.`);

        // ==========================
        // FINALIZADO
        // ==========================

        case "FINALIZADO":

            return message.reply(`✅ Sua inscrição já foi concluída.

Nos vemos no racha! ⚽`);

        // ==========================
        // ESTADO DESCONHECIDO
        // ==========================

        default:

            await db.atualizarEstado(
                telefone,
                "AGUARDANDO_NOME"
            );

            return message.reply(`Vamos começar novamente.

Qual é o seu nome?`);

    }

}

module.exports = {
    handlePrivateMessage
};