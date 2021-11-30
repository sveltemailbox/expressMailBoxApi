"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Folder extends Model {
    static associate(models) {
      this.belongsTo(models.ColorCode, {
        as: "Color",
        foreignKey: "color_code",
        targetKey: "id",
      });
      this.hasMany(models.UserMails, { foreignKey: "folder" });
      // this.belongsTo(models.Mail, { foreignKey: 'folder' });
    }
  }
  Folder.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        defaultValue: 0,
      },
      name: {
        type: DataTypes.STRING,
      },
      designation_id: {
        type: DataTypes.INTEGER,
      },
      color_code: {
        type: DataTypes.INTEGER,
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
      published: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
    },
    {
      sequelize,
      modelName: "Folder",
      tableName: "folder",
    }
  );

  return Folder;
};
