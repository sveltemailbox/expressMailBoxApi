const express = require("express");
const router = express.Router();
const userRole = require("../../utils/roles");
const apiResponse = require("../../utils/apiresponse");
const DB = require("../../models");
const responseMessage = require("../../utils/message");
const Joi = require("joi");
const { Op } = require("sequelize");
const { createLogs } = require("../services/logsService");
const { createLeave, updateLeave, getLeave } = require("../../utils/logData");

router.post("/", createLogs(createLeave), async (req, res, next) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const leaveSchema = Joi.object({
        receiver: Joi.number().required(),
        leave_from: Joi.date().required(),
        leave_to: Joi.date().required(),
      });
      await leaveSchema.validateAsync(req.body);
      const createBody = {
        ...req.body,
        forwarder: Userdata.designation_id,
        is_active : 1
      };

      let newLeave = await DB.Leave.create(createBody);
      newLeave = await DB.Leave.find({
        where: { id: newLeave.id },
        include: [
          {
            model: DB.Designation,
            as: "Forwarder",
          },
          {
            model: DB.Designation,
            as: "Receiver",
          },
        ],
      });
      return apiResponse.successResponseWithData(
        res,
        responseMessage.LEAVE_CREATE,
        newLeave
      );
    }
    return apiResponse.validationErrorWithData(
      res,
      responseMessage.UNAUTHORIZED_USER
    );
  } catch (err) {
    console.log(err);
    return apiResponse.validationErrorWithData(res, err.details[0].message);
  }
});

router.put("/", createLogs(updateLeave), async (req, res, next) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const leaveSchema = Joi.object({
        leave_id: Joi.number().required(),
      });
      await leaveSchema.validateAsync(req.body);

      const currentDate = new Date();
      const date = currentDate
        .toLocaleDateString()
        .split("/")
        .reverse()
        .join("-");
      const time = currentDate.toLocaleTimeString();
      const dateTime = date + " " + time;

      let getLeave = await DB.Leave.find({
        where: { id: req.body.leave_id },
        raw:true
      });

      if(!getLeave){
        return apiResponse.successResponse(
          res,
          "Leave id does not exist",
        );
      }

      await DB.Leave.update(
        { leave_to: dateTime,is_active:0 },
        { where: { id: req.body.leave_id } }
      );

      const updatedLeave = await DB.Leave.find({
        where: { id: req.body.leave_id },
        include: [
          {
            model: DB.Designation,
            as: "Forwarder",
          },
          {
            model: DB.Designation,
            as: "Receiver",
          },
        ],
      });

      const mails = await DB.UserMails.findAll({
        where: {
          [Op.and]: [
            {to: updatedLeave.receiver}, 
            {
              [Op.and]: [
                { createdAt: { $lte: updatedLeave.leave_to } },
                { createdAt: { $gte: updatedLeave.leave_from } },
              ],
            }
          ]
        },
        attributes: ["to", "leave_mail", "from_action"],
        raw: true,
      });
      mails.forEach(async(item)=>{
        await DB.UserMails.update(
          { from_action: item.from_action, from_read_mail: item.from_read_mail, from_folder: item.from_folder },
          { where: { id: item.leave_mail } }
        );
      })
      return apiResponse.successResponseWithData(
        res,
        responseMessage.LEAVE_UPDATED,
        updatedLeave
      );
    }
    return apiResponse.validationErrorWithData(
      res,
      responseMessage.UNAUTHORIZED_USER
    );
  } catch (err) {
    console.log(err);
    return apiResponse.validationErrorWithData(res, err.details[0].message);
  }
});

router.get("/", createLogs(getLeave), async (req, res, next) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const leaves = await DB.Leave.findOne({
        where: { 
          forwarder: Userdata.designation_id,
          is_active : 1
        },
        include: [
          {
            model: DB.Designation,
            as: "Forwarder",
          },
          {
            model: DB.Designation,
            as: "Receiver",
          },
        ],
        order: [
          ["id", "DESC"],
        ]
      });
      return apiResponse.successResponseWithData(
        res,
        responseMessage.LEAVE_FOUND,
        leaves
      );
    }
    return apiResponse.validationErrorWithData(
      res,
      responseMessage.UNAUTHORIZED_USER
    );
  } catch (err) {
    console.log(err);
    return apiResponse.validationErrorWithData(res, err.details[0].message);
  }
});

module.exports = router;
