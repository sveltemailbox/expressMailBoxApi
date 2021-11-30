const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

module.exports = class server {
  returnServer() {
    var app = express();
    app.use(bodyParser.json({limit: '50mb', extended: true}))
    app.use(bodyParser.urlencoded({limit: '50mb', extended: true}))
    app.use(cors());
    const PORT = process.env.PORT || 8000;
    app.use(bodyParser.json());
    app.use(cors());
    app.listen(PORT, console.log(`server started On Port ${PORT}`));
    return app;
  }
};
