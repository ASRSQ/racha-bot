const db = require('./database');

function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve(this);
        });
    });
}

async function obterInfoPartida() {

    return await get(`
        SELECT *
        FROM partida_info
        WHERE id = 1
    `);

}

async function listarLinha() {

    return await query(`
        SELECT *
        FROM jogadores
        WHERE tipo_jogador='linha'
        ORDER BY id
    `);

}

async function listarGoleiros() {

    return await query(`
        SELECT *
        FROM jogadores
        WHERE tipo_jogador='goleiro'
        ORDER BY id
    `);

}

async function listarReservas() {

    return await query(`
        SELECT *
        FROM jogadores
        WHERE tipo_jogador='reserva'
        ORDER BY id
    `);

}

async function adicionarJogador(nome, telefone, tipo, pago = 0) {

    return await run(
        `INSERT INTO jogadores
        (nome_jogador,status_pagamento,tipo_jogador,adicionado_por)
        VALUES(?,?,?,?)`,
        [
            nome,
            pago,
            tipo,
            telefone
        ]
    );

}
async function gerarListaTexto() {

    const info = await obterInfoPartida();

    const jogadoresLinha = await listarLinha();

    const goleiros = await listarGoleiros();

    const reservas = await listarReservas();

    let lista = `⚽ *${info.titulo}*\n`;
    lista += `🗓️ *Data:* ${info.data_hora}\n\n`;

    lista += `*Jogadores de Linha (${jogadoresLinha.length}/${info.max_linha})*\n`;

    for (let i = 0; i < info.max_linha; i++) {

        if (i < jogadoresLinha.length) {

            const jogador = jogadoresLinha[i];

            const pago =
                jogador.status_pagamento == 1
                    ? "✅"
                    : "...";

            const nome =
                jogador.nome_jogador.length > 10
                    ? jogador.nome_jogador.substring(0, 10) + "…"
                    : jogador.nome_jogador;

            lista += `${i + 1}. ${nome} - Pgto: ${pago}\n`;

        } else {

            lista += `${i + 1}. ...\n`;

        }

    }

    lista += `\n*Goleiros (${goleiros.length}/${info.max_goleiros})*\n`;

    for (let i = 0; i < info.max_goleiros; i++) {

        if (i < goleiros.length) {

            const goleiro = goleiros[i];

            const pago =
                goleiro.status_pagamento == 1
                    ? "✅"
                    : "...";

            const nome =
                goleiro.nome_jogador.length > 10
                    ? goleiro.nome_jogador.substring(0, 10) + "…"
                    : goleiro.nome_jogador;

            lista += `${i + 1}. ${nome} - Pgto: ${pago}\n`;

        } else {

            lista += `${i + 1}. ...\n`;

        }

    }

    if (reservas.length) {

        lista += `\n*Lista de Reserva (${reservas.length})*\n`;

        reservas.forEach(r => {

            const pago =
                r.status_pagamento == 1
                    ? "✅"
                    : "...";

            const nome =
                r.nome_jogador.length > 10
                    ? r.nome_jogador.substring(0, 10) + "…"
                    : r.nome_jogador;

            lista += `- ${nome} - Pgto: ${pago}\n`;

        });

    }

    return lista;

}
module.exports = {

    obterInfoPartida,
    listarLinha,
    listarGoleiros,
    listarReservas,
    adicionarJogador,
    gerarListaTexto

};