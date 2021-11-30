"use strict"
const express = require("express");
var router = express.Router();
const Joi = require("joi");
const userRole = require("../../utils/roles");
const apiResponse = require("../../utils/apiresponse");
const validator = require("express-joi-validation").createValidator({});
const responseMessage = require("../../utils/message");
const DB = require("../../models");
const mailMongoModel = require("../models/mongo/mailMongoModel");
const ObjectId = require("mongodb").ObjectID;
const { where } = require("sequelize");
const { exitOnError } = require("winston");
var Sequelize = require("sequelize");
let htmlTags = require("../../utils/htmlTags");
const mailSearchService = require("../services/mailSearching");
var base64ToImage = require("base64-to-image");
var fs = require("fs");
const { uploadToRemote } = require("../services/uploadServer");
const { Op } = require("sequelize");
const mailAction = require("../../utils/contants");
const MOMENT= require('moment')
const { unread } = require("../../utils/contants");
const { createLogs } = require("../services/logsService");
const { getAllMail, getMailById, updateMail, composeMail, updateUserMails, getUserStations, bulkUpdate, uploadBodyImage } = require("../../utils/logData");

//get All Mails 
router.get("/getAllMail", createLogs(getAllMail), async (req, res, next) => {
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
    mail_action,
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
  if (
    sortBy.hasOwnProperty("from_date") &&
    sortBy.hasOwnProperty("to_date") &&
    (sortBy.from_date.length == 10 || sortBy.to_date.length == 10)
  ) {
    whereData.createdAt = { $gte: from_date, $lte: to_date };
  }

  if (whereData.mail_action === mailAction.Unread) {
    // 69
    whereData.to = designation_id;
    whereData.mail_action = { $in: mailAction.unread }; // '69','79','86','89','97','99'
  } else if (whereData.mail_action === mailAction.Starred) {
    // 77
    whereData.to = designation_id;
    whereData.mail_action = { $in: mailAction.starred }; // '77','78','79','86','87','96','97'
  } else if (whereData.mail_action === mailAction.Crashed) {
    //95
    whereData.to = designation_id;
    whereData.mail_action = { $in: mailAction.crashed }; // '95','96','97','98','99'
  }
  //check mail action is 69
  let readWhereData = {},
    readSearchData = {};
  if (mail_action == mailAction.Unread) {
    whereData.to = designation_id;
    whereData.mail_action = { $in: mailAction.unread };
    whereData.is_read_mail = 0;
    search.from = designation_id;
    search.from_action = { $in: mailAction.unread };
    search.from_read_mail = 0;

    // start condition for show read data

    readWhereData.mail_action = { $in: mailAction.archives };
    readWhereData.is_read_mail = 1;
    readWhereData.to = designation_id;

    readSearchData.from_action = { $in: mailAction.archives };
    readSearchData.from_read_mail = 1;
    readSearchData.from = designation_id;

    // end condition for show read data
  }

  // search.from = designation_id;
  if (sortBy.mail_action === mailAction.Unread) {
    if (hideArray && hideArray.length > 0) {
      whereData.from = {
        [Op.and]: [{ [Op.notIn]: hideArray }],
      };
    }
    whereData.to = designation_id;
    search.from = designation_id;

    var unreadCount = await DB.UserMails.count({
      where: {
        [Op.or]: [whereData, search],
      },
      // group: ['user_mail_id'],
    });
  } else {
    if (hideArray && hideArray.length > 0) {
      var unreadCount = await DB.UserMails.count({
        where: {
          [Op.or]: [
            {
              from: {
                [Op.and]: [{ [Op.notIn]: hideArray }],
              },
              to: designation_id,
              mail_action: { $in: mailAction.unread },
            },
          ],
        },
        // group: ['user_mail_id'],
      });
    } else {
      var unreadCount = await DB.UserMails.count({
        where: {
          [Op.or]: [
            {
              to: designation_id,
              mail_action: { $in: mailAction.unread },
            },
          ],
        },
        // group: ['user_mail_id'],
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
      // whereData.from = designation_id;
      whereData.from = designation_id;
      search.to = designation_id;
      search.sent_enabled = 1;
      //for search in sent folder with mongodb
    } else {
      whereData.to = designation_id; //for search in inbox folder with mongodb
    }
    mailIds = await searching(
      whereData,
      search,
      search_data,
      readWhereData,
      readSearchData
    );
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
        search.sent_enabled = 1;
      } else {
        whereData.to = designation_id; //for search in inbox folder with mongodb
      }
      mailIds = await searching(
        whereData,
        search,
        search_data,
        readWhereData,
        readSearchData
      );
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
          // whereData.document_id = { $in: mailIds };
        } else {
          // whereData.document_id = { $in: mailIds };
        }
        if (
          sortBy.hasOwnProperty("from_date") &&
          sortBy.hasOwnProperty("to_date") &&
          (sortBy.from_date.length == 10 || sortBy.to_date.length == 10)
        ) {
          whereData.createdAt = { $gte: from_date, $lte: to_date };
        }
        queryResponse = await getResultsOfSearching(
          search,
          whereData,
          skip,
          limit,
          mailIds,
          readWhereData,
          readSearchData
        );
      }
      //search with filter by station
      if (byStationsArray && byStationsArray.length > 0) {
        whereData.to = designation_id;
        // whereData.source = { $in: byStationsArray };
        if (mailIds.length > 0) search.document_id = { $in: mailIds };
        if (
          sortBy.hasOwnProperty("from_date") &&
          sortBy.hasOwnProperty("to_date") &&
          (sortBy.from_date.length == 10 || sortBy.to_date.length == 10)
        ) {
          whereData.createdAt = { $gte: from_date, $lte: to_date };
        }
        queryResponse = await searchMails(
          search,
          whereData,
          skip,
          limit,
          designation_id,
          impStationArray,
          sortBy,
          byStationsArray,
          readWhereData,
          readSearchData
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
      search.sent_enabled = 1;
      // search.to = designation_id;
      // search.sent_enabled = 1; //Get all mails for sent folder
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
      impStationArray,
      sortBy,
      readWhereData,
      readSearchData
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
  impStationArray,
  sortBy,
  byStationsArray,
  readWhereData,
  readSearchData
) {
  let _whereData = {};

  // start condition for show read data and merge into whereData as well as searchData
  const readWhereDataCondition = { [Op.or]: [whereData, readWhereData] };
  const readSearchDataCondition = { [Op.or]: [search, readSearchData] };
  // end condition for show read data

  if (Object.keys(whereData).length > 0 && Object.keys(search).length > 0) {
    _whereData = {
      [Op.or]: [readWhereDataCondition, readSearchDataCondition],
    };
  } else if (Object.keys(whereData).length > 0) {
    _whereData = { ...whereData };
  }

  if (sortBy.mailAction == mailAction.Unread && impStationArray.length > 0) {
    const count = await DB.UserMails.count({
      where: { ..._whereData },
      // group: ['user_mail_id'],
    });

    const mails = await DB.UserMails.findAll({
      //     attributes: {
      //     include: [[Sequelize.fn("COUNT", Sequelize.col("UserMails.user_mail_id")), "mailCount"]]
      //  },
      where: { ..._whereData },
      // group: ['user_mail_id'],

      include: [
        {
          model: DB.Mail,
          where: { source: { $in: byStationsArray } },
          include: [
            {
              model: DB.Designation,
              as: "Source",
            },
          ],
        },
        {
          model: DB.Designation,
          as: "From",
        },
        {
          model: DB.Designation,
          as: "To",
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
          Sequelize.literal(
            `CASE WHEN mail_action = '95' THEN '95' ELSE '0' END`
          ),
          "DESC",
        ],
        // [Sequelize.fn("FIELD", Sequelize.col("Mail.from"), impStationArray)],
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
    const mails = await DB.UserMails.findAll({
      attributes: {
        include: [
          [
            Sequelize.fn("COUNT", Sequelize.col("UserMails.user_mail_id")),
            "mailCount",
          ],
        ],
      },
      where: { ..._whereData },
      group: ["user_mail_id"],
      include: [
        {
          model: DB.Mail,
          where: { source: { $in: byStationsArray } },
          include: [
            {
              model: DB.Designation,
              as: "Source",
            },
          ],
        },
        {
          model: DB.Designation,
          as: "From",
        },
        {
          model: DB.Designation,
          as: "To",
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
          Sequelize.literal(
            `CASE WHEN mail_action = '95' THEN '95' ELSE '0' END`
          ),
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
    const count = mails.length;
    return { count, mails };
  }
}

//get user mails list from mysql
async function getMailsWithoutSearchData(
  search,
  whereData,
  skip,
  limit,
  designation_id,
  impStationArray,
  sortBy,
  readWhereData,
  readSearchData
) {
  // start condition for show read data and merge into whereData as well as searchData
  const readWhereDataCondition = { [Op.or]: [whereData, readWhereData] };
  const readSearchDataCondition = { [Op.or]: [search, readSearchData] };
  // end condition for show read data

  if (sortBy.mailAction == mailAction.Unread && impStationArray.length > 0) {
    const mails = await DB.UserMails.findAll({
      //   attributes: {
      //     include: [[Sequelize.fn("COUNT", Sequelize.col("UserMails.user_mail_id")), "mailCount"]]
      //  },
      where: { [Op.or]: [readWhereDataCondition, readSearchDataCondition] },
      // group: ['user_mail_id'],
      include: [
        {
          model: DB.Mail,
          include: [
            {
              model: DB.Designation,
              as: "Source",
            },
          ],
        },
        {
          model: DB.Designation,
          as: "From",
        },
        {
          model: DB.Designation,
          as: "To",
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
          Sequelize.literal(
            `CASE WHEN mail_action = '95' THEN '95' ELSE '0' END`
          ),
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
    const count = mails.length;
    return { count, mails };
  } else {
    const mails = await DB.UserMails.findAll({
      attributes: {
        include: [
          [
            Sequelize.fn("COUNT", Sequelize.col("UserMails.user_mail_id")),
            "mailCount",
          ],
        ],
      },
      where: { [Op.or]: [readWhereDataCondition, readSearchDataCondition] },
      group: ["user_mail_id"],
      include: [
        {
          model: DB.Mail,
          include: [
            {
              model: DB.Designation,
              as: "Source",
            },
          ],
        },
        {
          model: DB.Designation,
          as: "From",
        },
        {
          model: DB.Designation,
          as: "To",
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
          Sequelize.literal(
            `CASE WHEN mail_action = '95' THEN '95' ELSE '0' END`
          ),
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
    const count = mails.length;
    return { count, mails };
  }
}

//get searching results
const getResultsOfSearching = async (
  search,
  whereData,
  skip,
  limit,
  mailIds
) => {
  const mails = await DB.UserMails.findAll({
    attributes: {
      include: [
        [
          Sequelize.fn("COUNT", Sequelize.col("UserMails.user_mail_id")),
          "mailCount",
        ],
      ],
    },
    where: {
      ...whereData,
    },
    group: ["user_mail_id"],
    include: [
      {
        model: DB.Mail,
        where: { document_id: { $in: mailIds } },
        include: [
          {
            model: DB.Designation,
            as: "Source",
          },
        ],
      },
      {
        model: DB.Designation,
        as: "From",
      },
      {
        model: DB.Designation,
        as: "To",
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
        Sequelize.literal(
          `CASE WHEN mail_action = '95' THEN '95' ELSE '0' END`
        ),
        "DESC",
      ],
      ["updatedAt", "DESC"],
      [{ model: DB.GeneralComments, as: "comments_data" }, "createdAt", "DESC"],
    ],
  });
  const count = mails.length;
  return { count, mails };
};

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+.,\\^$|#\s]/g, "\\$&");
}

//searching on mongodb
async function searching(whereData, search, searchData) {
  let allMails = await DB.UserMails.findAll({
    where: {
      [Op.or]: [whereData, search],
      [Op.or]: [a, b],
    },
    include: [
      {
        model: DB.Mail,
        include: [
          {
            model: DB.Designation,
            as: "Source",
          },
        ],
      },
    ],
    // raw: true, // <--- HERE
  });
  var obj_ids = allMails.map(function (item) {
    let itemData = item;
    return ObjectId(itemData?.Mail?.document_id);
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

const isPreferenceExist = async (whereData) => {
  return await DB.userPreferences.findOne({
    where: whereData,
    raw: true,
    attributes: ["p_value"],
  });
};

router.get("/mailById/:mailId", createLogs(getMailById), async (req, res, next) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const mailData = await DB.UserMails.findOne({
        where: { id: req.params.mailId },
        include: [
          {
            model: DB.Mail,
            include: [
              {
                model: DB.Designation,
                as: "Source",
              },
            ],
          },
          {
            model: DB.Designation,
            as: "From",
          },
          {
            model: DB.Designation,
            as: "To",
          },
          {
            model: DB.Folder,
            as: "ToFolder",
            include: [
              {
                model: DB.ColorCode,
                as: "Color",
              },
            ],
          },
          {
            model: DB.Folder,
            as: "FromFolder",
            include: [
              {
                model: DB.ColorCode,
                as: "Color",
              },
            ],
          },
        ],
      });

      let attachmentData = [];
      if (mailData?.attachement_ids != null) {
        let attacid = mailData.attachement_ids.split(",");
        attachmentData = await DB.Attachement.findAll({
          where: { id: { $in: attacid } },
          order: [["body_flag", "DESC"]],
        });
      }
      const bodyData = await mailMongoModel.findOne(
        {
          _id: ObjectId(mailData?.Mail?.document_id),
        },
        { body_text: 0 }
      );
      return apiResponse.successResponseWithMultiData(
        res,
        responseMessage.MAIL_DATA,
        mailData,
        attachmentData,
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

router.put("/update/:mailId", createLogs(updateMail), async (req, res, next) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const { body } = req;
      const updateFolderSchema = Joi.object({
        folder: Joi.optional(),
        mail_action: Joi.number().optional(),
        is_read_mail: Joi.number().optional(),
        from_read_mail: Joi.number().optional(),
        from_action: Joi.number().optional(),
      });
      const result = await updateFolderSchema.validateAsync(body);
      const { value, error } = result;
      const valid = error == null;
      const array_concat_user_mail_ids = req.params.mailId.split(",");
      const singleId = array_concat_user_mail_ids[0];
      const queryData = {};
      Object.entries(body).forEach(([key, value]) => {
        queryData[key] = value;
      });
      if ("folder" in queryData) {
        const getMailsId = await DB.UserMails.findOne({
          where: {
            id: singleId
          },
          raw: true,
          attributes: ["id", "user_mail_id", "to", "from"],
        });

        if (getMailsId) {
          if (
            queryData.folder === null ||
            queryData.folder === "NULL" ||
            queryData.folder === "null"
          ) {
            if (getMailsId.to == Userdata.designation_id) {
              queryData["to_folder"] = null;
            } else if (getMailsId.from == Userdata.designation_id) {
              queryData["from_folder"] = null;
            }
          } else {
            if (getMailsId.to == Userdata.designation_id) {
              queryData["to_folder"] = queryData.folder;
            } else if (getMailsId.from == Userdata.designation_id) {
              queryData["from_folder"] = queryData.folder;
            }
          }
        }
        delete queryData["folder"]; // delete folder key from object
      }

      if('is_read_mail' in queryData || 'from_read_mail' in queryData){
        // update updatedAt in general comment table
        const getUserMails = await DB.UserMails.findOne({
          where: {id: singleId},
          attributes:['user_mail_id','id','mail_read_time']
        });
        if(getUserMails){
          let updateQuery = {};
          if(getUserMails.dataValues.mail_read_time === null){
            queryData['mail_read_time'] = MOMENT().format( 'YYYY-MM-DD  HH:mm:ss.000' );

            DB.UserMails.update(
              queryData, 
              { 
                where: 
                { 
                  id: singleId 
                } ,
                raw : true
              });
              // same mail send to another user
               DB.GeneralComments.findOne({
                where: { 
                  umail_id: singleId,
                  is_read: 0,
                  to : Userdata.designation_id
                },
                attributes:['id','prev_com_id']
              })
              .then((data)=>{
                updateQuery = {
                  updatedAt : MOMENT().format( 'YYYY-MM-DD  HH:mm:ss.000' ),
                  is_read : 1
                }
                whereQuery =  {
                  umail_id: singleId,
                  is_read  : 0 
                }
                updateGCmail(updateQuery, whereQuery);
              })            
          }else{
            DB.GeneralComments.findOne({
              where: { 
                umail_id: singleId,
                is_read: 0,
                to : Userdata.designation_id
              },
              attributes:['id','prev_com_id'],
            })
            .then((getCommentData) => {
              if(getCommentData != null){
                updateQuery = {
                  updatedAt : MOMENT().format( 'YYYY-MM-DD  HH:mm:ss.000' ),
                  is_read : 1
                }
                whereQuery =  {
                  umail_id: singleId,
                  is_read  : 0 
                }
                updateGCmail(updateQuery, whereQuery);
              }
            })
          }
        }
        else{
          console.log('No GC Avaibale')
        }
      }

      DB.UserMails.update(queryData, { where: { id: { [Op.in]: array_concat_user_mail_ids } }})
        .then(function () {
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
    return apiResponse.validationErrorWithData(res, err.message);
  }
});


router.post("/composeMail", createLogs(composeMail), async (req, res) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const { body } = req;
      const composeSchema = Joi.object({
        to: Joi.array().required(),
        from: Joi.number().required(),
        subject: Joi.string().required(),
        bodyData: Joi.string().required(),
        op: Joi.string().optional(),
        source: Joi.number().optional(),
        attachement_ids: Joi.string().optional(),
      });

      const result = await composeSchema.validateAsync(body);
      const { value, error } = result;
      const valid = error == null;
      let mongoObject = composeMailMongoParams(body);
      let mongoMail = new mailMongoModel(mongoObject);
      let documentCreated = await mongoMail.save();
      let mysqlObject = composeMailSqlParams(body, documentCreated?._id);

      let Mail = new DB.Mail(mysqlObject);
      let mailSent = await Mail.save();
      let UserMail;
      let mailData = [];
      const currentDate = new Date();
      const date = currentDate.toLocaleDateString().split("/").reverse().join("-");
      const time = currentDate.toLocaleTimeString();
      const dateTime = date + " " + time;
      body.to.forEach(async (item, index) => {
        // const leaveUser = await DB.Leave.find({
        //   where: { 
        //     [Op.and]: [
        //       {
        //         forwarder: item 
        //       },
        //       {
        //         [Op.and]: [
        //           { leave_from: { $lte: dateTime } },
        //           { leave_to: { $gte: dateTime } },
        //         ],
        //       },
        //     ]
        //   },
        //   attributes: ["receiver"],
        //   raw: true
        // });

        // if (leaveUser) {
        //   let _UserMailObject = UserMailSqlParams(body, mailSent, item);
        //   _UserMailObject.from_read_mail = 1;
        //   _UserMail = new DB.UserMails(_UserMailObject);
        //   const createdUserMail = await _UserMail.save();

        //   let UserMailObject = UserMailSqlParams(body, mailSent, leaveUser.receiver, createdUserMail.id);
        //   UserMailObject.from_read_mail = 1;
        //   UserMail = new DB.UserMails(UserMailObject);
        //   await UserMail.save();          
        // }
        // else {
          let UserMailObject = UserMailSqlParams(body, mailSent, item);
          UserMailObject.from_read_mail = 1;
          UserMail = new DB.UserMails(UserMailObject);
          let _mailData = await UserMail.save();
          mailData.push(_mailData);
        // }       

        if (body.to.length - 1 === index) {
          return apiResponse.successResponseWithData(
            res,
            responseMessage.MAIL_SENT,
            mailData
          );
        }
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

const composeMailMongoParams = (body) => {
  return {
    body: body.bodyData,
    subject: body.subject,
    op: body.op,
  };
};

const composeMailSqlParams = (body, documentCreatedId) => {
  return {
    source: body.from,
    subject: body.subject,
    op: body.op,
    document_id: documentCreatedId.toString()
  };
};

const UserMailSqlParams = (body, mailSent, to, leave_mail) => {
  return {
    user_mail_id: mailSent.id,
    to: to,
    from: body.from,
    attachement_ids: body.attachement_ids,
    mail_action: mailAction.Composed_Unread,
    leave_mail: leave_mail
  };
};

//user stations api
router.get("/getUserStations", createLogs(getUserStations), async (req, res) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      let whereData1, whereData2;

      if (req.query.mail_action === '69') {
        whereData1 = {
          mail_action: { $in: mailAction.archives },
          is_read_mail: 1,
          to: Userdata.designation_id,
        }

        whereData2 = {
          mail_action: { $in: mailAction.unread },
          is_read_mail: 0,
          to: Userdata.designation_id,
        }
      } else whereData1.to = Userdata.designation_id;

      let hideStaions = await isPreferenceExist({
        designation_id: Userdata.designation_id,
        category: "station",
        sub_category: "hide",
      });
      let hideArray = [];
      if (hideStaions) {
        hideArray = hideStaions.p_value.split(",").map(
          // function (item) {
          //   return parseInt(item, 10);
          // }
          Number
        );
      }

      let importantStaions = await isPreferenceExist({
        designation_id: Userdata.designation_id,
        category: "station",
        sub_category: "important",
      });
      let impStationArray = [];
      if (importantStaions) {
        impStationArray = importantStaions.p_value
          .split(",")
          .map(
            // function (item) {
            //   return parseInt(item, 10);
            // }
            Number
          );
      }

      const mails = await DB.UserMails.findAll({
        where: {[Op.or]: [whereData1, whereData2]},
        include: [
          {
            model: DB.Mail,
            include: [
              {
                model: DB.Designation,
                as: "Source",
              },
            ],
          },
        ],
        // order: [["updatedAt", "DESC"]],
      });

      if (mails) {
        let stations = mails.map((item) => {
          const data = item.get({ plain: true });

          return {
            id: data.Mail.Source.id,
            station: data.Mail.Source.branch,
          };
        });

        let uniqueStations = [
          ...new Map(
            stations.map((item) => [item["station"], item])
          ).values(),
        ];

        uniqueStations.sort((a, b) => (a.station > b.station ? 1 : -1));

        // stations.sort((a, b) => (a.station > b.station ? 1 : -1));
        // let uniqueStations = Array.from(
        //   new Set(stations.map((a) => a.station))
        // ).map((station) => {
        //   return stations.find((a) => a.station === station);
        // });

        if (unread.includes(req.query.mail_action)) {
          return apiResponse.successResponseWithData(
            res,
            responseMessage.SATATIONS_LIST,
            uniqueStations
          );
        }
        if (hideArray && hideArray.length > 0) {
          var result = uniqueStations.filter(
            (value) => !hideArray.includes(value.id)
          );
          uniqueStations = result;
        }
        var stationExit = [];
        if (impStationArray && impStationArray.length > 0) {
          for (let i = 0; i < impStationArray.length; i++) {
            uniqueStations.map((v) => {
              if (v.id == impStationArray[i]) {
                stationExit.push(v);
              }
            });
          }
        }

        const c = stationExit.concat(uniqueStations);
        const finalStations = c.filter((item, pos) => c.indexOf(item) === pos);

        if (!unread.includes(req.query.mail_action)) {
          return apiResponse.successResponseWithData(
            res,
            responseMessage.SATATIONS_LIST,
            finalStations
          );
        }
      } else {
        return apiResponse.validationErrorWithData(
          res,
          responseMessage.UNAUTHORIZED_USER
        );
      }
    }  else {
      return apiResponse.validationErrorWithData(
        res,
        responseMessage.ERROR
      );
    }
  } catch (err) {
    console.log(err);
  }
});

//update mail api
router.put("/bulkUpdate", createLogs(bulkUpdate), async (req, res, next) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const { body } = req;
      const updateFolderSchema = Joi.object({
        mail_ids: Joi.array().optional(),
        action: Joi.object().optional(),
      });
      const result = await updateFolderSchema.validateAsync(body);

      if ("folder" in body.action) {
        let getMailsId = await DB.UserMails.findAll({
          where: {
            id: { [Op.in]: body.mail_ids },
          },
          raw: true,
          attributes: ["id", "user_mail_id", "to", "from"],
        });
        if (Array.isArray(getMailsId)) {
          getMailsId.forEach((ele) => {
            if (ele.to == Userdata.designation_id) {
              body.action["to_folder"] = body.action.folder;
            } else if (ele.from == Userdata.designation_id) {
              body.action["from_folder"] = body.action.folder;
            }
          });
        }
        delete body.action["folder"]; // delete folder key from object
      }

      await updateUserMail(body.action, { id: { [Op.in]: body.mail_ids } });

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

const updateUserMail = async (queryData, whereData) => {
  return DB.UserMails.update(queryData, {
    where: whereData,
  });
};

const updateGCmail = (queryData, whereData) => {
  return DB.GeneralComments.update(queryData, {
    where: whereData,
  });
};

// Update userMail data
router.put("/", createLogs(updateUserMails), async (req, res) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const { body } = req;
      if (body.length > 0) {
        body.forEach((element) => {
          let queryData = {};
          const { id, ...params } = element;
          Object.entries(params).forEach(([key, value]) => {
            queryData[key] = value;
          });
          updateUserMail(queryData, { id });
          if('is_read_mail' in queryData || 'from_read_mail' in queryData){
              updateReadTime(id,Userdata.designation_id);
          }
        });
      }

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

router.post("/uploadBodyImage", createLogs(uploadBodyImage), async (req, res) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const { body } = req;
      const uploadImage = Joi.object({
        image_base64: Joi.string().required(),
        image_extention: Joi.optional(),
      });
      const result = await uploadImage.validateAsync(body);
      const { value, error } = result;
      const valid = error == null;
      const imageObject = await uploadImagesToDataServer(
        body.image_base64,
        body.image_extention
      );
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

const uploadImagesToDataServer = async (base64, image_extention) => {
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

function updateReadTime(id,designation_id){
  DB.UserMails.findOne({
    where: {id: id},
    attributes:['user_mail_id','id','mail_read_time']
  }).then((getUserMails) =>{
    let updateQuery = {};
    const queryData = {};
    if(getUserMails.dataValues.mail_read_time === null){
      queryData['mail_read_time'] = MOMENT().format( 'YYYY-MM-DD  HH:mm:ss.000' );

      DB.UserMails.update(
        queryData, 
        { 
          where: 
          { 
            id: id 
          } ,
          raw : true
        });
        // same mail send to another user
         DB.GeneralComments.findOne({
          where: { 
            umail_id: id,
            is_read: 0,
            to : designation_id
          },
          attributes:['id','prev_com_id']
        })
        .then((data)=>{
          updateQuery = {
            updatedAt : MOMENT().format( 'YYYY-MM-DD  HH:mm:ss.000' ),
            is_read : 1
          }
          whereQuery =  {
            umail_id: id,
            is_read  : 0 
          }
          updateGCmail(updateQuery, whereQuery);
        })            
    }else{
      DB.GeneralComments.findOne({
        where: { 
          umail_id: id,
          is_read: 0,
          to : designation_id
        },
        attributes:['id','prev_com_id'],
      })
      .then((getCommentData) => {
        if(getCommentData != null){
          updateQuery = {
            updatedAt : MOMENT().format( 'YYYY-MM-DD  HH:mm:ss.000' ),
            is_read : 1
          }
          whereQuery =  {
            umail_id: id,
            is_read  : 0 
          }
          updateGCmail(updateQuery, whereQuery);
        }
      })
    }
  })
}

module.exports = router;
