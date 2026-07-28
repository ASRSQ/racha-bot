const crypto = require("crypto");
const { Payment } = require("mercadopago");
const client = require("./mercadopago");

const payment = new Payment(client);

async function gerarPix(nome, telefone, valor) {

    const body = {
        transaction_amount: Number(valor),
        description: "Inscrição Racha dos Crias",

        payment_method_id: "pix",

        external_reference: telefone,

        payer: {
            email: "SEU_EMAIL@EMAIL.COM",
            first_name: nome
        }
    };

    const requestOptions = {
        idempotencyKey: crypto.randomUUID()
    };

    const resposta = await payment.create({
        body,
        requestOptions
    });

    return {
        payment_id: String(resposta.id),
        status: resposta.status,
        qr_code: resposta.point_of_interaction.transaction_data.qr_code,
        qr_code_base64: resposta.point_of_interaction.transaction_data.qr_code_base64,
        expiracao: resposta.date_of_expiration
    };
}

module.exports = {
    gerarPix
};