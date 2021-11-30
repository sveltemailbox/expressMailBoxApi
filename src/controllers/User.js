const express = require("express");
var router = express.Router();
const Joi = require("joi");
const apiResponse = require("../../utils/apiresponse");
const validator = require("express-joi-validation").createValidator({});
const responseMessage = require("../../utils/message");
const bcrypt = require("bcrypt");
const userRole = require("../../utils/roles");
const webToken = require("jsonwebtoken");
const secretKey = require("../private/secret");
const jwtService = require("../private/jwtService");
const { User, Annotations } = require("../../models");
const DB = require("../../models");
const auth = require("../shared/auth");
const {
  Folder,
  Mail,
  Designation,
  Attachement,
  ColorCode,
} = require("../../models");
const { createLogs } = require("../services/logsService");
const { findOne } = require("../models/mongo/mailMongoModel");
const { Sequelize, Op } = require("sequelize");
const session = require("../../src/services/userSession");
const mailAction = require("../../utils/contants");
const { userProfile, changePassword, documentColorCode, frequentlyUsedDesignation, switchUser, signOut } = require("../../utils/logData");

// Register APi
router.post("/register", async (req, res, next) => {
  try {
    const { body } = req;
    const user_name = body.user_name;
    const password = body.password;
    const userSchema = Joi.object({
      first_name: Joi.string().required(),
      user_name: Joi.string().alphanum().min(3).max(30).required(),
      designation: Joi.string().required(),
      password: Joi.string().required(),
    });
    const result = await userSchema.validateAsync(body);
    const { value, error } = result;
    const valid = error == null;
    User.findOne({ where: { user_name } }).then((value) => {
      if (value === null) {
        //HASH THE PASSWORD
        bcrypt.genSalt(10, function (err, salt) {
          bcrypt.hash(password, salt, function (err, hash) {
            // CRETAE RECORD IN DB
            req.body.password = hash;
            const addUser = new User(req.body);
            addUser
              .save()
              .then((user) => {
                return apiResponse.successResponse(
                  res,
                  responseMessage.USER_REGISTER
                );
              })
              .catch((err) => {
                console.error(err);
                return apiResponse.ErrorResponse(res, err);
              });
          });
        });
      } else {
        return apiResponse.validationErrorWithData(
          res,
          responseMessage.USER_ALREADY_EXIST
        );
      }
    });
  } catch (err) {
    console.log(err);
    return apiResponse.validationErrorWithData(res, err.details[0].message);
  }
});

//Login Api
router.post("/login", async (req, res, next) => {
  try {
    const { body } = req;
    const { password, user_name } = req.body;
    const userLoginSchema = Joi.object({
      user_name: Joi.string().alphanum().min(3).max(30).required(),
      password: Joi.string().required(),
    });
    const result = await userLoginSchema.validateAsync(body);
    const { value, error } = result;
    const valid = error == null;
    // check mail in db or not
    User.findOne({
      where: { user_name },
      include: [
        {
          model: Designation,
          as: "designations",
          where: { default_desig: {[Op.gt]: 0} }
        },
      ],
    }).then((value) => {
      if (value === null) {
        return apiResponse.validationErrorWithData(
          res,
          responseMessage.USER_NOT_REGISTERED
        );
      } else {
        const dbPassword = value.getDataValue("password");
        const userDetail = {
          name: value.getDataValue("user_name"),
          id: value.getDataValue("id"),
          role: value.getDataValue("role"),
          designation_id: value.designations[0].id
        };
        bcrypt.compare(password, dbPassword, function (err, result) {
          if (result) {
            const token = webToken.sign(userDetail, secretKey, {
              expiresIn: "168h",
            }); 
            //is_active 0 and token is null in case of user is not signout 
            /* if(value.is_active == 1){
              updateUser(
                { token:null, last_activity: null,is_active:0 },
                { where: { id: userDetail.id } }
              ); 
            } */
            DB.UserLogs.sequelize
              .query(
                "SELECT id,user_id FROM user_logs WHERE user_id = " +
                  userDetail.id +
                  " and type='LOGIN' and DATE(created) = CURDATE() ORDER BY created limit 1",
                { type: DB.sequelize.QueryTypes.SELECT }
              )
              .then((userLogResult) => {
                if (userLogResult.length === 0) {
                  const unreadfunData = unreadMailFuncation(userDetail.id);
                  if (unreadfunData.records == 0) {
                    return apiResponse.ErrorResponse(res, unreadfunData.msg);
                  }
                }
              })
              .catch((err) => {
                console.log("ee", err);
                return apiResponse.ErrorResponse(res, err);
              });
              /* if(value.is_active == 0){
                let updatedUserData = {
                  token: token, 
                  is_active:1
                };
                User.update(updatedUserData, {
                  where: { id: userDetail.id },
                })
                .then(function (tokenUpdated) { */
                  /* let finalip = req.ip.split(":");
                  finalip = finalip[finalip.length - 1]; */
                  let finalip =
                    req.header("x-forwarded-for") || req.connection.remoteAddress;
                  let logsdata = {
                    user_id: userDetail.id,
                    type: "LOGIN",
                    ip: finalip,
                  };
                  // createLogs(logsdata);
                  return apiResponse.successResponseWithData(
                    res,
                    responseMessage.USER_LOGIN,
                    token
                  );
                /* })
                .catch((err) => {
                  console.error(err);
                  return apiResponse.ErrorResponse(res, err);
                }); */
             /*  }
              else{
                return apiResponse.successResponseWithData(
                  res,
                  responseMessage.USER_LOGIN,
                  userDetail.token
                );
              } */
          } else {
            return apiResponse.validationErrorWithData(
              res,
              responseMessage.INVALID_CREDENTIALS
            );
          }
        });
      }
    });
  } catch (err) {
    console.log(err);
    return apiResponse.validationErrorWithData(res, err.details[0].message);
  }
});

