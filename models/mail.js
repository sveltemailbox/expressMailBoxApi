"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Mail extends Model {
    static associate(models) {
          this.belongsTo(models.Designation, {
        as: "Source",
        foreignKey: "source",
        targetKey: "id",
      });
      this.hasMany(models.UserMails, {
        foreignKey: "user_mail_id",
      });
    }
  }
  Mail.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      source: {
        type: DataTypes.INTEGER,
        references: {
          model: "Designation",
          key: "id",
        },
      },
      document_id: {
        type: DataTypes.STRING,
      },
      subject: {
        type: DataTypes.STRING,
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
      published: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      op: {
        type: DataTypes.STRING,
      },
    },
    {
      sequelize,
      updatedAt: false,
      modelName: "Mail",
      tableName: "mail",
    }
  );

  return Mail;
};
