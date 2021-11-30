const express = require("express");
var router = express.Router();
const Joi = require("joi");
const userRole = require("../../utils/roles");
const apiResponse = require("../../utils/apiresponse");
const validator = require("express-joi-validation").createValidator({});
const responseMessage = require("../../utils/message");
const DB = require("../../models");
const mailMongoModel = require("../models/mongo/mailMongoModel");
var ObjectId = require("mongodb").ObjectID;
const { where } = require("sequelize");
const { exitOnError } = require("winston");
var Sequelize = require("sequelize");
let htmlTags = require("../../utils/htmlTags");
const mailSearchService = require("../services/mailSearching");
var base64ToImage = require("base64-to-image");
var fs = require("fs");
const { uploadToRemote } = require("../services/uploadServer");
const { Op } = require("sequelize");

//Get all mails api
router.get("/getAllMail", async (req, res, next) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const data = await mailSort(req.query, Userdata.designation_id);
      return apiResponse.successResponseWithData(
        res,
        responseMessage.MAIL_LIST,
        {
          data: data.mails,
          count: data.count,
          unreadCount: data.unreadCount,
        }
      );
    } else {
      return apiResponse.validationErrorWithData(
        res,
        responseMessage.UNAUTHORIZED_USER
      );
    }
  } catch (err) {
    console.log(err);
  }
});