//UserProfile Api
router.get("/userProfile", auth.isAuthorized, createLogs(userProfile), async (req, res, next) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      User.findOne({
        where: Userdata.id,
        include: [
          {
            model: Designation,
            as: "designations",
          },
        ],
      })
        .then(function (user) {
          return apiResponse.successResponseWithData(
            res,
            responseMessage.USER_LOGIN,
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
  } catch (err) {
    console.log(err);
    return apiResponse.validationErrorWithData(res, err.details[0].message);
  }
});

//ChangePassword Api
router.put("/changePassword", auth.isAuthorized, createLogs(changePassword), async (req, res, next) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const { body } = req;
      const changePasswordSchema = Joi.object({
        oldPassword: Joi.string().required(),
        newPassword: Joi.string().required(),
        renewPassword: Joi.string().required(),
      });
      const result = await changePasswordSchema.validateAsync(body);
      const { value, error } = result;
      const valid = error == null;
      if (
        body.oldPassword.trim() !== "" &&
        body.newPassword.trim() !== "" &&
        body.renewPassword.trim() !== ""
      ) {
        if (
          body.newPassword === body.renewPassword &&
          body.newPassword !== body.oldPassword
        ) {
          User.findOne({
            where: Userdata.id,
          })
            .then((user) => {
              if (user) {
                bcrypt.compare(
                  body.oldPassword,
                  user.password,
                  function (err, result) {
                    console.log(err);
                    if (!result) {
                      return apiResponse.validationErrorWithData(
                        res,
                        responseMessage.WRONG_OLD_PASS
                      );
                    } else {
                      bcrypt
                        .hash(req.body.newPassword, 10)
                        .then((hash) => {
                          const updatedData = {
                            password: hash,
                            updatedAt: new Date().toISOString(),
                          };
                          User.update(updatedData, {
                            where: { id: Userdata.id },
                          })
                            .then(() => {
                              return apiResponse.successResponse(
                                res,
                                responseMessage.PASSWORD_CHANGED
                              );
                            })
                            .catch((err) => {
                              return apiResponse.ErrorResponse(res, err);
                            });
                        })
                        .catch((err) => {
                          return apiResponse.validationErrorWithData(
                            res,
                            responseMessage.BYCRYPT_ERROR
                          );
                        });
                    }
                  }
                );
              } else {
                return apiResponse.validationErrorWithData(
                  res,
                  responseMessage.BYCRYPT_ERROR
                );
              }
            })
            .catch((err) => {
              return apiResponse.validationErrorWithData(
                res,
                responseMessage.USER_NOT_EXIST
              );
            });
        } else {
          return apiResponse.validationErrorWithData(
            res,
            responseMessage.PASSWORD_MISMATCH
          );
        }
      } else {
        return apiResponse.validationErrorWithData(
          res,
          responseMessage.TRIM_ERROR
        );
      }
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

router.get("/documentColorCode", auth.isAuthorized, createLogs(documentColorCode), async (req, res) => {
  const Userdata = req.Userdata;
  if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
    const body = req.query;
    if (!body.hasOwnProperty("mailid"))
      return apiResponse.validationErrorWithData(res, responseMessage.INVALID);
    let isUserColorCodeExist = await checkUserColorCodeExist({
      mailid: req.query.mailid,
      degn_id: Userdata.designation_id,
    });
    if (isUserColorCodeExist && isUserColorCodeExist.Color) {
      return apiResponse.successResponseWithData(
        res,
        responseMessage.USER_COLOR,
        isUserColorCodeExist.Color
      );
    } else {
      let mail = await findMailData({ id: req.query.mailid });
      let document_id = mail ? mail.document_id : null;
      let mailIds = await getMailIds({ document_id: document_id });
      let Ids = mailIds.map((v) => {
        return v.id;
      });
      // let usercolorexists = await alreadyUsedColor({ mailid: { $in: Ids }, degn_id:req.query.degn_id });
      // console.log(usercolorexists);
      // if (usercolorexists && usercolorexists.length > 0) {
      //   return apiResponse.successResponseWithData(
      //     res,
      //     responseMessage.USER_COLOR,
      //     usercolorexists.Color
      //  );
      // }
      let usedColorCode = await alreadyUsedColor({ mailid: { $in: Ids } });
      if (usedColorCode && usedColorCode.length > 0) {
        let usedColors = usedColorCode.map((v) => {
          return v.color_code_id;
        });
        let restColorsForDocument = await DB.ColorCode.findAll({
          where: { id: { $notIn: usedColors } },
        });
        let ramdomColorCode =
          restColorsForDocument[
            Math.floor(Math.random() * restColorsForDocument.length)
          ];
        return apiResponse.successResponseWithData(
          res,
          responseMessage.USER_COLOR,
          ramdomColorCode
        );
      } else {
        let allColors = await findAllColors();
        let ramdomColorCode =
          allColors[Math.floor(Math.random() * allColors.length)];
        return apiResponse.successResponseWithData(
          res,
          responseMessage.USER_COLOR,
          ramdomColorCode
        );
      }
    }
  } else {
    return apiResponse.validationErrorWithData(
      res,
      responseMessage.UNAUTHORIZED_USER
    );
  }
});

const checkUserColorCodeExist = async (whereData) => {
  return await Annotations.findOne({
    where: whereData,
    include: [
      {
        model: DB.ColorCode,
        as: "Color",
      },
    ],
  });
};

const findMailData = async (whereData) => {
  return await DB.Mail.findOne({
    where: whereData,
  });
};

const getMailIds = async (whereData) => {
  return await DB.Mail.findAll({
    where: whereData,
    attributes: ["id"],
    raw: true,
  });
};

const alreadyUsedColor = async (whereData) => {
  return await DB.Annotations.findAll({
    where: whereData,
    attributes: [
      [
        Sequelize.fn("DISTINCT", Sequelize.col("color_code_id")),
        "color_code_id",
      ],
    ],
  });
};

const findAllColors = async () => {
  return await DB.ColorCode.findAll({});
};

router.get(
  "/frequentlyUsedDesignations",
  auth.isAuthorized,
  createLogs(frequentlyUsedDesignation),
  async (req, res) => {
    try {
      const Userdata = req.Userdata;
      if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
        DB.Designation.sequelize
          .query(
            "SELECT count(m.id),`to`,d.* FROM `user_mails` m JOIN designation d on d.id = m.to WHERE `d`.`default_desig` > 0 AND `from`=" +
            Userdata.designation_id +
              " GROUP by `to` ORDER by COUNT(m.id) desc limit 6"
          )
          .then(([results, metadata]) => {
            return apiResponse.successResponseWithData(
              res,
              responseMessage.FREQUENTLY_USED_DESIGNATIONS,
              results
            );
          })
          .catch((err) => {
            console.log(err);
            return apiResponse.ErrorResponse(res, err);
          });
      } else {
        return apiResponse.validationErrorWithData(
          res,
          responseMessage.UNAUTHORIZED_USER
        );
      }
    } catch (err) {
      console.log(err);
      return apiResponse.ErrorResponse(res, err);
    }
  }
);

