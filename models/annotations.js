"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Annotations extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.ColorCode, {
        as: "Color",
        foreignKey: "color_code_id",
        targetKey: "id",
      });
      this.belongsTo(models.UserMails, {
        as: "annotation_data",
        foreignKey: "mailid",
        targetKey: "id",
      });
      this.belongsTo(models.Designation, {
        as: "anno_from",
        foreignKey: "degn_id",
        targetKey: "id",
      });
    }
  }
  Annotations.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      anno_text: {
        type: DataTypes.STRING,
      },
      start_char: {
        type: DataTypes.INTEGER,
      },
      end_char: {
        type: DataTypes.INTEGER,
      },
      degn_id: {
        type: DataTypes.INTEGER,
      },
      color_code_id: {
        type: DataTypes.INTEGER,
      },
      mailid: {
        type: DataTypes.INTEGER,
      },
      // att_id:{
      //   type:DataTypes.INTEGER,
      // },
      anno_comment: {
        type: DataTypes.STRING,
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
      published: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      enb_sent: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: "Annotations",
      tableName: "annotations",
    }
  );
  return Annotations;
};
