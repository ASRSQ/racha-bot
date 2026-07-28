// commandHandler.js
const db = require('./database');
const logger = require('./logger');
const config = require('./config');
const { adicionarJogador, promoverReserva, enviarLista } = require('./botFunctions');


async function handleCommand(client, message) {
    const chat = await message.getChat();
    if (!chat.isGroup) return;

    const body = message.body.trim();
    const command = body.toLowerCase();
    const partida = await db.getPartida();

    // ==============================
    // CORREÇÃO DO ERRO DO WHATSAPP
    // ==============================
// ID do remetente (às vezes @lid, às vezes @c.us)
const senderId = message.author || message.from;

// Nome do remetente (SEM ERROS)
const senderName = message._data?.notifyName || message._data?.pushname || "Jogador";

// Normalizar (importante para comparar)
const normalizedSenderName = senderName.toLowerCase().trim();
const normalizedSenderId = (senderId || '').toLowerCase().trim();

// Verifica admin por nome OU ID
const isSenderAdmin =
    (config.ADMINS.ids || []).includes(normalizedSenderId) ||
    (config.ADMINS.names || []).includes(normalizedSenderName);

// Log apenas para depuração
console.log("DEBUG SENDER ID:", senderId);
console.log("DEBUG SENDER NAME:", senderName);
console.log("DEBUG isSenderAdmin:", isSenderAdmin);

logger.info("DEBUG SENDER ID: " + senderId);
    try {
        if (
    !partida.permite_inscricao_grupo &&
    (
        command.startsWith('!entrar') ||
        command.startsWith('!add')||  command.startsWith('!pix')
    )
) {

    return message.reply(
`⚽ As inscrições pelo grupo estão desativadas.

📲 Envie qualquer mensagem no privado do bot para iniciar sua inscrição.`
    );

}
        if (command.startsWith('!entrar')) {
            const tipoDesejado = command.includes('goleiro') ? 'goleiro' : 'linha';

            db.get('SELECT 1 FROM jogadores WHERE nome_jogador = ?', [senderName], (err, row) => {
                if (err) { logger.error(err.message); return message.reply("Erro ao consultar o banco de dados."); }
                if (row) return message.reply(`${senderName}, você já está na lista! 😉`);

                adicionarJogador(senderName, senderId, tipoDesejado, chat, message, senderName);
            });
        }

        else if (command === '!sair') {
            logger.info(`Usuário ${senderName} tentando sair da lista.`);

            db.get('SELECT tipo_jogador FROM jogadores WHERE nome_jogador = ?', [senderName], (err, row) => {
                if (err) { logger.error(err.message); return message.reply("Erro ao consultar o banco de dados."); }
                if (!row) return message.reply(`${senderName}, você não estava na lista.`);

                const eraVagaPrincipal = (row.tipo_jogador === 'linha' || row.tipo_jogador === 'goleiro');

                db.run('DELETE FROM jogadores WHERE nome_jogador = ?', [senderName], function(err) {
                    if (err) { logger.error(err.message); return message.reply("Erro ao tentar te remover da lista."); }

                    if (this.changes > 0) {
                        message.reply(`Ok, ${senderName}, você foi removido(a) da lista.`);
                        logger.info(`Usuário ${senderName} saiu da lista.`);

                        if (eraVagaPrincipal) promoverReserva(chat, client);
                        else enviarLista(chat);
                    }
                });
            });
        }

        else if (command.startsWith('!remover')) {
            const argumento = body.substring(9).trim();
            if (!argumento) return message.reply('Uso correto: `!remover <nome|número> [goleiro]`');

            const partes = argumento.split(' ');
            const indiceOuNome = partes[0];
            const isGoleiro = partes.length > 1 && partes[1].toLowerCase() === 'goleiro';

            const numeroRemover = parseInt(indiceOuNome, 10);

            if (!isNaN(numeroRemover) && numeroRemover > 0) {
                const tipo = isGoleiro ? 'goleiro' : 'linha';

                db.all('SELECT * FROM jogadores WHERE tipo_jogador = ? ORDER BY id', [tipo], (err, jogadores) => {
                    if (err) return message.reply("Erro ao consultar o banco de dados.");
                    if (numeroRemover > jogadores.length) {
                        const total = jogadores.length;
                        return message.reply(`Número inválido. Só existem ${total} ${tipo === 'goleiro' ? 'goleiros' : 'jogadores'} na lista.`);
                    }

                    const jogadorAlvo = jogadores[numeroRemover - 1];
                    const podeRemover = isSenderAdmin || jogadorAlvo.adicionado_por === senderId;

                    if (!podeRemover) return message.reply(`❌ Você não pode remover *${jogadorAlvo.nome_jogador}*.`);

                    const eraVagaPrincipal = jogadorAlvo.tipo_jogador !== 'reserva';

                    db.run('DELETE FROM jogadores WHERE id = ?', [jogadorAlvo.id], function (err) {
                        if (err) return message.reply("Erro ao remover o jogador.");

                        message.reply(`✅ *${jogadorAlvo.nome_jogador}* removido da lista por ${senderName}.`);

                        if (eraVagaPrincipal && tipo === 'linha') promoverReserva(chat, client);
                        else enviarLista(chat);
                    });
                });

            } else {
                db.get('SELECT * FROM jogadores WHERE nome_jogador LIKE ?', [`%${argumento}%`], (err, row) => {
                    if (err) return message.reply("Erro ao consultar o banco de dados.");
                    if (!row) return message.reply(`Jogador "${argumento}" não encontrado na lista.`);

                    const podeRemover = isSenderAdmin || row.adicionado_por === senderId;
                    if (!podeRemover) return message.reply(`❌ Você não pode remover *${row.nome_jogador}*.`);

                    const eraVagaPrincipal = row.tipo_jogador !== 'reserva';

                    db.run('DELETE FROM jogadores WHERE id = ?', [row.id], function(err) {
                        if (err) return message.reply("Erro ao remover o jogador.");

                        message.reply(`✅ *${row.nome_jogador}* removido da lista por ${senderName}.`);

                        if (eraVagaPrincipal && row.tipo_jogador === 'linha') promoverReserva(chat, client);
                        else enviarLista(chat);
                    });
                });
            }
        }

        else if (command.startsWith('!add')) {
            const args = body.split(' ').slice(1);
            if (args.length === 0) return message.reply('Uso: `!add <nome> [goleiro]`');

            let nomeJogadorAvulso, tipoJogadorAvulso = 'linha';

            if (args.length > 1 && args[args.length - 1].toLowerCase() === 'goleiro') {
                nomeJogadorAvulso = args.slice(0, -1).join(' ');
                tipoJogadorAvulso = 'goleiro';
            } else {
                nomeJogadorAvulso = args.join(' ');
            }

            if (!nomeJogadorAvulso) return message.reply('Nome inválido.');

            logger.info(`Usuário ${senderName} usando comando !add para '${nomeJogadorAvulso}' como '${tipoJogadorAvulso}'`);

            db.get('SELECT 1 FROM jogadores WHERE nome_jogador = ?', [nomeJogadorAvulso], (err, row) => {
                if (err) return message.reply("Erro ao consultar o banco de dados.");
                if (row) return message.reply(`${nomeJogadorAvulso} já está na lista!`);

                adicionarJogador(nomeJogadorAvulso, senderId, tipoJogadorAvulso, chat, message, senderName, true);
            });
        }

        else if (command === '!lista') {
            await enviarLista(chat);
        }

        else if (command === '!pix' || command === '!pagar') {
            const { PixBR } = await import('pixbrasil');

            logger.info(`Usuário ${senderName} pediu informações do PIX.`);

            db.get('SELECT valor FROM partida_info WHERE id = 1', [], async (err, row) => {
                if (err || !row) {
                    logger.error(`Erro ao buscar informações da partida: ${err ? err.message : 'Nenhuma informação encontrada'}`);
                    return message.reply("Erro ao buscar as informações do racha. Avise um admin.");
                }

                const infoMessage =
                    `*💸 Dados para Pagamento do Racha 💸*\n\n` +
                    `*Valor:* R$ ${row.valor}\n\n` +
                    `*Chave PIX (Celular):*\n\`${config.PIX_KEY}\`\n\n` +
                    `_A seguir, o código Pix Copia e Cola:_`;

                await chat.sendMessage(infoMessage);

                const valorFloat = parseFloat(row.valor.replace(',', '.'));

                const pixCode = PixBR({
                    key: config.PIX_KEY,
                    name: 'Alex de Sousa Ramos',
                    city: 'STA QUITERIA',
                    amount: valorFloat,
                    transactionId: 'RACHA'
                });

                await chat.sendMessage(pixCode);
            });
        }

        else if (command === '!ajuda' || command === '!comandos') {
            let helpMessage =
                `*🤖 Comandos do Bot do Racha 🤖*\n\n` +
                `*!entrar*\n_Para se inscrever na lista._\n\n` +
                `*!entrar goleiro*\n_Para se inscrever como goleiro._\n\n` +
                `*!add <nome> [goleiro]*\n_Adiciona um amigo à lista._\n\n` +
                `*!sair*\n_Remove o seu próprio nome da lista._\n\n` +
                `*!remover <nome>*\n_Remove um jogador que você adicionou._\n\n` +
                `*!pix* ou *!pagar*\n_Mostra os dados para o pagamento._\n\n` +
                `*!lista*\n_Mostra a lista atualizada._`;

            if (isSenderAdmin) {
                helpMessage +=
                    `\n\n*👑 Comandos para Administradores 👑*\n` +
                    `------------------------------------\n` +
                    `*!pagou <nome>*\n_Confirma o pagamento._\n\n` +
                    `*!remover <nome>*\n_Remove *qualquer* jogador._\n\n` +
                    `*!setvagas <linha> <goleiros>*\n_Define o nº de vagas._\n\n` +
                    `*!settitulo <texto>*\n_Altera o título._\n\n` +
                    `*!setdata <texto>*\n_Altera a data/hora._\n\n` +
                    `*!setvalor <valor>*\n_Altera o valor._\n\n` +
                    `*!limpar*\n_Zera a lista de jogadores._`;
            }

            await message.reply(helpMessage);
        }

       else if (
    [
        '!pagou',
        '!settitulo',
        '!setdata',
        '!limpar',
        '!setvagas',
        '!setvalor',
        '!inscricao'
    ].some(adminCmd => command.startsWith(adminCmd))
) {

            if (!isSenderAdmin)
                return message.reply('❌ Apenas administradores podem usar este comando.');
// ===============================
// !inscricao grupo
// !inscricao privado
// ===============================

if (command.startsWith('!inscricao')) {

    const modo = body.substring(11).trim().toLowerCase();

    if (!['grupo', 'privado'].includes(modo)) {

        return message.reply(
`Uso:

!inscricao grupo
!inscricao privado`
        );

    }

    await db.atualizarConfiguracao(
        "permite_inscricao_grupo",
        modo === "grupo" ? 1 : 0
    );

    return message.reply(

        modo === "grupo"

            ? "✅ Inscrições pelo grupo ativadas."

            : "✅ Inscrições agora serão realizadas apenas no privado."

    );

}
            if (command.startsWith('!setvalor')) {
                const novoValor = body.substring(10).trim();
                if (!novoValor) return message.reply('Uso: !setvalor <novo valor>');

                logger.info(`Admin ${senderName} alterando valor para '${novoValor}'`);

                db.run(`UPDATE partida_info SET valor = ? WHERE id = 1`, [novoValor], (err) => {
                    if (err) return message.reply("Erro ao atualizar o valor.");
                    message.reply(`💸 Valor atualizado: *R$ ${novoValor}*`);
                    enviarLista(chat);
                });
            }

            else if (command.startsWith('!pagou')) {
                const nome = body.substring(7).trim();
                if (!nome) return message.reply('Uso: !pagou <nome ou número>');

                const numero = parseInt(nome, 10);

                if (!isNaN(numero) && numero > 0) {
                    db.all('SELECT id, nome_jogador FROM jogadores WHERE tipo_jogador = "linha" ORDER BY id', [], (err, jogadores) => {
                        if (err) return message.reply("Erro ao consultar a lista.");

                        if (numero > jogadores.length)
                            return message.reply(`Número inválido. Existem apenas ${jogadores.length} jogadores.`);

                        const alvo = jogadores[numero - 1];

                        db.run('UPDATE jogadores SET status_pagamento = 1 WHERE id = ?', [alvo.id], function (err) {
                            if (err) return message.reply("Erro ao atualizar pagamento.");

                            if (this.changes > 0) {
                                message.reply(`Pagamento do Nº${numero} (*${alvo.nome_jogador}*) confirmado! ✅`);
                                enviarLista(chat);
                            }
                        });
                    });

                } else {
                    db.run('UPDATE jogadores SET status_pagamento = 1 WHERE nome_jogador LIKE ?', [`%${nome}%`], function (err) {
                        if (err) return message.reply("Erro ao atualizar pagamento.");

                        if (this.changes > 0) {
                            message.reply(`Pagamento de *${nome}* confirmado! ✅`);
                            enviarLista(chat);
                        } else {
                            message.reply(`Jogador "${nome}" não encontrado.`);
                        }
                    });
                }
            }

            else if (command.startsWith('!settitulo')) {
                const novoTitulo = body.substring(11).trim();
                if (!novoTitulo) return message.reply('Uso: !settitulo <título>');

                db.run(`UPDATE partida_info SET titulo = ? WHERE id = 1`, [novoTitulo], (err) => {
                    if (err) return message.reply("Erro ao atualizar título.");

                    message.reply(`📝 Novo título: *${novoTitulo}*`);
                    enviarLista(chat);
                });
            }

            else if (command.startsWith('!setdata')) {
                const novaData = body.substring(9).trim();
                if (!novaData) return message.reply('Uso: !setdata <data/hora>');

                db.run(`UPDATE partida_info SET data_hora = ? WHERE id = 1`, [novaData], (err) => {
                    if (err) return message.reply("Erro ao atualizar data.");

                    message.reply(`🗓️ Nova data: *${novaData}*`);
                    enviarLista(chat);
                });
            }

            else if (command === '!limpar') {
                db.run('DELETE FROM jogadores', [], (err) => {
                    if (err) return message.reply("Erro ao limpar a lista.");

                    message.reply('🧹 Lista zerada!');
                    enviarLista(chat);
                });
            }

            else if (command.startsWith('!setvagas')) {
                const args = body.split(' ').slice(1);
                if (args.length !== 2) return message.reply('Uso: !setvagas <linha> <goleiros>');

                const vagasLinha = parseInt(args[0], 10);
                const vagasGoleiro = parseInt(args[1], 10);

                if (isNaN(vagasLinha) || isNaN(vagasGoleiro))
                    return message.reply('Valores inválidos.');

                db.run('UPDATE partida_info SET max_linha = ?, max_goleiros = ? WHERE id = 1',
                    [vagasLinha, vagasGoleiro],
                    (err) => {
                        if (err) return message.reply("Erro ao atualizar vagas.");

                        message.reply(`Vagas definidas!\nLinha: ${vagasLinha}\nGoleiros: ${vagasGoleiro}`);
                        enviarLista(chat);
                    });
            }
        }

    } catch (e) {
        logger.error(`Erro fatal no processamento: ${e.stack || e.message}`);
        message.reply("Erro interno. Avise um admin!");
    }
}

module.exports = { handleCommand };
