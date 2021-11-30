"use strict";
const userRole = require("../utils/roles");
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      this.hasMany(models.Designation, {
        as: "designations",
        foreignKey: "user_id",
      });
    }
  }
  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      first_name: {
        type: DataTypes.STRING,
      },
      user_name: {
        type: DataTypes.STRING,
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
      designation: {
        type: DataTypes.STRING,
      },
      published: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      role: {
        type: DataTypes.INTEGER,
        defaultValue: userRole.USER,
      },
      password: {
        type: DataTypes.STRING,
      },
      token: {
        type: DataTypes.STRING,
      },
      token_expire: {
        type: DataTypes.DATE,
      },
      is_active:{
        type: DataTypes.INTEGER,
        defaultValue: 0,
      }
      // last_activity: {
      //   type: DataTypes.DATE,
      // },
    },
    {
      sequelize,
      modelName: "User",
      tableName: "user",
    }
  );
  return User;
};
