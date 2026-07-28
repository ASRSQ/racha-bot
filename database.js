// database.js

const sqlite3 = require('sqlite3').verbose();
const logger = require('./logger');
const config = require('./config');

const db = new sqlite3.Database(
    './racha.db',
    sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
    (err) => {

        if (err) {
            return logger.error(`Erro ao abrir o banco: ${err.message}`);
        }

        logger.info('Conectado ao banco SQLite.');

        db.serialize(() => {

            // ============================
            // Jogadores
            // ============================

            db.run(`
                CREATE TABLE IF NOT EXISTS jogadores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome_jogador TEXT NOT NULL UNIQUE,
                    status_pagamento INTEGER DEFAULT 0,
                    tipo_jogador TEXT NOT NULL,
                    adicionado_por TEXT NOT NULL
                )
            `, (err) => {
                if (err)
                    logger.error(err.message);
                else
                    logger.info("Tabela jogadores pronta.");
            });

            // ============================
            // Informações da partida
            // ============================

            db.run(`
            CREATE TABLE IF NOT EXISTS partida_info (
    id INTEGER PRIMARY KEY CHECK (id = 1),

    titulo TEXT DEFAULT 'Racha dos Crias',

    data_hora TEXT DEFAULT 'A definir',

    valor TEXT DEFAULT '${config.DEFAULT_RACHA_VALUE}',

    max_linha INTEGER DEFAULT ${config.DEFAULT_MAX_LINHA},

    max_goleiros INTEGER DEFAULT ${config.DEFAULT_MAX_GOLEIROS},

    permite_inscricao_grupo INTEGER DEFAULT 1,

    permite_inscricao_privado INTEGER DEFAULT 1,

    pagamento_obrigatorio INTEGER DEFAULT 1
)
            `, (err) => {

                if (err) {
                    logger.error(err.message);
                    return;
                }

                db.run(`
                    ALTER TABLE partida_info
                    ADD COLUMN valor TEXT DEFAULT '${config.DEFAULT_RACHA_VALUE}'
                `, (alterErr) => {

                    if (
                        alterErr &&
                        !alterErr.message.includes("duplicate column")
                    ) {
                        logger.error(alterErr.message);
                    }

                });
                db.run(`
    ALTER TABLE partida_info
    ADD COLUMN permite_inscricao_grupo INTEGER DEFAULT 1
`, err => {

    if (
        err &&
        !err.message.includes("duplicate column")
    ) {
        logger.error(err.message);
    }

});

db.run(`
    ALTER TABLE partida_info
    ADD COLUMN permite_inscricao_privado INTEGER DEFAULT 1
`, err => {

    if (
        err &&
        !err.message.includes("duplicate column")
    ) {
        logger.error(err.message);
    }

});

db.run(`
    ALTER TABLE partida_info
    ADD COLUMN pagamento_obrigatorio INTEGER DEFAULT 1
`, err => {

    if (
        err &&
        !err.message.includes("duplicate column")
    ) {
        logger.error(err.message);
    }

});

                db.run(`
                    INSERT OR IGNORE INTO partida_info(id)
                    VALUES(1)
                `);

                logger.info("Tabela partida_info pronta.");

            });

            // ============================
            // Inscrições privadas
            // ============================

            db.run(`
                CREATE TABLE IF NOT EXISTS inscricoes (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    telefone TEXT NOT NULL UNIQUE,

    nome TEXT,

    posicao TEXT,

    estado TEXT DEFAULT 'MENU',

    mercadopago_order_id TEXT,

    mercadopago_payment_id TEXT,

    mercadopago_status TEXT,

    mercadopago_qr TEXT,

    mercadopago_qr_base64 TEXT,

    mercadopago_expiracao TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
            `, (err) => {

                if (err)
                    logger.error(err.message);
                else
                    logger.info("Tabela inscricoes pronta.");

            });

        });

    }
);





// ===================================================
// INSCRIÇÕES
// ===================================================

function getInscricao(telefone) {

    return new Promise((resolve, reject) => {

        db.get(

            "SELECT * FROM inscricoes WHERE telefone = ?",

            [telefone],

            (err, row) => {

                if (err) return reject(err);

                resolve(row);

            }

        );

    });

}

function criarInscricao(telefone) {

    return new Promise((resolve, reject) => {

        db.run(

            "INSERT OR IGNORE INTO inscricoes (telefone) VALUES (?)",

            [telefone],

            err => {

                if (err) return reject(err);

                resolve();

            }

        );

    });

}

