const express = require("express");
var router = express.Router();
const DB = require("../../models");
const Joi = require("joi");

const userRole = require("../../utils/roles");
const apiResponse = require("../../utils/apiresponse");
const responseMessage = require("../../utils/message");

router.post("/add", async (req, res, next) => {
  let finalip = req.ip.split(":"); 
  finalip = req.header('x-forwarded-for') || req.connection.remoteAddress; //finalip[finalip.length - 1];

  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const { body } = req;
      validationAdd(body).then((res_valid) => {
        if (res_valid.status == 1) {
          createLogsVerification(body).then((res_verif) => {
            if (res_verif) {
              body.ip = req.ip;
              body.user_id = Userdata.id;
              createLogsEntry(body);
              return apiResponse.successResponseWithoutData(res, res_valid);
            } else {
              return apiResponse.validationErrorWithData(
                res,
                responseMessage.INVALID
              );
            }
          });
        } else {
          return apiResponse.validationErrorWithData(res, res_valid.err);
        }
      });
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
    const userLogsObj = Joi.object({
      mail_id: Joi.number().integer().optional(),
      attach_id: Joi.number().integer().optional(),
      type: Joi.string().required(),
    });

    await userLogsObj.validateAsync(data);
    valid.status = 1;

    return valid;
  } catch (err) {
    valid.status = 0;
    valid.err = err.details[0].message;
    return valid;
  }
};
const createLogs = (data) => {
  createLogsValidation(data).then((res) => {
    if (res) {
      createLogsVerification(data).then((res_verif) => {
        if (res_verif) {
          createLogsEntry(data);
          return true;
        }
      });
    }
  });
};

const createLogsValidation = async (data) => {
  try {
    const userLogsObj = Joi.object({
      mail_id: Joi.number().integer().optional(),
      user_id: Joi.number().optional(),
      attach_id: Joi.number().integer().optional(),
      type: Joi.string().required(),
      ip: Joi.string().required(),
    });
    await userLogsObj.validateAsync(data);
    return true;
  } catch (err) {
    return false;
  }
};

const createLogsVerification = async (data) => {
  let valid = true;
  if (data.hasOwnProperty("mail_id")) {
    const mail_data = await DB.Mail.find({
      where: {
        id: data.mail_id,
      },
    });
    if (!mail_data) {
      return false;
    }
  }
  if (data.hasOwnProperty("user_id")) {
    const userdata = await DB.User.find({
      where: {
        id: data.user_id,
      },
    });
    if (!userdata) {
      return false;
    }
  }
  if (data.hasOwnProperty("attach_id")) {
    const attach_data = await DB.Attachement.find({
      where: {
        id: data.attach_id,
      },
    });
    if (!attach_data) {
      return false;
    }
  }
  return valid;
};

const createLogsEntry = (data) => {
  let params = {
    type: data.type,
  };
  if (data.hasOwnProperty("attach_id")) {
    params.attach_id = data.attach_id;
  }
  if (data.hasOwnProperty("mail_id")) {
    params.mail_id = data.mail_id;
  }
  if (data.hasOwnProperty("user_id")) {
    params.user_id = data.user_id;
  }
  if (data.hasOwnProperty("ip")) {
    params.ip = data.ip;
  }
  DB.UserLogs.create(params);
};
module.exports = {
  createLogs,
  router,
};