//sort mails as per user requirement
const mailSort = async (sortBy, designation_id) => {
  isBranch = "branch" in sortBy;
  isOp = "op" in sortBy;
  iscreatedAt = "createdAt" in sortBy;
  var {
    pageNo = 1,
    size = 50,
    skip,
    limit,
    search_data,
    by_stations,
    is_sent,
    createdAt,
    op,
    branch,
    from_date,
    to_date,
    ...params
  } = sortBy;
  pageNo = sortBy.hasOwnProperty("pageNo") ? parseInt(sortBy.pageNo) : 1;
  size = sortBy.size ? parseInt(sortBy.size) : 50;
  if (pageNo <= 0) {
    pageNo = 1;
  }
  if (sortBy.limit) {
    limit = size = parseInt(sortBy.limit);
  } else {
    limit = size;
  }
  skip = size * (pageNo - 1);
  let whereData = {};
  for (const [key, value] of Object.entries(params)) {
    whereData[key] = value;
  }
  let mailIds = [];
  let search = {};
  let queryResponse;
  let hideStaions = await isPreferenceExist({
    designation_id: designation_id,
    category: "station",
    sub_category: "hide",
  });
  var hideArray = [];
  if (hideStaions) {
    if (hideStaions && hideStaions.p_value && hideStaions.p_value.length > 0) {
      hideArray = hideStaions.p_value.split(",").map(function (item) {
        return parseInt(item, 10);
      });
    }
  }
  let importantStaions = await isPreferenceExist({
    designation_id: designation_id,
    category: "station",
    sub_category: "important",
  });
  var impStationArray = [];
  if (importantStaions) {
    if (
      importantStaions &&
      importantStaions.p_value &&
      importantStaions.p_value.length > 0
    ) {
      impStationArray = importantStaions?.p_value
        .split(",")
        .map(function (item) {
          return parseInt(item, 10);
        });
    }
  }
  if(sortBy.hasOwnProperty("from_date") && sortBy.hasOwnProperty('to_date') && (sortBy.from_date.length ==10 || sortBy.to_date.length == 10)){
    whereData.createdAt = { $gte: from_date,  $lte: to_date }
  }
  if (whereData.is_read) {
    if (hideArray && hideArray.length > 0) {
      whereData.from = {
        [Op.and]: [{ [Op.notIn]: hideArray }],
      };
    }
    whereData.to = designation_id;
    search.from = designation_id;
    search.from_is_read = 0;
    var unreadCount = await DB.Mail.count({
      where: {
        [Op.or]: [whereData, search],
      },
    });
  } else {
    if (hideArray && hideArray.length > 0) {
      var unreadCount = await DB.Mail.count({
        where: {
          [Op.or]: [
            {
              from: {
                [Op.and]: [{ [Op.notIn]: hideArray }],
              },
              to: designation_id,
              is_read: 0,
            },
            { from: designation_id, from_is_read: 0 },
          ],
        },
      });
    } else {
      var unreadCount = await DB.Mail.count({
        where: {
          [Op.or]: [
            {
              to: designation_id,
              is_read: 0,
            },
            { from: designation_id, from_is_read: 0 },
          ],
        },
      });
    }
  }
  if (
    sortBy.search_data &&
    search_data.length > 0 &&
    sortBy.by_stations &&
    by_stations.length > 0
  ) {
    if (is_sent == 1) {
      whereData.from = designation_id;
      search.to = designation_id;
      search.sent_enabled = 1          //for search in sent folder with mongodb
    } else {
      whereData.to = designation_id; //for search in inbox folder with mongodb
    }
    mailIds = await searching(whereData, search, search_data);
    if (mailIds.length <= 0) {
      return (queryResponse = {
        count: 0,
        mails: [],
        unreadCount: unreadCount,
      });
    }
  }
  if (
    (sortBy.search_data && search_data.length > 0) ||
    (sortBy.by_stations && by_stations.length > 0)
  ) {
    //query for search in mongodb
    if (sortBy.search_data && search_data.length > 0) {
      if (is_sent == 1) {
        whereData.from = designation_id;
        search.to = designation_id;
        search.sent_enabled = 1    //for search in sent folder with mongodb
      } else {
        whereData.to = designation_id; //for search in inbox folder with mongodb
      }
      mailIds = await searching(whereData, search, search_data);
    }

    let byStationsArray = [];
    if (
      sortBy.by_stations &&
      by_stations.length > 0 &&
      sortBy.by_stations !== ""
    ) {
      byStationsArray = JSON.parse(by_stations);
    }
    if (mailIds.length > 0 || (byStationsArray && byStationsArray.length > 0)) {
      if (mailIds.length > 0 && !(byStationsArray.length > 0)) {
        //search in sent folder with mysqldb
        if (is_sent == 1) {
          whereData.document_id = { $in: mailIds };
        } else {
          whereData.document_id = { $in: mailIds };
        }
        if(sortBy.hasOwnProperty("from_date") && sortBy.hasOwnProperty('to_date') && (sortBy.from_date.length ==10 || sortBy.to_date.length == 10)){
          whereData.createdAt = { $gte: from_date,  $lte: to_date }
        }
        queryResponse = await getResultsOfSearching(
          search,
          whereData,
          skip,
          limit,
          mailIds
        );
      }
      //search with filter by station
      if (byStationsArray && byStationsArray.length > 0) {
        whereData.to = designation_id;
        whereData.source = { $in: byStationsArray };
        if (mailIds.length > 0) search.document_id = { $in: mailIds };
        if(sortBy.hasOwnProperty("from_date") && sortBy.hasOwnProperty('to_date') && (sortBy.from_date.length ==10 || sortBy.to_date.length == 10)){
          whereData.createdAt = { $gte: from_date,  $lte: to_date }
        }
        queryResponse = await searchMails(
          search,
          whereData,
          skip,
          limit,
          designation_id,
          impStationArray
        );
      }
    } else {
      queryResponse = {
        count: 0,
        mails: [],
      };
    }
    //Get all mails without search and filter
  } else {
    if (is_sent == 1) {
      whereData.from = designation_id;
      search.to = designation_id;
      search.sent_enabled = 1 //Get all mails for sent folder
    } else {
      whereData.to = designation_id; 
      //Get all mails for inbox folder
    }
    queryResponse = await getMailsWithoutSearchData(
      search,
      whereData,
      skip,
      limit,
      designation_id,
      impStationArray
    );
  }
  return { ...queryResponse, unreadCount };
};

