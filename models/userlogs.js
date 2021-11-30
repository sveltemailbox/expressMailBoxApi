"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class UserLogs extends Model {
    static associate(models) {
      this.belongsTo(models.UserMails, {
        as: "MailId",
        foreignKey: "mail_id",
        targetKey: "id",
      });
      this.belongsTo(models.Attachement, {
        as: "AttachId",
        foreignKey: "attach_id",
        targetKey: "id",
      });
      this.belongsTo(models.User, {
        as: "UserId",
        foreignKey: "user_id",
        targetKey: "id",
      });
    }
  }
  UserLogs.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        defaultValue: null,
        references: {
          model: "User",
          key: "id",
        },
      },
      mail_id: {
        type: DataTypes.INTEGER,
        defaultValue: null,
        references: {
          model: "UserMails",
          key: "id",
        },
      },
      attach_id: {
        type: DataTypes.INTEGER,
        defaultValue: null,
        references: {
          model: "Attachement",
          key: "id",
        },
      },
      type: {
        type: DataTypes.STRING,
        defaultValue: null,
      },
      ip: {
        type: DataTypes.STRING,
        defaultValue: null,
      },
      createdAt: DataTypes.DATE,
    },
    {
      sequelize,
      timestamps: false,
      updatedAt: false,
      modelName: "UserLogs",
      tableName: "user_logs",
    }
  );
  return UserLogs;
};
