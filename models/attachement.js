"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Attachement extends Model {
    static associate(models) {
      this.belongsToMany(models.GeneralComments, {
        through: "gc_attachment_map",
        as: "generalComments",
        foreignKey: "attch_id",
      });
    }
  }
  Attachement.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      host: {
        type: DataTypes.STRING,
      },
      url: {
        type: DataTypes.STRING,
      },
      name: {
        type: DataTypes.STRING,
      },
      size: {
        type: DataTypes.STRING,
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
      published: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      body_flag: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: "Attachement",
      tableName: "attachement",
    }
  );
  return Attachement;
};
