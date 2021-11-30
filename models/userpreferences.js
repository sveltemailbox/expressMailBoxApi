"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class userPreferences extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  userPreferences.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      designation_id: DataTypes.STRING,
      category: DataTypes.STRING,
      sub_category: DataTypes.STRING,
      p_value: DataTypes.STRING,
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
      published: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
    },
    {
      sequelize,
      modelName: "userPreferences",
      tableName: "user_preferences",
    }
  );
  return userPreferences;
};
