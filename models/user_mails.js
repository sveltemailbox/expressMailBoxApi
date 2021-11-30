"use strict";
const mailAction = require("../utils/contants");
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class UserMails extends Model {
    static associate(models) {
      // define association here
      this.belongsTo(models.Designation, {
        as: "From",
        foreignKey: "from",
        targetKey: "id",
      });
      this.belongsTo(models.Designation, {
        as: "To",
        foreignKey: "to",
        targetKey: "id",
      });
      this.belongsTo(models.Folder, {
        as: "ToFolder",
        foreignKey: "to_folder",
        targetKey: "id",
      });
      this.belongsTo(models.Folder, {
        as: "FromFolder",
        foreignKey: "from_folder",
        targetKey: "id",
      });
      this.hasMany(models.GeneralComments, {
        as: "comments_data",
        foreignKey: "user_mail_id",
      });
      this.hasMany(models.Annotations, {
        as: "annotation_data",
        foreignKey: "mailid",
      });
      this.belongsTo(models.Mail, {
        foreignKey: "user_mail_id",
        targetKey: "id",
      });
    }
  }
  UserMails.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_mail_id: {
        type: DataTypes.INTEGER,
        references: {
          model: "Mail",
          key: "id",
        },
      },
      to: {
        type: DataTypes.INTEGER,
        references: {
          model: "Designation",
          key: "id",
        },
      },
      from: {
        type: DataTypes.INTEGER,
        references: {
          model: "Designation",
          key: "id",
        },
      },
      published: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      sent_enabled: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      }, 
      is_read_mail: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      }, 
      from_read_mail: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      folder: {
        type: DataTypes.INTEGER,
      },
      from_folder: {
        type: DataTypes.INTEGER,
      },
      to_folder: {
        type: DataTypes.INTEGER,
      },
      attachement_ids: {
        type: DataTypes.STRING,
      },
      mail_read_time:{
        type: DataTypes.DATE,
      },
      mail_action: {
        type: DataTypes.ENUM(
          mailAction.UNREAD,
          mailAction.CRASHED,
          mailAction.READ,
          mailAction.READ_ENABLED,
          mailAction.FROM_IS_READ,
          mailAction.FROM_ISREAD_ENABLED,

        ),
        defaultValue: mailAction.UNREAD,
      },
      from_action: {
        type: DataTypes.ENUM(
          mailAction.Sent,
          mailAction.CRASHED,
          mailAction.READ,
          mailAction.READ_ENABLED,
          mailAction.FROM_IS_READ,
          mailAction.FROM_ISREAD_ENABLED,

        ),
        defaultValue: mailAction.Sent,
      },
      attachments: {
        type: DataTypes.VIRTUAL,
      },
      leave_mail: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "UserMails",
      tableName: "user_mails",
      updatedAt: false,
    }
  );
  return UserMails;
};
