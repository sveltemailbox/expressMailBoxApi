"use strict";

const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const basename = path.basename(__filename);
let env = `${process.env.NODE_ENV}` || "development";
let config = require(__dirname + "/../config/config.json");
const db = {};
let sequelize;
let configDetails = {};
const arr = Object.keys(config).map((key) => {
  if (key.trim() === env.trim()) {
    configDetails = config[key];
  }
});

if (
  process.env.hasOwnProperty("MYSQL_DATABASE_USERNAME") &&
  process.env.MYSQL_DATABASE_USERNAME != ""
) {
  configDetails.username = process.env.MYSQL_DATABASE_USERNAME;
}
if (
  process.env.hasOwnProperty("MYSQL_DATABASE_PASSWORD") &&
  process.env.MYSQL_DATABASE_PASSWORD != ""
) {
  configDetails.password = process.env.MYSQL_DATABASE_PASSWORD;
}
if (
  process.env.hasOwnProperty("MYSQL_DATABASE_DATABASE") &&
  process.env.MYSQL_DATABASE_DATABASE != ""
) {
  configDetails.database = process.env.MYSQL_DATABASE_DATABASE;
}
if (
  process.env.hasOwnProperty("MYSQL_DATABASE_HOST") &&
  process.env.MYSQL_DATABASE_HOST != ""
) {
  configDetails.host = process.env.MYSQL_DATABASE_HOST;
}
configDetails.timezone = "+05:30";
console.log(configDetails);
sequelize = new Sequelize(
  configDetails.database,
  configDetails.username,
  configDetails.password,
  configDetails
);

sequelize
  .authenticate()
  .then(() => {
    console.log("Connection has been established successfully.");
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err);
  });

fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf(".") !== 0 && file !== basename && file.slice(-3) === ".js"
    );
  })
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(
      sequelize,
      Sequelize.DataTypes
    );
    db[model.name] = model;
  });

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
