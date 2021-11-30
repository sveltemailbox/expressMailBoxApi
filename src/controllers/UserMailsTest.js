const express = require("express");
var router = express.Router();
const userRole = require("../../utils/roles");
const apiResponse = require("../../utils/apiresponse");
const responseMessage = require("../../utils/message");
const DB = require("../../models");
var Sequelize = require("sequelize");
let htmlTags = require("../../utils/htmlTags");
const mailSearchService = require("../services/mailSearching");
const { Op } = require("sequelize");
const mailAction = require("../../utils/contants");
const { createLogs } = require("../services/logsService");
const { getAllMail } = require("../../utils/logData");

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+.,\\^$|#\s]/g, "\\$&");
}

//get All Mails
router.get("/getAllMail", createLogs(getAllMail), async (req, res, next) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      // ============ get limit and skip ================
      let {
        limit,
        pageNo,
        mail_action,
        is_sent,
        folder,
        by_stations,
        search_data,
        group_by,
      } = req.query;
      limit = parseInt(limit);
      let skip = limit * (pageNo - 1);

      let whereData = {};
      let search = {};
      let byStationsArray = [];
      let readWhereDataCondition = {};
      let readSearchDataCondition = {};

      // =============================== check preference exits =======================
      let hideStaions = await isPreferenceExist({
        designation_id: Userdata.designation_id,
        category: "station",
        sub_category: "hide",
      });

      let hideArray = [];
      if (hideStaions) {
        if (
          hideStaions &&
          hideStaions.p_value &&
          hideStaions.p_value.length > 0
        ) {
          hideArray = hideStaions.p_value.split(",").map(function (item) {
            return parseInt(item, 10);
          });
        }
      }
      let importantStaions = await isPreferenceExist({
        designation_id: Userdata.designation_id,
        category: "station",
        sub_category: "important",
      });
      let impStationArray = [];
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

      // ============================= Get unred mail condition =================
      let readWhereDataUnread = {
        mail_action: { $in: mailAction.archives },
        is_read_mail: 1,
        to: Userdata.designation_id,
      };

      let readSearchDataUnread = {
        from_action: { $in: mailAction.archives },
        from_read_mail: 1,
        from: Userdata.designation_id,
      };

      let whereDataUnread = {
        to: Userdata.designation_id,
        mail_action: { $in: mailAction.unread },
        is_read_mail: 0,
      };

      // check station hide of user preference and append in whreDataUnread ===================
      if (hideArray && hideArray.length > 0) {
        whereDataUnread.from = {
          [Op.and]: [{ [Op.notIn]: hideArray }],
        };
      }
      // ================================ End >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

      let searchDataUnread = {
        from_action: { $in: mailAction.unread },
        from: Userdata.designation_id,
        from_read_mail: 0,
      };

      // ================================ End >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

      if (is_sent) {
        // ==================== condition to check sent mail ==============
        whereData.from = Userdata.designation_id;
        search.to = Userdata.designation_id;
        search.sent_enabled = is_sent;
      } else if (mail_action && mailAction.crashed.includes(mail_action)) {
        // ==================== condition to check crashed mail ==============
        whereData.to = Userdata.designation_id;
        whereData.mail_action = { $in: mailAction.crashed };
      } else if (mail_action && mailAction.starred.includes(mail_action)) {
        // ==================== condition to check starred mail ==============
        whereData.to = Userdata.designation_id;
        whereData.mail_action = { $in: mailAction.starred };
        search.from_action = { $in: mailAction.starred };
        search.from = Userdata.designation_id;
      } else if (folder) {
        // ==================== condition to check folder mail ==============
        // whereData.folder = folder;
        whereData.to = Userdata.designation_id;
        whereData.to_folder = folder;
        search.from_folder = folder;
        search.from = Userdata.designation_id;
      } else if (mail_action && mailAction.Read === mail_action) {
        // ==================== condition to check archive mail ==============
        whereData.to = Userdata.designation_id;
        whereData.mail_action = { $in: mailAction.archives };
        whereData.is_read_mail = 0;

        search.from_action = { $in: mailAction.archives };
        search.from = Userdata.designation_id;
        search.from_read_mail = 0;
      } else {
        // ==================== condition to check get all mail ==============
        whereData.to = Userdata.designation_id;
        search.from = Userdata.designation_id;
      }

      if (by_stations) {
        // ==================== condition to check by stations mail ==============
        whereData.to = Userdata.designation_id;
        byStationsArray = JSON.parse(by_stations);
      }

      // check station hide of user preference and append in whereData ===================
      if (hideArray && hideArray.length > 0) {
        whereData.from = {
          [Op.and]: [{ [Op.notIn]: hideArray }],
        };
      }

      readWhereDataCondition = whereData; //append whereData
      readSearchDataCondition = search; // append search

      // check for unread mail ===============================
      if (mail_action && mailAction.unread.includes(mail_action)) {
        // ==================== condition to check unread mail ==============
        readWhereDataCondition = {
          [Op.or]: [whereDataUnread, readWhereDataUnread],
        };
        readSearchDataCondition = {
          [Op.or]: [searchDataUnread, readSearchDataUnread],
        };
      }
      let _ordersTop = [
        [
          Sequelize.literal(
            `CASE WHEN mail_action = '99' THEN '99' WHEN mail_action = '97' THEN '97' ELSE '0' END`
          ),
          "DESC",
        ],
        [
          Sequelize.literal(
            `CASE WHEN mail_action = '89' THEN '89' WHEN mail_action = '86' THEN '86' ELSE '0' END`
          ),
          "DESC",
        ],
      ];
      let _ordersButtom = [
        ["updatedAt", "DESC"],
        [
          { model: DB.GeneralComments, as: "comments_data" },
          "createdAt",
          "DESC",
        ],
      ];

      if (impStationArray.length > 0)
        _ordersTop.push([
          Sequelize.fn(
            "FIELD",
            Sequelize.col("UserMails.from"),
            impStationArray
          ),
        ]);


        let finalSearchQuery = { [Op.or]: [readWhereDataCondition, readSearchDataCondition] };

        if (search_data) {
          let document_ids = await searchMails(search_data);
          let mailIds = await DB.Mail.findAll({
            where: { document_id: { [Op.in]:  document_ids} },
            attributes: ["id"],
            raw: true
          })
  
          mailIds = mailIds.map(item=>item.id);
  
          finalSearchQuery =  { [Op.and]: [{[Op.or]: [readWhereDataCondition, readSearchDataCondition]}, {user_mail_id: {[Op.in]: mailIds} } ] }        
        }

      //   ================== get all mail ==================
      let mails = await DB.UserMails.findAll({
        where: finalSearchQuery,
        attributes: {
          include: [
            [
              Sequelize.fn("GROUP_CONCAT", Sequelize.col("id")),
              "concat_user_mail_ids",
            ],
            [
              Sequelize.fn("GROUP_CONCAT", Sequelize.col("mail_action")),
              "concat_mail_action",
            ],
            [
              Sequelize.fn("GROUP_CONCAT", Sequelize.col("from_action")),
              "concat_from_action",
            ],
            [
              Sequelize.fn("GROUP_CONCAT", Sequelize.col("from")),
              "concat_from",
            ],
            [
              Sequelize.fn("GROUP_CONCAT", Sequelize.col("to")),
              "concat_to",
            ]
          ],
        },
        group: ["user_mail_id"],
        include: [
          {
            model: DB.Mail,
            [by_stations && "on"]: {
              [Op.and]: [
                { source: { $in: byStationsArray } },
                Sequelize.literal("`UserMails`.`user_mail_id` = `Mail`.`id`"),
              ],
            },
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
            on: Sequelize.literal(
              "CASE WHEN `comments_data`.`from` = " + Userdata.designation_id + " OR `comments_data`.`to` = " + Userdata.designation_id + " THEN `UserMails`.`user_mail_id` = `comments_data`.`user_mail_id` ELSE '0' END"
            ),
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(skip),
        order: [..._ordersTop, ..._ordersButtom],
      });

      //  =============== get unread count ===============
      let newWhereData = {
        [Op.and]: [
          { to: Userdata.designation_id },
          { mail_action: mailAction.unread },
          { is_read_mail: 0 },
        ],
      };
      let newSearch = {
        [Op.and]: [
          { from: Userdata.designation_id },
          { from_action: mailAction.unread },
          { from_read_mail: 0 },
        ],
      };

      const unreadCount = await DB.UserMails.findAll({
        where: {
          [Op.or]: [newWhereData, newSearch],
        },
        attributes: ["id", "mail_action", "from_action", "is_read_mail"],
        group: ["user_mail_id"],
        include: [
          {
            model: DB.Mail,
            [by_stations && "where"]: { source: { $in: byStationsArray } },
            attributes: ["id"],
          },
        ],
        raw: true,
      });

      let finalMails = [];
      if (is_sent) {
        const asyncMails = async (mail, index, cb) => {
          // make array of concat string
          let array_concat_user_mail_ids =
            mail.dataValues.concat_user_mail_ids.split(",");

          let allTo = [];

          if (array_concat_user_mail_ids.includes(mail.id)) {
            array_concat_user_mail_ids.splice(
              array_concat_user_mail_ids.indexOf(mail.id),
              1
            );
            allTo.push(mail.To.dataValues);
          } else {
            const asyncUserMailIds = async (user_mail_id, id_index, cb) => {
              let reminingTo = await DB.UserMails.findOne({
                where: {
                  id: user_mail_id,
                },
                attributes: ["id"],
                include: [
                  {
                    model: DB.Designation,
                    as: "To",
                  },
                ],
              });
              if (reminingTo) {
                allTo.push(reminingTo.To.dataValues);
              }

              if (array_concat_user_mail_ids.length === id_index + 1) {
                mails[index].To.dataValues = allTo;
              }
              cb();
            };

            let requestsUserMailIds = array_concat_user_mail_ids.map(
              (item, index) => {
                return new Promise((resolve) => {
                  asyncUserMailIds(item, index, resolve);
                });
              }
            );
            await Promise.all(requestsUserMailIds);
          }
          cb();
        };

        let requestsMails = mails.map((item, index) => {
          return new Promise((resolve) => {
            asyncMails(item, index, resolve);
          });
        });
        await Promise.all(requestsMails);
      }

      finalMails = mails;

      const count = await DB.UserMails.count({
        where: finalSearchQuery,
        group: ["user_mail_id"],
      });

      return apiResponse.successResponseWithData(
        res,
        responseMessage.MAIL_LIST,
        {
          data: finalMails,
          count: count.length,
          unreadCount: unreadCount.length,
        }
      );
    }
    return apiResponse.validationErrorWithData(
      res,
      responseMessage.UNAUTHORIZED_USER
    );
  } catch (err) {
    console.log(err);
  }
});

const searchMails = async (search_data) => {
  let matchedHtmlTag;
  let searchDataArray = [];
  let userSearchData = search_data.split(",");
  let str = htmlTags.tags;
  userSearchData.map((v) => {
    const regex = new RegExp(escapeRegex(v), "gi");
    matchedHtmlTag = str.match(regex);
      searchDataArray.push(v);
  });
  let finalObj_ids;
  if (searchDataArray.length <= 0) {
    return (finalObj_ids = []);
  }
  let searchRegex = searchDataArray.join("|");

  finalObj_ids = await mailSearchService.multiKeywordsSearch(
    searchRegex
  );
  return finalObj_ids;
};

const isPreferenceExist = async (whereData) => {
  return await DB.userPreferences.findOne({
    where: whereData,
    raw: true,
    attributes: ["p_value"],
  });
};

module.exports = router;
