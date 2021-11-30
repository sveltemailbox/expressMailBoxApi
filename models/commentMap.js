"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CommentMap extends Model {
    static associate(models) {
      this.belongsTo(models.Designation, {
        as: "Designation",
        foreignKey: "user",
        targetKey: "id",
      });
      this.belongsTo(models.GeneralComments, {
        as: "GeneralComments",
        foreignKey: "com_id",
        targetKey: "id",
      });
      this.belongsTo(models.Annotations, {
        as: "Annotations",
        foreignKey: "anno_id",
        targetKey: "id",
      });
      this.belongsTo(models.Mail, {
        as: "Mail",
        foreignKey: "mail_id",
        targetKey: "id",
      });
    }
  }

  CommentMap.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        defaultValue: 0,
      },
      mail_id: {
        type: DataTypes.INTEGER,
        references: {
          model: "Mail",
          key: "id",
        },
      },
      com_id: {
        type: DataTypes.INTEGER,
        references: {
          model: "GeneralComments",
          key: "id",
        },
      },
      prev_com_id: {
        type: DataTypes.INTEGER,
        defaultValue: null,
      },
      anno_id: {
        type: DataTypes.INTEGER,
        references: {
          model: "Annotations",
          key: "id",
        },
      },
      prev_anno_id: {
        type: DataTypes.INTEGER,
        defaultValue: null,
      },
      user: {
        type: DataTypes.INTEGER,
        references: {
          model: "Designation",
          key: "id",
        },
      },
    },
    {
      sequelize,
      timestamps: false,
      modelName: "CommentMap",
      tableName: "comment_mapping",
    }
  );

  return CommentMap;
};