//get user mails list from mysql
async function searchMails(
  search,
  whereData,
  skip,
  limit,
  designation_id,
  impStationArray
) {
  let _whereData = {}

  if ((Object.keys(whereData).length > 0) && (Object.keys(search).length > 0)) {
    _whereData = {
      [Op.or]: [whereData, search]
    }
  } else if (Object.keys(whereData).length > 0) {
    _whereData = {...whereData}
  }

  if (whereData.is_read && impStationArray.length > 0) {
    const count = await DB.Mail.count({
      where: {..._whereData},
    });
    const mails = await DB.Mail.findAll({
      where: {..._whereData},
      include: [
        {
          model: DB.Designation,
          as: "From",
        },
        {
          model: DB.Designation,
          as: "To",
        },
        {
          model: DB.Designation,
          as: "Source",
        },
        {
          model: DB.GeneralComments,
          as: "comments_data",
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(skip),
      order: [
        [
          Sequelize.literal(`CASE WHEN is_crashed = 1 THEN 1 ELSE 0 END`),
          "DESC",
        ],
        [Sequelize.fn("FIELD", Sequelize.col("Mail.from"), impStationArray)],
        ["updatedAt", "DESC"],
        [
          { model: DB.GeneralComments, as: "comments_data" },
          "createdAt",
          "DESC",
        ],
      ],
    });
    return { count, mails };
  } else {
    const count = await DB.Mail.count({
      where: {..._whereData},
    });
    const mails = await DB.Mail.findAll({
      where: {..._whereData},
      include: [
        {
          model: DB.Designation,
          as: "From",
        },
        {
          model: DB.Designation,
          as: "To",
        },
        {
          model: DB.Designation,
          as: "Source",
        },
        {
          model: DB.GeneralComments,
          as: "comments_data",
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(skip),
      order: [
        [
          Sequelize.literal(`CASE WHEN is_crashed = 1 THEN 1 ELSE 0 END`),
          "DESC",
        ],
        // [Sequelize.fn("FIELD", Sequelize.col("Mail.from"), stationIds)],
        ["updatedAt", "DESC"],
        [
          { model: DB.GeneralComments, as: "comments_data" },
          "createdAt",
          "DESC",
        ],
      ],
    });
    return { count, mails };
  }
}

//get user mails list from mysql
async function getMailsWithoutSearchData(
  search,
  whereData,
  skip,
  limit
) {
  const count = await DB.Mail.count({
    where: { [Op.or]: [whereData, search], },
    raw: true,
  });

  const mails = await DB.Mail.findAll({
    where: { [Op.or]: [whereData, search], },
    include: [
      {
        model: DB.Designation,
        as: "From",
      },
      {
        model: DB.Designation,
        as: "To",
      },
      {
        model: DB.Designation,
        as: "Source",
      },
      {
        model: DB.GeneralComments,
        as: "comments_data",
      },
    ],
    limit: parseInt(limit),
    offset: parseInt(skip),
    order: [
      [Sequelize.literal(`CASE WHEN is_crashed = 1 THEN 1 ELSE 0 END`), "DESC"],
      // [Sequelize.fn("FIELD", Sequelize.col("Mail.from"), stationIds)],
      ["updatedAt", "DESC"],
      [{ model: DB.GeneralComments, as: "comments_data" }, "createdAt", "DESC"],
    ],
  });
  return { count, mails };
}

//get searching results
const getResultsOfSearching = async (
  search,
  whereData,
  skip,
  limit,
  mailIds
) => {
  const count = await DB.Mail.count({
    where: {
      ...whereData,
    },
  });
  const mails = await DB.Mail.findAll({
    where: {
      ...whereData,
    },
    include: [
      {
        model: DB.Designation,
        as: "From",
      },
      {
        model: DB.Designation,
        as: "To",
      },
      {
        model: DB.Designation,
        as: "Source",
      },
      {
        model: DB.GeneralComments,
        as: "comments_data",
      },
    ],
    limit: parseInt(limit),
    offset: parseInt(skip),
    order: [
      // [Sequelize.fn("FIELD", Sequelize.col("document_id"), mailIds)],
      ["updatedAt", "DESC"],
      [{ model: DB.GeneralComments, as: "comments_data" }, "createdAt", "DESC"],
    ],
  });
  return { count, mails };
};

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+.,\\^$|#\s]/g, "\\$&");
}

//searching on mongodb
async function searching(whereData, search, searchData) {
  let allMails = await DB.Mail.findAll({
     where: {
        [Op.or]: [whereData, search],
      },
    attributes: ["document_id"],
    raw: true, // <--- HERE
  });
  var obj_ids = allMails.map(function (item) {
    return ObjectId(item.document_id);
  });
  let matchedHtmlTag;
  let searchDataArray = [];
  let userSearchData = searchData.split(",");
  var str = htmlTags.tags;
  userSearchData.map((v) => {
    const regex = new RegExp(escapeRegex(v), "gi");
    matchedHtmlTag = str.match(regex);
    if (matchedHtmlTag === null) {
      searchDataArray.push(v);
    }
  });
  let finalObj_ids;
  if (searchDataArray.length <= 0) {
    return (finalObj_ids = []);
  }
  let searchRegex = searchDataArray.join("|");
  finalObj_ids = await mailSearchService.multiKeywordsSearch(
    obj_ids,
    searchRegex
  );
  return finalObj_ids;
}

//mail detail api
router.get("/mailById/:mailId", async (req, res, next) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const mailData = await DB.Mail.findOne({
        where: { id: req.params.mailId, published: 1 },
        include: [
          {
            model: DB.Designation,
            as: "From",
          },
          {
            model: DB.Designation,
            as: "To",
          },
          {
            model: DB.Designation,
            as: "Source",
          },
          {
            model: DB.Folder,
            as: "Folder",
            include: [
              {
                model: DB.ColorCode,
                as: "Color",
              },
            ],
          },
        ],
      });
      let attachements = [];
      if (mailData.attachement_ids != null) {
        let attacid = mailData.attachement_ids.split(",");
        attachements = await DB.Attachement.findAll({
          where: { id: { $in: attacid } },
          order: [
            ["body_flag", "DESC"],
          ],
        });
      }
      const bodyData = await mailMongoModel.findOne({
        _id: ObjectId(mailData.document_id),
      });
      mailData.dataValues.attachements = attachements;
      return apiResponse.successResponseWithMultiData(
        res,
        responseMessage.MAIL_DATA,
        mailData,
        bodyData
      );
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
});

//update mail api
router.put("/update/:mailId", async (req, res, next) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const { body } = req;
      const updateFolderSchema = Joi.object({
        folder: Joi.optional(),
        is_starred: Joi.number().optional(),
        is_read: Joi.number().optional(),
        from_is_read: Joi.optional(),
        is_crashed: Joi.optional(),
        is_read_enabled: Joi.optional(),
        from_read_enabled: Joi.optional(),
      });
      const result = await updateFolderSchema.validateAsync(body);
      const { value, error } = result;
      const valid = error == null;
      const queryData = {};
      Object.entries(body).forEach(([key, value]) => {
        queryData[key] = value;
      });
      // queryData.updatedAt = new Date().toISOString(),
      DB.Mail.update(queryData, { where: { id: req.params.mailId } })
        .then(function (mailUpdated) {
          return apiResponse.successResponse(res, responseMessage.MAIL_UPDATED);
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

const isPreferenceExist = async (whereData) => {
  return await DB.userPreferences.findOne({
    where: whereData,
    raw: true,
    attributes: ["p_value"],
  });
};

router.post("/composeMail", async (req, res) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const { body } = req;
      const composeSchema = Joi.object({
        to: Joi.number().required(),
        from: Joi.number().required(),
        subject: Joi.string().required(),
        bodyData: Joi.string().required(),
        op: Joi.string().optional(),
        source:Joi.number().optional(),
        attachement_ids: Joi.string().optional(),
      });
      const result = await composeSchema.validateAsync(body);
      const { value, error } = result;
      const valid = error == null;
      let mongoObject = composeMailMongoParams(body);
      let mongoMail = new mailMongoModel(mongoObject);
      let documentCreated = await mongoMail.save();
      let mysqlObject = composeMailSqlParams(body, documentCreated._id);
      mysqlObject.from_is_read = 1;
      let Mail = new DB.Mail(mysqlObject);
      let mailSent = await Mail.save();
      return apiResponse.successResponseWithData(
        res,
        responseMessage.MAIL_SENT,
        mailSent
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

const addNewMail = async (body) => {
  try {
    const mailParams = createMailParams(body);
    const newmailData = await DB.Mail.create(mailParams);
    return newmailData;
  } catch (err) {
    console.log(err);
  }
};

const createMailParams = (body) => {
  return {
    to: body.to,
    from: body.from,
    op: body.op,
    source:body.source,
    subject: body.subject,
    document_id: body.document_id,
    is_read: 0,
    from_is_read: 1,
    is_starred: 0,
    is_crashed: null,
    folder: null,
    annotation_ids: body.annotation_ids,
    published: 1,
    attachement_ids: body.attachement_ids,
    gen_comm_ids: body.gen_comm_ids ? body.gen_comm_ids : null,
  };
};

const getMail = async (whereData) => {
  try {
    return await DB.Mail.findOne({
      where: whereData,
      raw: true,
    });
  } catch (err) {
    console.log(err);
  }
};

const updateMail = async (queryData, whereData) => {
  return DB.Mail.update(queryData, {
    where: whereData,
  });
};

const uploadImagesToDataServer = async (base64,image_extention) => {
  var base64Str = base64;
  var path1 = `/assets/attachments/`;
  const optionalObj = {
    fileName: `img-${new Date().getTime()}.${image_extention}`,
    type: image_extention,
  };

  const imageInfo = base64ToImage(base64Str, "." + path1, optionalObj);
  let localpath = process.cwd() + path1;
  uploadToRemote(
    optionalObj.fileName,
    localpath,
    process.env.DATA_SERVER_ROOT_PATH + process.env.DATA_SERVER_IMG_LOC,
    (res) => {
      dest = "." + path1 + optionalObj.fileName;
      // fs.unlinkSync(dest);
      if (res) {
        //return imageInfo;
      } else {
        //return {};
      }
    }
  );
  return imageInfo;
};

const composeMailSqlParams = (body, documentCreatedId) => {
  return {
    to: body.to,
    from: body.from,
    source:body.from,
    subject: body.subject,
    op: body.op,
    attachement_ids: body.attachement_ids,
    document_id: documentCreatedId.toString(),
  };
};

const composeMailMongoParams = (body) => {
  return {
    body: body.bodyData,
    subject: body.subject,
    op: body.op,
  };
};

router.post("/uploadBodyImage", async (req, res) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const { body } = req;
      const uploadImage = Joi.object({
        image_base64: Joi.string().required(),
        image_extention:Joi.optional(),
      });
      const result = await uploadImage.validateAsync(body);
      const { value, error } = result;
      const valid = error == null;
      const imageObject = await uploadImagesToDataServer(body.image_base64,body.image_extention);
      if (imageObject.hasOwnProperty("fileName")) {
        imageObject.url =
          process.env.DATA_SERVER_PROTOCOL +
          process.env.DATA_SERVER_CRED_root_IP +
          process.env.DATA_SERVER_IMG_LOC +
          imageObject.fileName;
        return apiResponse.successResponseWithData(
          res,
          responseMessage.IMAGE_UPLOAD,
          imageObject
        );
      } else {
        return apiResponse.validationErrorWithData(res, "Server error");
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

//update mail api
router.put("/bulkUpdate", async (req, res, next) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const { body } = req;
      const updateFolderSchema = Joi.object({
        mail_ids: Joi.array().optional(),
        action: Joi.object().optional(),
      });
      const result = await updateFolderSchema.validateAsync(body);
      const { value, error } = result;
      const valid = error == null;
  
      await updateMail(body.action, { id: { [Op.in]: body.mail_ids } });

      return apiResponse.successResponse(res, responseMessage.MAIL_UPDATED);
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

module.exports = { router, addNewMail, getMail, updateMail };
