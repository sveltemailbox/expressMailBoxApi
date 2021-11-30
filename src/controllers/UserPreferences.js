const express = require("express");
var router = express.Router();
const DB = require("../../models");
const Joi = require("joi");

const userRole = require("../../utils/roles");
const apiResponse = require("../../utils/apiresponse");
const responseMessage = require("../../utils/message");
const { join } = require("path");
const { where } = require("sequelize");
const { Op } = require("sequelize");
const { createLogs } = require("../services/logsService");
const { addUserPreference, getUserPreference } = require("../../utils/logData");


router.post("/add", createLogs(addUserPreference), async (req, res, next) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const { body } = req;
      for (let i = 0; i < body.length; i++) {
        let bodyObj = {
          designation_id: Userdata.designation_id,
          category: body[i]["category"],
          sub_category: body[i]["sub_category"],
          p_value: body[i]["p_value"],
        };
        let validation = await validationAdd(bodyObj);
        if (validation.status == 1) {
          let userPreferenceExist = await isPreferenceExist({
            designation_id: Userdata.designation_id,
            category: bodyObj.category,
            sub_category: bodyObj.sub_category,
          });
          if (userPreferenceExist) {
            let updatePreferencesData = await updatePreferences(
              { id: userPreferenceExist.id },
              bodyObj
            );
          } else {
            let preference = new DB.userPreferences(bodyObj);
            preference
              .save()
              .then((preference) => {})
              .catch((err) => {
                console.error(err);
                return apiResponse.ErrorResponse(res, err);
              });
          }
        } else {
          return apiResponse.validationErrorWithData(res, validation.err);
        }
      }
      return apiResponse.successResponseWithData(
        res,
        responseMessage.PER_UPDATE
      );
    } else {
      return apiResponse.validationErrorWithData(
        res,
        responseMessage.UNAUTHORIZED_USER
      );
    }
  } catch (err) {
    console.log(err);
    return apiResponse.validationErrorWithData(res, err.details[0].message);
  }
});

const validationAdd = async (data) => {
  let valid = {};
  try {
    const userPrefObj = Joi.object({
      designation_id: Joi.number().required(),
      category: Joi.string().required(),
      sub_category: Joi.optional(),
      p_value: Joi.optional(),
    });
    await userPrefObj.validateAsync(data);
    valid.status = 1;
    return valid;
  } catch (err) {
    valid.status = 0;
    valid.err = err.details[0].message;
    return valid;
  }
};

const isPreferenceExist = async (whereData) => {
  return await DB.userPreferences.findOne({
    where: whereData,
    raw: true,
  });
};

const updatePreferences = async (whereData, data) => {
  return await DB.userPreferences.update(data, { where: whereData });
};

router.get("/", createLogs(getUserPreference), async (req, res) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const preferences = await DB.userPreferences.findAll({
        where: { designation_id: Userdata.designation_id },
      });
      return apiResponse.successResponseWithData(
        res,
        responseMessage.PREFERS_LIST,
        preferences
      );
    } else {
      return apiResponse.validationErrorWithData(
        res,
        responseMessage.UNAUTHORIZED_USER
      );
    }
  } catch (err) {
    console.log(err);
  }
});

module.exports = router;
