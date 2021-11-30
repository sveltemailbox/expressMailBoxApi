const express = require("express");
var router = express.Router();
const Joi = require("joi");
const userRole = require("../../utils/roles");
const apiResponse = require("../../utils/apiresponse");
const responseMessage = require("../../utils/message");
const DB = require("../../models");
const { Annotations, ColorCode } = require("../../models");
const { Op } = require("sequelize");
const { createLogs } = require("../services/logsService");
const { addAnnotation, getAnnotation, updateAnnotation, deleteAnnotation } = require("../../utils/logData");

//add annotaion api
router.post("/", createLogs(addAnnotation), async (req, res, next) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const { body } = req;
      const annotationSchema = Joi.object({
        anno_text: Joi.string().required(),
        start_char: Joi.number().required(),
        end_char: Joi.number().required(),
        degn_id: Joi.number().optional(),
        color_code_id: Joi.number().required(),
        prev_ann_id: Joi.optional(),
        mailid: Joi.number().required(),
        anno_comment: Joi.string().optional(),
        mainMailId: Joi.number().optional(),
      });
      const result = await annotationSchema.validateAsync(body);
      const { value, error } = result;
      const valid = error == null;
      const annotaion = new Annotations({
        ...body,
        degn_id: Userdata.designation_id,
      });
      annotaion
        .save()
        .then(async (annotaion) => {
          let annotationMapParams = {
            mail_id: req.body.mainMailId,
            anno_id: annotaion.id,
            prev_anno_id: null,
            user: Userdata.designation_id,
          };

          await DB.CommentMap.create(annotationMapParams);

          return apiResponse.successResponseWithData(
            res,
            responseMessage.ADD_ANNOTATION,
            annotaion
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

//get annotations api
router.get("/", createLogs(getAnnotation), async (req, res, next) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      // let annotations = await getMailwithAnnotations({ id: req.query.mailid });
      const {start, end} = req.query;

      const annotaions = await DB.CommentMap.findAll({
        where: {
          mail_id: req.query.mailid,
          user: Userdata.designation_id,
        },
        raw: true,
      });

      let allAnnotationId = [];
      annotaions.forEach((item, index) => {
        if (item.anno_id) {
          allAnnotationId.push(item.anno_id);
        }
        if (item.prev_anno_id) {
          allAnnotationId.push(...item.prev_anno_id.split(","));
        }
      });

      let uniqueAnnotationId = [...new Set(allAnnotationId)];

      let whereQuery = {
        id: { $in: uniqueAnnotationId }, 
        published: 1,
      }
      if(start && end){
        whereQuery.start_char= start;
        whereQuery.end_char= end
      }

      const allAnnotations = await DB.Annotations.findAll({
        where: whereQuery,
        include: [
          {
            model: DB.Designation,
            attributes: ["id", "branch", "designation", "user_id"],
            as: "anno_from",
          },
          {
            model: DB.ColorCode,
            as: "Color",
          },
        ],
      });
      return apiResponse.successResponseWithData(
        res,
        responseMessage.ANNOTATION_LIST,
        allAnnotations
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

const getLastAnnotaion = async (whereData) => {
  return await Annotations.findOne({
    where: {
      ...whereData,
      published: 1,
    },
    order: [["createdAt", "DESC"]],
    raw: true,
  });
};

const getMailwithAnnotations = async (whereData) => {
  return await DB.Mail.findOne({
    where: whereData,
    include: [
      {
        model: DB.Annotations,
        as: "annotation_data",
        include: [
          {
            model: DB.Designation,
            attributes: ["id", "branch", "designation", "user_id"],
            as: "anno_from",
          },
          {
            model: DB.ColorCode,
            as: "Color",
          },
        ],
      },
    ],
    order: [
      [{ model: DB.Annotations, as: "annotation_data" }, "createdAt", "DESC"],
    ],
  });
};

router.post("/addAttAnnotation", createLogs(addAnnotation), async (req, res, next) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const { body } = req;
      const annotationSchema = Joi.object({
        anno_text: Joi.string().required(),
        start_char: Joi.number().required(),
        end_char: Joi.number().required(),
        degn_id: Joi.number().required(),
        color_code_id: Joi.number().required(),
        att_id: Joi.number().required(),
        prev_ann_id: Joi.optional(),
        mailid: Joi.number().required(),
        anno_comment: Joi.string().optional(),
      });
      const result = await annotationSchema.validateAsync(body);
      const { value, error } = result;
      const valid = error == null;
      const annotaion = new Annotations(req.body);
      annotaion
        .save()
        .then((annotaion) => {
          return apiResponse.successResponseWithData(
            res,
            responseMessage.ADD_ANNOTATION,
            annotaion
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

const getLastAttAnnotaion = async (whereData) => {
  return await Annotations.findOne({
    where: { ...whereData, published: 1 },
    order: [["createdAt", "DESC"]],
    raw: true,
  });
};

/** Update Api for annotation */
router.put("/:id", createLogs(updateAnnotation), async (req, res) => {
  try {
    const { body } = req;
    const userData = req.Userdata;
    const annotationSchema = Joi.object({
      anno_text: Joi.string().optional(),
      start_char: Joi.number().optional(),
      end_char: Joi.number().optional(),
      degn_id: Joi.number().optional(),
      color_code_id: Joi.number().optional(),
      prev_ann_id: Joi.optional(),
      mailid: Joi.number().required(),
      anno_comment: Joi.string().optional(),
      id: Joi.number().required(),
      enb_sent: Joi.number().optional(),
    });
    const result = await annotationSchema.validateAsync(body);
    const { value, error } = result;
    const valid = error == null;

    const whereData = {
      degn_id: userData.designation_id,
      mailid: body.mailid,
      id: req.params.id,
      enb_sent: 0,
    };

    await updateAttAnnotaion(body, whereData);

    apiResponse.successResponse(res, responseMessage.ANN_UPDATES);
  } catch (err) {
    console.log(err);
    return apiResponse.validationErrorWithData(res, err.details[0].message);
  }
});

const updateAttAnnotaion = async (updateData, whereData) => {
  return await Annotations.update(updateData, {
    where: whereData,
  });
};

/** Delete Api for annotation */
router.delete("/:id", createLogs(deleteAnnotation), async (req, res) => {
  try {
    const { body } = req;
    const userData = req.Userdata;
    const annotationSchema = Joi.object({
      degn_id: Joi.number().optional(),
      mailid: Joi.number().required(),
      id: Joi.number().required(),
    });
    const result = await annotationSchema.validateAsync(body);
    const { value, error } = result;
    const valid = error == null;

    const whereData = {
      degn_id: userData.designation_id,
      mailid: body.mailid,
      id: req.params.id,
      enb_sent: 0,
    };
    await updateAttAnnotaion({ published: 0 }, whereData);

    apiResponse.successResponse(res, responseMessage.ANN_DELETE);
  } catch (err) {
    console.log(err);
    return apiResponse.validationErrorWithData(res, err.details[0].message);
  }
});

/** Delete Api for annotation with start and end char */
router.delete("/", createLogs(deleteAnnotation), async (req, res) => {
  try {
    const { body } = req;
    const userData = req.Userdata;
    const annotationSchema = Joi.object({
      degn_id: Joi.number().optional(),
      mailid: Joi.number().required(),
      mainMailId: Joi.number().required(),
      start_char: Joi.number().optional(),
      end_char: Joi.number().optional(),
    });
    const result = await annotationSchema.validateAsync(body);
    const { value, error } = result;
    const valid = error == null;

    const whereData = {
      degn_id: userData.designation_id,
      mailid: body.mailid,
      start_char: body.start_char,
      end_char: body.end_char,
      enb_sent: 0,
    };
    await updateAttAnnotaion({ published: 0 }, whereData);

    apiResponse.successResponse(res, responseMessage.ANN_DELETE);
  } catch (err) {
    console.log(err);
    return apiResponse.validationErrorWithData(res, err.details[0].message);
  }
});

module.exports = { router, updateAttAnnotaion };
