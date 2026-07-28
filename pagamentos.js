const db = require('./database');
const client = require('./mercadopago');

const { Payment } = require('mercadopago');

const paymentApi = new Payment(client);

async function verificarPagamentos(sock) {

    try {

        const pendentes = await db.getPagamentosPendentes();

        for (const inscricao of pendentes) {

            try {

                const pagamento = await paymentApi.get({
                    id: inscricao.mercadopago_payment_id
                });

                if (!pagamento)
                    continue;

                // Atualiza status no banco
                await db.atualizarStatusPagamento(
                    inscricao.mercadopago_payment_id,
                    pagamento.status
                );

                // Ainda aguardando
                if (pagamento.status !== "approved")
                    continue;

                // Evita cadastrar duas vezes
                if (inscricao.estado === "FINALIZADO")
                    continue;

                await db.adicionarJogadorPrivado(
                    inscricao.nome,
                    inscricao.telefone,
                    inscricao.posicao,
                    0
                );

                await db.atualizarEstado(
                    inscricao.telefone,
                    "FINALIZADO"
                );

            await sock.sendMessage(inscricao.telefone, {
    text: `✅ *Pagamento confirmado!*

Sua inscrição foi concluída com sucesso.

⚽ Nos vemos no racha!`
});

                console.log(
                    "Pagamento confirmado:",
                    inscricao.nome
                );

            } catch (erro) {

                console.error(
                    "Erro ao consultar pagamento:",
                    erro.message
                );

            }

        }

    } catch (erro) {

        console.error(erro);

    }

}

module.exports = {
    verificarPagamentos
};