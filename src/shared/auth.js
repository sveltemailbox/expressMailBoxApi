const responseMessage = require("../../utils/message");
const jwtService = require("../private/jwtService");
const apiResponse = require("../../utils/apiresponse");
const { User } = require("../../models");
// const DB = require("../../models");

module.exports.isAuthorized = async function (req, res, next) {
  const authHeader = req.headers["authorization"];
  const Userdata = await jwtService.decodeJwt(authHeader);
  if (!Userdata || Userdata == undefined || Userdata == null) {
    return apiResponse.tokenExpired(res, responseMessage.INVALID_TOKEN);
  } else {
    const bearer = authHeader.split(' ');
    const bearerToken = bearer[1];
    let token = bearerToken;
    /* let fetchToken = await User.findOne({
      where: {
        token: token,
        // is_active: 1
      },
      // raw: true
    })

    if(!fetchToken && fetchToken === null){
      return apiResponse.tokenExpired(
        res,
        responseMessage.INVALID_TOKEN
      );
    }else{

      /* if(fetchToken.is_active ==0){
        return apiResponse.ErrorResponse(
          res,
          responseMessage.USER_INACTIVE
        );
      } */

      req.Userdata = Userdata;
      return next();
    // }
    // const updatedData = {
    //   last_activity: new Date().toISOString(),
    // };
    // let updateUserActivity = await User.update(updatedData, {
    //   where: { id: Userdata.id },
    // });
  }
};
