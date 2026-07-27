// botFunctions.js
const db = require('./database');
const logger = require('./logger');
const rachaService = require('./rachaService');
function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve(this);
        });
    });
}
/**
 * Fila simples (concurrency = 1) sem dependências externas.
 * Executa as tarefas em série; erros são logados e a fila continua.
 */
class SimpleQueue {
  constructor() {
    this.chain = Promise.resolve();
  }
  add(taskFn) {
    this.chain = this.chain
      .then(() => taskFn())
      .catch(err => {
        logger.error(`Erro em tarefa da fila: ${err && err.stack ? err.stack : err}`);
      });
    return this.chain;
  }
}

const queue = new SimpleQueue();

async function addToQueue(taskFn) {
  return queue.add(taskFn);
}

/* =========================================================================
   ---------------------- FUNÇÕES INTERNAS (lógicas) -----------------------
   ========================================================================= */

/**
 * Adiciona um jogador como linha/goleiro ou manda para a reserva se cheio.
 * Se porOutro=true, ajusta a mensagem informando quem adicionou.
 */

async function adicionarJogadorInterno(
    nome,
    quemAdicionouId,
    tipoDesejado,
    chat,
    message,
    senderName,
    porOutro = false
) {

    try {

        const limits = await dbGet(
            'SELECT max_linha, max_goleiros FROM partida_info WHERE id = 1'
        );

        if (!limits) {
            return message.reply(
                "Erro ao consultar as vagas."
            );
        }

        const tipoTabela =
            tipoDesejado === "linha"
                ? "linha"
                : "goleiro";

        const limite =
            tipoDesejado === "linha"
                ? limits.max_linha
                : limits.max_goleiros;

        const row = await dbGet(
            "SELECT COUNT(*) AS count FROM jogadores WHERE tipo_jogador=?",
            [tipoTabela]
        );

        let tipoFinal = tipoDesejado;

        let resposta;

        if (row.count >= limite) {

            tipoFinal = "reserva";

            resposta =
                `⚠️ A lista de ${tipoTabela}s está cheia.\n\n*${nome}* entrou na reserva.`;

        } else {

            resposta =
                `✅ *${nome}* entrou na lista de ${tipoTabela}s.`;

        }

        if (porOutro) {

            resposta =
                `${senderName} adicionou *${nome}* na lista de ${tipoFinal}.`;

        }

        await dbRun(
            `INSERT INTO jogadores
            (nome_jogador,adicionado_por,tipo_jogador)
            VALUES(?,?,?)`,
            [
                nome,
                quemAdicionouId,
                tipoFinal
            ]
        );

        await message.reply(resposta);

        await enviarListaInterno(chat);

    } catch (err) {

        logger.error(err);

        await message.reply(
            "Este nome já existe ou ocorreu um erro."
        );

    }

}

/**
 * Promove o primeiro reserva para a lista principal quando houver vaga
 * ou notifica o próximo da fila se ainda não houver.
 */
async function promoverReservaInterno(chat) {

    logger.info("Verificando se há reservas para promover...");

    db.get(
        'SELECT * FROM jogadores WHERE tipo_jogador = "reserva" ORDER BY id ASC LIMIT 1',
        [],
        (err, reserva) => {

            if (err) {
                logger.error(err.message);
                return;
            }

            if (!reserva) {
                logger.info("Nenhum jogador na reserva.");
                return enviarListaInterno(chat);
            }

            db.get(
                'SELECT max_linha FROM partida_info WHERE id = 1',
                [],
                (err2, limits) => {

                    if (err2 || !limits) {
                        logger.error(err2?.message || "Limites não encontrados");
                        return;
                    }

                    db.get(
                        'SELECT COUNT(*) AS count FROM jogadores WHERE tipo_jogador="linha"',
                        [],
                        (err3, rowLinha) => {

                            if (err3) {
                                logger.error(err3.message);
                                return;
                            }

                            // Existe vaga
                            if (rowLinha.count < limits.max_linha) {

                                db.run(
                                    'UPDATE jogadores SET tipo_jogador="linha" WHERE id=?',
                                    [reserva.id],
                                    async (err4) => {

                                        if (err4) {
                                            logger.error(err4.message);
                                            return;
                                        }

                                        logger.info(
                                            `${reserva.nome_jogador} promovido.`
                                        );

                                        await chat.sendMessage(
                                            `🎉 *${reserva.nome_jogador}* foi promovido da lista de reserva para a lista principal!`
                                        );

                                        await enviarListaInterno(chat);

                                    }
                                );

                            } else {

                                logger.info(
                                    `Próximo da fila: ${reserva.nome_jogador}`
                                );

                                chat.sendMessage(
                                    `🔔 O próximo da fila é *${reserva.nome_jogador}*.`
                                );

                                enviarListaInterno(chat);

                            }

                        }
                    );

                }
            );

        }
    );

}

/**
 * Monta e envia a lista formatada de linha/goleiros/reservas.
 */
async function enviarListaInterno(chat) {

    try {

        const texto = await rachaService.gerarListaTexto();

        await chat.sendMessage(texto);

    } catch (err) {

        logger.error(err);

        await chat.sendMessage(
            "Erro ao gerar a lista."
        );

    }

}
/* =========================================================================
   ------------------------ FUNÇÕES PÚBLICAS (API) -------------------------
   ========================================================================= */

function adicionarJogador(...args) {
  return addToQueue(() => Promise.resolve(adicionarJogadorInterno(...args)));
}
function promoverReserva(...args) {
  return addToQueue(() => Promise.resolve(promoverReservaInterno(...args)));
}
function enviarLista(...args) {
  return addToQueue(() => Promise.resolve(enviarListaInterno(...args)));
}

module.exports = {
  adicionarJogador,
  promoverReserva,
  enviarLista,
};
