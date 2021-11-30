const express = require("express");
var router = express.Router();
const Joi = require("joi");
const apiResponse = require("../../utils/apiresponse");
const validator = require("express-joi-validation").createValidator({});
const responseMessage = require("../../utils/message");
const { StaticComments } = require("../../models");
const userRole = require("../../utils/roles");
const {createLogs} = require("../services/logsService");
const { staticComments } = require("../../utils/logData");

//static comments api
router.get("/getStaticComments", createLogs(staticComments), async (req, res, next) => {
  const Userdata = req.Userdata;
  if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
    StaticComments.findAll()
      .then(function (user) {
        return apiResponse.successResponseWithData(
          res,
          responseMessage.COMMENT_LIST,
          user
        );
      })
      .catch((err) => {
        console.error(err);
        return apiResponse.ErrorResponse(res, err);
      });
  } else {
    return apiResponse.validationErrorWithData(
      res,
      responseMessage.UNAUTHORIZED_USER
    );
  }
});

module.exports = router;
