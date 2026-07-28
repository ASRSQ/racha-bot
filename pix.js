const crypto = require("crypto");
const { Order } = require("mercadopago");
const client = require("./mercadopago");

const order = new Order(client);

async function gerarPix(nome, telefone, valor) {

    const body = {

        type: "online",

        processing_mode: "automatic",

        external_reference: telefone,

        total_amount: valor.toFixed(2),

        payer: {
            email: "test_user_br@testuser.com",
            first_name: nome
        },

        transactions: {

            payments: [
                {

                    amount: valor.toFixed(2),

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

    return await order.create({
        body,
        requestOptions
    });

}

module.exports = { gerarPix };