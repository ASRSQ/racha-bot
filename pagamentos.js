const db = require('./database');
const client = require('./mercadopago');
const { Payment } = require('mercadopago');

const paymentApi = new Payment(client);

async function verificarPagamentos(sock) {

    console.log("\n=======================================");
    console.log("🔍 VERIFICANDO PAGAMENTOS");
    console.log("=======================================");

    try {

        const pendentes = await db.getPagamentosPendentes();

        console.log(`📄 ${pendentes.length} pagamento(s) pendente(s).\n`);

        for (const inscricao of pendentes) {

            console.log("---------------------------------------");
            console.log(`👤 ${inscricao.nome}`);
            console.log(`📱 ${inscricao.telefone}`);
            console.log(`💳 Payment ID: ${inscricao.mercadopago_payment_id}`);

            try {

                const pagamento = await paymentApi.get({
                    id: inscricao.mercadopago_payment_id
                });

                console.log("✅ Resposta Mercado Pago:");
                console.dir(pagamento, { depth: null });

                await db.atualizarStatusPagamento(
                    inscricao.mercadopago_payment_id,
                    pagamento.status
                );

                console.log(`📌 Status: ${pagamento.status}`);

                if (pagamento.status !== "approved") {

                    console.log("⏳ Pagamento ainda não aprovado.");
                    continue;

                }

                if (inscricao.estado === "FINALIZADO") {

                    console.log("⚠️ Inscrição já finalizada.");
                    continue;

                }

                console.log("➕ Adicionando jogador...");

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

                console.log("📨 Enviando confirmação pelo WhatsApp...");

                await sock.sendMessage(inscricao.telefone, {
                    text: `✅ *Pagamento confirmado!*

Sua inscrição foi concluída com sucesso.

⚽ Nos vemos no racha!`
                });

                console.log(`🎉 ${inscricao.nome} confirmado com sucesso!`);

            } catch (erro) {

                console.log("\n❌ ERRO AO CONSULTAR PAGAMENTO");
                console.log("Mensagem:", erro.message);

                if (erro.response) {
                    console.dir(erro.response, { depth: null });
                }

                console.dir(erro, { depth: null });

            }

        }

        console.log("\n✅ Verificação finalizada.");

    } catch (erro) {

        console.log("\n❌ ERRO GERAL");
        console.dir(erro, { depth: null });

    }

}

module.exports = {
    verificarPagamentos
};