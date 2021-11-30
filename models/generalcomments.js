"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class GeneralComments extends Model {
    static associate(models) {
      // define association here
      this.belongsTo(models.Mail, {
        as: "comments_data",
        foreignKey: "user_mail_id",
        targetKey: "id",
      });
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
      this.belongsToMany(models.Attachement, {
        through: "gc_attachment_map",
        as: "Attachments",
        foreignKey: "gc_id",
      });
    }
  }
  GeneralComments.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        defaultValue: 0,
      },
      user_mail_id: {
        type: DataTypes.INTEGER,
        references: {
          model: "Mail",
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
      to: {
        type: DataTypes.INTEGER,
        references: {
          model: "Designation",
          key: "id",
        },
        defaultValue: null,
      },
      comment: {
        type: DataTypes.STRING,
      },
      is_read: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      prev_com_id: {
        type: DataTypes.INTEGER,
        defaultValue: null,
      },
      published: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      attachment_id: {
        type: DataTypes.INTEGER,
        default: null
      },
      umail_id:{
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      forward_mail_id:{
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      action: {
        type: DataTypes.STRING,
        defaultValue: null,
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "GeneralComments",
      tableName: "general_comments",
      updatedAt: false,
    }
  );
  return GeneralComments;
};