router.post("/switch_user", auth.isAuthorized, createLogs(switchUser), async (req, res) => {
  try {
    await checkSchema(req);
    const userData = req.Userdata;

    const findDes = await DB.Designation.findOne({
      where: {
        user_id: userData.id,
        default_desig: {[Op.gt]: 0}
      },
      raw: true
    });

    if (findDes) {
      const userDetail = {
        name: userData.name,
        id: userData.id,
        role: userData.role,
        designation_id: req.body.designation_id,
      };

      const token = webToken.sign(userDetail, secretKey, {
        expiresIn: "168h",
      });

      updateUser(
        { token, last_activity: null },
        { where: { user_name: userData.name } }
      );

      await updateDesgination(
        { default_desig: false },
        { where: { user_id: userData.id } }
      ).then(async () => {
        await updateDesgination(
          { default_desig: findDes.default_desig },
          { where: { id: req.body.designation_id } },
        ).then(async () => {
          return apiResponse.successResponseWithData(
            res,
            responseMessage.USER_LOGIN,
            token
          );
        })
      });
    }

  } catch (err) {
    console.log(err);
    return apiResponse.validationErrorWithData(res, err);
  }
});


const checkSchema = async (req) => {
  try {
    const { body } = req;
    const userLoginSchema = Joi.object({
      designation_id: Joi.number().required(),
      current_desgi_id: Joi.number().required(),
    });
    const result = await userLoginSchema.validateAsync(body);
    const { value, error } = result;
    const valid = error == null;
  } catch (err) {
    throw err;
  }
};

