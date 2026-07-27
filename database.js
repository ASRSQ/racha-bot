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
                    max_goleiros INTEGER DEFAULT ${config.DEFAULT_MAX_GOLEIROS}
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

                    mercadopago_payment_id TEXT,

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



module.exports = {

    db,

    getInscricao,

    criarInscricao,

    atualizarEstado,

    atualizarNome,

    atualizarPosicao,
    
        adicionarJogadorPrivado

};