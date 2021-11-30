const express = require("express");
var router = express.Router();
const apiResponse = require("../../../utils/apiresponse");
const auth = require("../../shared/auth");
var http = require("http");
var https = require("https");
const userRole = require("../../../utils/roles");
const { createLogs } = require("../../services/logsService");
const { fetchImage } = require("../../../utils/logData");

router.put("/fetch", createLogs(fetchImage), auth.isAuthorized, async (req, res, next) => {
  try {
    const { body } = req;
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      if (body.hasOwnProperty("Urls")) {
        // const filename = res.split("/");
        // const extension = filename[filename.length - 1].split('.');
        // const finalname = `${extension[0]}${i}.${extension[extension.length - 1]}`;
        var url_dest = new URL(body.Urls);
        let client = url_dest.protocol == "https:" ? https : http;
        const options = {
          hostname: url_dest.hostname,
          path: url_dest.pathname,
          headers: {
            Authorization:
              "Basic " +
              new Buffer(
                `${process.env.DATA_SERVER_CRED_USERNAME}:${process.env.DATA_SERVER_CRED_PASSWORD}`
              ).toString("base64"),
          },
        };

        client.get(body.Urls, function (response) {
          if (response.statusCode === 200) {
            response.setEncoding("base64");
            let body = "data:" + response.headers["content-type"] + ";base64,";
            response.on("data", function (chunk) {
              body += chunk;
            });
            response.on("end", () => {
              return apiResponse.successResponseWithData(
                res,
                "Retrive successfully",
                body
              );
            });
          } else {
            return apiResponse.validationErrorWithoutData(
              res,
              "Image not retrive"
            );
          }
        });
      } else {
        return apiResponse.validationErrorWithoutData(res, "Urls is required");
      }
    } else {
      return apiResponse.validationErrorWithData(
        res,
        responseMessage.UNAUTHORIZED_USER
      );
    }
  } catch (err) {
    return apiResponse.validationErrorWithData(res, err);
  }
});

module.exports = router;