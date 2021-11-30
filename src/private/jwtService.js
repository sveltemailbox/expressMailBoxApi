const webToken = require("jsonwebtoken");
const secretKey = require("../private/secret");
const { User } = require("../../models");

exports.decodeJwt = async function (jwtToken) {
  const userToken = jwtToken;
  if (userToken) {
    const token = userToken.substr("Bearer".length + 1);
    try {
      let user = await webToken.verify(token, secretKey);
      if (user) {
        // let Token = await User.findOne({
        //   where: { id: user.id },
        //   attributes: ["token"],
        // });
        // if(user && Token && Token.token != null && Token.token == token){
          return user;
        // }
      } else {
        throw "Invalid Token please login again";
      }
    } catch (e) {
      console.error("Invalid Token error here", e);
    }
  }
};
