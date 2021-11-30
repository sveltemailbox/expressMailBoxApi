"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Leave extends Model {
    static associate(models) {
      this.belongsTo(models.Designation, {
        as: "Forwarder",
        foreignKey: "forwarder",
        targetKey: "id",
      });
      this.belongsTo(models.Designation, {
        as: "Receiver",
        foreignKey: "receiver",
        targetKey: "id",
      });
    }
  }
  Leave.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      forwarder: {
        type: DataTypes.INTEGER,
        references: {
          model: "Designation",
          key: "id",
        },
      },
      receiver: {
        type: DataTypes.INTEGER,
        references: {
          model: "Designation",
          key: "id",
        },
      },
      is_active : {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      leave_from: DataTypes.DATE,
      leave_to: DataTypes.DATE,
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      updatedAt: false,
      modelName: "Leave",
      tableName: "leave_details",
    }
  );
  return Leave;
};
