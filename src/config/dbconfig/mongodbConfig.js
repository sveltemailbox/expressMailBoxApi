const mongoose = require("mongoose");
var mongourl = "mongodb://localhost:27017/mailbox";
if (!process.env.MONGO_DATABASE_USERNAME) {
    mongourl = `mongodb://${process.env.MONGO_DATABASE_HOST}:27017/${process.env.MONGO_DATABASE_DATABASE}`;
}

mongoose.connect(mongourl);
mongoose.Promise = global.Promise;
var mongodb = mongoose.connection;
module.exports = mongodb;
