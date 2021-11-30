"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class ColorCode extends Model {
    static associate(models) {
      // console.log(models.Folder);
      this.hasOne(models.Folder, { foreignKey: "color_code" });
      this.hasOne(models.Annotations, { foreignKey: "color_code_id" });
    }
  }
  ColorCode.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      text: {
        type: DataTypes.STRING,
      },
      background: {
        type: DataTypes.STRING,
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
      modelName: "ColorCode",
      tableName: "colorcode",
    }
  );

  return ColorCode;
};
