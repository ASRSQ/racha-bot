const { gerarPix } = require("./pix");

(async () => {

    const pix = await gerarPix(

        "Alex Ramos",

        "5588999999999",

        20

    );

    console.log(JSON.stringify(pix, null, 2));

})();