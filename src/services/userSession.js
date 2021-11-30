const { User } = require("../../models");
const responseMessage = require("../../utils/message");
const apiResponse = require("../../utils/apiresponse");
const jwtService = require("../private/jwtService");

const session = async function (req, res, next) {
  const authHeader = req.headers["authorization"];
  const Userdata = await jwtService.decodeJwt(authHeader);
  if (!Userdata || Userdata == undefined || Userdata == null) {
    return apiResponse.tokenExpired(res, responseMessage.INVALID_TOKEN);
  } else {
    let UserLastActivity = await User.findOne({
      where: { id: Userdata.id },
      attributes: ["last_activity"],
    });
    if (
      UserLastActivity &&
      UserLastActivity.last_activity &&
      UserLastActivity.last_activity != null
    ) {
      let currentTime = new Date();
      let expireTime = new Date(UserLastActivity.last_activity);
      var diff = Math.abs(currentTime - expireTime);
      var minutes = Math.floor(diff / 1000 / 60);
      console.log("minutes", minutes);
    }
    if (minutes > 30) {
      const updatedData = { 
        token: null,
        last_activity:null
      };
      let updateUserActivity = await User.update(updatedData, {
        where: { id: Userdata.id },
      });
      return apiResponse.tokenExpired(res, responseMessage.SESSION_EXPIRED);
    } else {
      return next();
    }
  }
};

module.exports = session;
