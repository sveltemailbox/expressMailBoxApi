"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Designation extends Model {
    static associate(models) {
      this.hasMany(models.UserMails, { foreignKey: "from" });
      this.hasMany(models.UserMails, { foreignKey: "to" });
      this.hasMany(models.Mail, { as: "Source", foreignKey: "source" });
      this.belongsTo(models.User, {
        as: "designations",
        foreignKey: "user_id",
        targetKey: "id",
      });
      this.hasMany(models.GeneralComments, { as: "From", foreignKey: "from" });
      this.hasMany(models.GeneralComments, { as: "To", foreignKey: "to" });
      this.hasMany(models.Annotations, {
        as: "anno_from",
        foreignKey: "degn_id",
      });
    }
  }
  Designation.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      branch: {
        type: DataTypes.STRING,
      },
      designation: {
        type: DataTypes.STRING,
      },
      user_id: {
        type: DataTypes.INTEGER,
      },
      default_desig: {
        type: DataTypes.INTEGER,
        defaultValue: false
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "Designation",
      tableName: "designation",
    }
  );
  return Designation;
};