const updateUser = (updateData, whereData) => {
  try {
    User.update(updateData, whereData);
  } catch (err) {
    throw err;
  }
};

const updateDesgination = (updateData, whereData) => {
  try {
    return DB.Designation.update(updateData, whereData);
  } catch (err) {
    throw err;
  }
};

const unreadMailFuncation = (userInfo) => {
  let outputData = {};
  DB.Designation.findOne({
    where: { user_id: { [Op.eq]: userInfo } },
    attributes: ["id"],
  })
    .then((userDesignationResult) => {
      let readDataArr =['68','78','87','96','98','88'];
      if (userDesignationResult !== null) {
        const deginationId = userDesignationResult.get("id");
        // find user Mail except of current date
        DB.Mail.sequelize
          .query(
            "SELECT `id`,`to`,`from_read_mail`,`is_read_mail`,`mail_action`,`from_action` FROM user_mails WHERE (mail_action IN ('98','96','87','88','78','68')) AND (`to` = "+deginationId+" OR `from` = "+deginationId+") and DATE(createdAt) < CURDATE() ",
            { raw: true, type: DB.sequelize.QueryTypes.SELECT }
          )
          .then(function (results, metadata) {
            if (results.length > 0) {
              results.map((data) => {
                  // if(data.from_action == mailAction.Read && data.from_read_mail ==1){
                    if(readDataArr.includes(data.from_action) && data.from_read_mail ==1){
                    DB.UserMails.update(
                      { from_read_mail : 0},
                      { where: { id: data.id } }
                    ) // update is_read_enabled 0 because next time that row does not come
                      .then(function (isResults) {
                        outputData.msg =
                          "Successfully Updated is read enabled records";
                        outputData.error = 0;
                        outputData.records = 1;
                      })
                      .catch((err) => {
                        outputData.msg = err;
                        outputData.error = 1;
                        outputData.records = 0;
                      });
                    // console.log('Successfully Updated is read enabled records');
                  }
                  // else if(data.mail_action == mailAction.Read && data.is_read_mail ==1){
                  if(readDataArr.includes(data.mail_action) && data.is_read_mail ==1){
                    DB.UserMails.update(
                      { is_read_mail : 0},
                      { where: { id: data.id } }
                    ) // update is_read_enabled 0 because next time that row does not come
                      .then(function (isResults) {
                        outputData.msg =
                          "Successfully Updated is read enabled records";
                        outputData.error = 0;
                        outputData.records = 1;
                      })
                      .catch((err) => {
                        outputData.msg = err;
                        outputData.error = 1;
                        outputData.records = 0;
                      });
                    // console.log('Successfully Updated is read enabled records');
                  }
              });
            } else {
              outputData.msg = "No mail in mail table";
              outputData.error = 0;
              outputData.records = 0;
            }
          })
          .catch((err) => {
            outputData.error = err;
            outputData.error = 1;
            outputData.records = 0;
          });
      }
    })
    .catch((err) => {
      outputData.error = err;
      outputData.error = 1;
      outputData.records = 0;
    });
  return outputData;
};

router.post("/sign_out", auth.isAuthorized, createLogs(signOut), async (req, res) => {
  try {
    const findDes = await DB.Designation.findOne({
      where: {
        user_id: req.Userdata.id,
        default_desig: {[Op.gt]: 0}
      },
      // raw: true
    });
    if (findDes) {
      await updateDesgination(
        { default_desig: false },
        { where: { user_id: req.Userdata.id } }
      ).then(async () => {
        await updateDesgination(
          { default_desig: findDes.default_desig },
          { where: { id: findDes.default_desig } }
        ).then(async () => {
          /* await updateUser(
            { token:null, last_activity: null,is_active:0 },
            { where: { id: req.Userdata.id } }
          ); */
          return apiResponse.successResponseWithData(
            res,
            responseMessage.USER_LOGOUT
          );
        });
      });
    }
  } catch (err) {
    console.log(err);
    return apiResponse.validationErrorWithData(res, err);
  }
});

module.exports = router;
