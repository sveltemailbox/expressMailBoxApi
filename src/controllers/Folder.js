const express = require("express");
var router = express.Router();
const Joi = require("joi");
const userRole = require("../../utils/roles");
const apiResponse = require("../../utils/apiresponse");
const responseMessage = require("../../utils/message");
const { Folder, ColorCode, UserMails } = require("../../models");
const { createLogs } = require("../services/logsService");
const { addFolder, getFolderByUserId, updateFolder, deleteFolder } = require("../../utils/logData");

//add folder api
router.post("/addFolder", createLogs(addFolder), async (req, res, next) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const { body } = req;
      const folderSchema = Joi.object({
        name: Joi.string().required(),
      });
      const result = await folderSchema.validateAsync(body);
      const { value, error } = result;
      const valid = error == null;
      try {
        let folderAlready = await Folder.findOne({
          where: {
            name: body.name,
            published: 1,
            designation_id: Userdata.designation_id,
          },
        });

        if (folderAlready && folderAlready != null) {
          return apiResponse.validationErrorWithData(
            res,
            responseMessage.FOLDER_NAME_ALREADY
          );
        }
        let userFolders = await Folder.findAll({
          where: { designation_id: Userdata.designation_id, published: 1 },
          include: [
            {
              model: ColorCode,
              as: "Color",
            },
          ],
        });
        let usedColorCodesIds = [];
        userFolders.map((item) => {
          if(item.Color) usedColorCodesIds.push(item.Color.id);
        });

        let colorCodes = await ColorCode.findAll({
          attributes: ["id"],
          where: { id: { $notIn: usedColorCodesIds } },
        });

        const ramdomColorCode =
          colorCodes[Math.floor(Math.random() * colorCodes.length)];
        const color_code = ramdomColorCode ? ramdomColorCode.id : null;

        const addfolder = new Folder({
          name: body.name,
          designation_id: Userdata.designation_id,
          color_code,
        });
        addfolder
          .save()
          .then((folder) => {
            Folder.findAll({
              where: { id: folder.id, published: 1 },
              include: [
                {
                  model: ColorCode,
                  as: "Color",
                },
              ],
            }).then((newFolder) => {
              return apiResponse.successResponseWithData(
                res,
                responseMessage.ADD_FOLDER,
                newFolder
              );
            });
          })
          .catch((err) => {
            console.error(err);
            return apiResponse.ErrorResponse(res, err);
          });
      } catch (err) {
        console.log(err);
        return apiResponse.validationErrorWithData(res, err.message);
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

//folders list api
router.get("/getFoldersByuser", createLogs(getFolderByUserId), async (req, res, next) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      Folder.findAll({
        where: { designation_id: Userdata.designation_id, published: 1 },
        include: [
          {
            model: ColorCode,
            as: "Color",
          },
        ],
      })
        .then((folders) => {
          return apiResponse.successResponseWithData(
            res,
            responseMessage.FOLDERS_LIST,
            folders
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

//update folder api
router.put("/updateFolder/:folderId", createLogs(updateFolder), async (req, res, next) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const { body } = req;
      const updateFolderSchema = Joi.object({
        name: Joi.string().required(),
        designation_id: Joi.number().optional(),
        updatedAt: Joi.date().optional(),
      });
      const result = await updateFolderSchema.validateAsync(body);
      const { value, error } = result;
      const valid = error == null;
      let folderAlready = await Folder.findOne({
        where: {
          name: body.name,
          published: 1,
          designation_id: Userdata.designation_id,
        },
      });
      if (folderAlready && folderAlready != null) {
        return apiResponse.validationErrorWithData(
          res,
          responseMessage.FOLDER_NAME_ALREADY
        );
      }
      const updatedData = {
        name: body.name,
        updatedAt: new Date().toISOString(),
      };
      Folder.update(updatedData, { where: { id: req.params.folderId } })
        .then(function (folderUpdated) {
          return apiResponse.successResponse(
            res,
            responseMessage.FOLDER_UPDATED
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

//delete folder api
router.delete("/deleteFolder/:folderId", createLogs(deleteFolder), async (req, res, next) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      Folder.destroy({ where: { id: req.params.folderId } })
        .then(function () {
          UserMails.update(
            { folder: null },
            { where: { folder: req.params.folderId } }
          );
          return apiResponse.successResponse(
            res,
            responseMessage.FOLDER_DELETED
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
    return apiResponse.validationErrorWithData(res, err);
  }
});

module.exports = router;
