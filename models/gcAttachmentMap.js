"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class GcAttachmentMap extends Model {
    static associate(models) {
      this.belongsTo(models.Designation, {
        as: "Attachments",
        foreignKey: "attch_id",
        targetKey: "id",
      });
      this.belongsTo(models.GeneralComments, {
        as: "GeneralComments",
        foreignKey: "gc_id",
        targetKey: "id",
      });
    }
  }

  GcAttachmentMap.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        defaultValue: 0,
      },
      attch_id: {
        type: DataTypes.INTEGER,
        references: {
          model: "Mail",
          key: "id",
        },
      },
      gc_id: {
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
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "GcAttachmentMap",
      tableName: "gc_attachment_map",
    }
  );

  return GcAttachmentMap;
};