function atualizarEstado(telefone, estado) {

    return new Promise((resolve, reject) => {

        db.run(

            `UPDATE inscricoes
             SET estado = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE telefone = ?`,

            [estado, telefone],

            err => {

                if (err) return reject(err);

                resolve();

            }

        );

    });

}

function atualizarNome(telefone, nome) {

    return new Promise((resolve, reject) => {

        db.run(

            `UPDATE inscricoes
             SET nome = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE telefone = ?`,

            [nome, telefone],

            err => {

                if (err) return reject(err);

                resolve();

            }

        );

    });

}

function atualizarPosicao(telefone, posicao) {

    return new Promise((resolve, reject) => {

        db.run(

            `UPDATE inscricoes
             SET posicao = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE telefone = ?`,

            [posicao, telefone],

            err => {

                if (err) return reject(err);

                resolve();

            }

        );

    });

}

function adicionarJogadorPrivado(nome, telefone, tipo, pago = 0) {

    return new Promise((resolve, reject) => {

        db.run(

            `INSERT INTO jogadores
            (nome_jogador, status_pagamento, tipo_jogador, adicionado_por)
            VALUES (?, ?, ?, ?)`,

            [
                nome,
                pago,
                tipo,
                telefone
            ],

            function(err){

                if(err) return reject(err);

                resolve(this.lastID);

            }

        );

    });

}
function getPartida() {

    return new Promise((resolve, reject) => {

        db.get(

            "SELECT * FROM partida_info WHERE id = 1",

            (err, row) => {

                if (err) return reject(err);

                resolve(row);

            }

        );

    });

}
function atualizarConfiguracao(campo, valor) {

    const camposPermitidos = [

        "titulo",
        "data_hora",
        "valor",
        "max_linha",
        "max_goleiros",

        "permite_inscricao_grupo",
        "permite_inscricao_privado",
        "pagamento_obrigatorio"

    ];

    if (!camposPermitidos.includes(campo)) {

        return Promise.reject(
            new Error("Campo inválido.")
        );

    }

    return new Promise((resolve, reject) => {

        db.run(

            `UPDATE partida_info
             SET ${campo} = ?
             WHERE id = 1`,

            [valor],

            err => {

                if (err) return reject(err);

                resolve();

            }

        );

    });

}
function salvarPagamento(dados) {

    return new Promise((resolve, reject) => {

        db.run(

            `UPDATE inscricoes
             SET mercadopago_order_id = ?,
                 mercadopago_payment_id = ?,
                 mercadopago_status = ?,
                 mercadopago_qr = ?,
                 mercadopago_qr_base64 = ?,
                 mercadopago_expiracao = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE telefone = ?`,

            [
                dados.orderId,
                dados.paymentId,
                dados.status,
                dados.qrCode,
                dados.qrCodeBase64,
                dados.expiracao,
                dados.telefone
            ],

            err => {

                if (err) return reject(err);

                resolve();

            }

        );

    });

}

function getPagamentosPendentes() {

    return new Promise((resolve, reject) => {

        db.all(
            `SELECT *
             FROM inscricoes
             WHERE estado='AGUARDANDO_PAGAMENTO'
             AND mercadopago_payment_id IS NOT NULL`,
            [],
            (err, rows) => {

                if (err) return reject(err);

                resolve(rows);

            }
        );

    });

}
function atualizarStatusPagamento(paymentId, status) {

    return new Promise((resolve, reject) => {

        db.run(
            `UPDATE inscricoes
             SET mercadopago_status=?
             WHERE mercadopago_payment_id=?`,
            [status, paymentId],
            function(err){

                if(err) return reject(err);

                resolve();

            }
        );

    });

}
// ============================
// Funções auxiliares
// ============================

db.getInscricao = getInscricao;
db.criarInscricao = criarInscricao;
db.atualizarEstado = atualizarEstado;
db.atualizarNome = atualizarNome;
db.atualizarPosicao = atualizarPosicao;
db.adicionarJogadorPrivado = adicionarJogadorPrivado;

db.getPartida = getPartida;
db.atualizarConfiguracao = atualizarConfiguracao;
db.salvarPagamento = salvarPagamento;
db.getPagamentosPendentes = getPagamentosPendentes;
db.atualizarStatusPagamento = atualizarStatusPagamento;
module.exports = db;