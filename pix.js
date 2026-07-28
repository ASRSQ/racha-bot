const crypto = require("crypto");
const { Order } = require("mercadopago");
const client = require("./mercadopago");

const order = new Order(client);

async function gerarPix(nome, telefone, valor) {

    const body = {

        type: "online",

        processing_mode: "automatic",

        external_reference: telefone,

        // Sempre enviar número
        total_amount: Number(valor.toFixed(2)),

        payer: {
            email: "test_user_br@testuser.com",
            first_name: nome
        },

        transactions: {

            payments: [
                {
                    amount: Number(valor.toFixed(2)),

                    payment_method: {
                        id: "pix",
                        type: "bank_transfer"
                    }
                }
            ]
        }
    };

    const requestOptions = {
        idempotencyKey: crypto.randomUUID()
    };

    console.log("\n========================================");
    console.log("🚀 ENVIANDO PIX PARA O MERCADO PAGO");
    console.log("========================================");
    console.log("Nome:", nome);
    console.log("Telefone:", telefone);
    console.log("Valor:", valor);

    console.log("\n📦 BODY:");
    console.log(JSON.stringify(body, null, 2));

    console.log("\n🔑 REQUEST OPTIONS:");
    console.log(requestOptions);

    try {

        const resposta = await order.create({
            body,
            requestOptions
        });

        console.log("\n✅ RESPOSTA MERCADO PAGO:");
        console.dir(resposta, { depth: null });

        return resposta;

    } catch (erro) {

        console.log("\n========================================");
        console.log("❌ ERRO MERCADO PAGO");
        console.log("========================================");

        console.log("\nMensagem:");
        console.log(erro.message);

        console.log("\nObjeto completo:");
        console.dir(erro, { depth: null });

        if (erro.cause) {
            console.log("\nCAUSE:");
            console.dir(erro.cause, { depth: null });
        }

        if (erro.response) {
            console.log("\nRESPONSE:");
            console.dir(erro.response, { depth: null });
        }

        if (erro.response?.data) {
            console.log("\nRESPONSE.DATA:");
            console.dir(erro.response.data, { depth: null });
        }

        if (erro.error) {
            console.log("\nERROR:");
            console.dir(erro.error, { depth: null });
        }

        console.log("\nBODY ENVIADO:");
        console.dir(body, { depth: null });

        throw erro;
    }
}

module.exports = {
    gerarPix
};