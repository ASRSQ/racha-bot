const rachaService = require('./rachaService');

let sock = null;

function iniciar(socket) {
    sock = socket;
}

async function enviarTexto(jid, texto) {

    if (!sock)
        throw new Error("Baileys não inicializado.");

    return await sock.sendMessage(jid, {
        text: texto
    });

}

async function enviarLista(jid) {

    const texto = await rachaService.gerarListaTexto();

    return await enviarTexto(jid, texto);

}

module.exports = {

    iniciar,
    enviarTexto,
    enviarLista

};