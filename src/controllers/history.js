const express = require("express");
var router = express.Router();
const userRole = require("../../utils/roles");
const apiResponse = require("../../utils/apiresponse");
const DB = require("../../models");
const auth = require("../shared/auth");
const responseMessage = require("../../utils/message");
const mailmongoModel = require("../models/mongo/mailMongoModel");
const { Op } = require("sequelize");
const moment = require('moment');
const { createLogs } = require("../services/logsService");
const { mailTracking } = require("../../utils/logData");

router.get("/mails", createLogs(mailTracking), async (req, res, next) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const body = req.query;
      if (!body.hasOwnProperty("mail_id"))
        return apiResponse.validationErrorWithData(
          res,
          responseMessage.INVALID
        );

      let mails = await DB.UserMails.findAll({
        where: {
          user_mail_id: body.mail_id,
        },
        include: [
          {
            model: DB.Designation,
            as: "From",
            attributes:['branch', 'designation']
          },
          {
            model: DB.Designation,
            as: "To",
            attributes:['branch', 'designation']
          },
        ],
        attributes:['createdAt', 'updatedAt', 'user_mail_id', 'from', 'is_composed', 'id', 'to'],
        order: [["createdAt", "asc"]],
      });
      if (!mails)
        return apiResponse.validationErrorWithData(
          res,
          responseMessage.INVALID
        );

        let finalMail = {};
      if (mails) {
        
        let _forward = [];
        mails.forEach(item=>{
            let _to = [];    
            if(item.is_composed !== 0){
              mails.forEach(itemj=>{
                  if(item.user_mail_id === itemj.user_mail_id && item.from === itemj.from && itemj.is_composed !== -1){
                    _to.push(`${itemj['To.designation']}(${itemj['To.branch']})`)         
                  }
                  if(item.to === itemj.from){
                    _forward.push(`${itemj['To.designation']}(${itemj['To.branch']})`);
                  }
              })
              finalMail[item.user_mail_id] = {
                    ...item,
                    To: _to.join(),
                    forwardTo: _forward.join()
              };
            }else{
              finalMail[item.id] = {
                ...item,
                To: `${item['To.designation']}(${item['To.branch']})`
              }
            }  
            
        })
        return apiResponse.successResponseWithData(
          res,
          responseMessage.FOLDERS_LIST,
          finalMail
        );
      } else {
        return apiResponse.successResponseWithData(
          res,
          responseMessage.FOLDERS_LIST,
          finalMail
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
    return apiResponse.validationErrorWithData(res, err);
  }
});

router.get("/mailhistory", createLogs(mailTracking), async (req, res, next) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const body = req.query;
      
      if (!body.hasOwnProperty("mail_id"))
        return apiResponse.validationErrorWithData(
          res,
          responseMessage.INVALID
        );

        let getMailsId = await DB.UserMails.findAll({
          where: {
            user_mail_id:  body.mail_id,
            published : '1',
            $or: [
              {to : Userdata.designation_id},
              {from : Userdata.designation_id} 
            ]
          },
          include: [
            {
              model: DB.Designation,
              as: "From",
              attributes: ["id", "branch", "designation", "user_id"],
            },
            {
              model: DB.Designation,
              as: "To",
              attributes: ["id", "branch", "designation", "user_id"],
            },
          ],
          attributes: ["id", "user_mail_id", "to", "from",'createdAt','mail_read_time'],
        });

        const comments = await DB.CommentMap.findAll({
          where: {
            mail_id: body.mail_id,
            user: Userdata.designation_id
          },
          order :[
            ['id','asc']
          ],
          raw: true
        })
        let allCommentId = [];
        comments.forEach((item, index)=>{
          if(item.com_id){
            allCommentId.push(item.com_id);
          }        
          if(item.prev_com_id){
            allCommentId.push(...item.prev_com_id.split(","))
          }
        })

        let uniqueCommentId = [...new Set(allCommentId)];
        const allComments = await DB.GeneralComments.findAll({
          where: {
            id: { $in: uniqueCommentId},
            // is_read : 1 
          },
          include: [
            {
              model: DB.Designation,
              attributes: ["id", "branch", "designation", "user_id"],
              as: "From",
            },
            {
              model: DB.Designation,
              attributes: ["id", "branch", "designation", "user_id"],
              as: "To",
            },
          ],
        })
        let _forward = [],finalMail = [];result ={} 
        allComments.forEach((item,key) => {
          console.log(item.createdAt,' ------- 11111',moment(item.createdAt).format("DD-MM-YYYY HH:mm:ss",true))
          if(item.forward_mail_id > 0 ){
            _forward =`${item.To.designation}(${item.To.branch})`;
            result = {
              "id": item.id,
              "user_mail_id": item.user_mail_id,
              "from": item.from,
              "to": item.to,
              "comment": item.comment,
              "is_read": item.is_read,
              "prev_com_id": item.prev_com_id,
              "published": item.published,
              "attachment_id": item.attachment_id,
              "createdAt": moment(item.createdAt).format("DD-MM-YYYY HH:mm:ss",true),
              "mail_read_time": item.updatedAt?moment(item.updatedAt).format("DD-MM-YYYY HH:mm:ss",true):'--',
              "From":item.From,
              "To":item.To,
              // "forward" : _forward
            };
            if(Userdata.designation_id === item.from){
              _forward =`${item.To.designation}(${item.To.branch})`;
              result.forward = _forward;
            }
            else {
              result.forward = "";
            }
            finalMail.push(result);
          }
          else{
            console.log(item.createdAt,' ------- else ',moment(item.createdAt).format("DD-MM-YYYY HH:mm:ss",true))
            result = {
              "id": item.id,
              "user_mail_id": item.user_mail_id,
              "from": item.from,
              "to": item.to,
              "comment": item.comment,
              "is_read": item.is_read,
              "prev_com_id": item.prev_com_id,
              "published": item.published,
              "attachment_id": item.attachment_id,
              "createdAt": moment(item.createdAt).format("DD-MM-YYYY HH:mm:ss",true),
              "mail_read_time": item.updatedAt?moment(item.updatedAt).format("DD-MM-YYYY HH:mm:ss",true):'--',
              "From":item.From,
              "To":item.To,
            };
            finalMail.push(result)
          }
        });
        finalMail.sort((a, b) => a.id - b.id);
        
        let resp = {};usermails=[];
        if(getMailsId !== null){
          getMailsId.forEach((item_user,key) => {
            console.log(item_user.createdAt,' ------- 2222',moment(item_user.createdAt).format("DD-MM-YYYY HH:mm:ss",true))
            let result = {
              "id": item_user.id,
              "user_mail_id": item_user.user_mail_id,
              "from": item_user.from,
              "to": item_user.to,
              "comment": item_user.comment,
              "is_read": item_user.is_read,
              "prev_com_id": item_user.prev_com_id,
              "published": item_user.published,
              "attachment_id": item_user.attachment_id,
              "createdAt": moment(item_user.createdAt).format("DD-MM-YYYY HH:mm:ss",true),
              "mail_read_time": (item_user.mail_read_time !== null) ?moment(item_user.mail_read_time).format("DD-MM-YYYY HH:mm:ss",true):'--',
              "From":item_user.From,
              "To":item_user.To,
            }
            usermails.push(result)
          })
          resp = [...usermails,...finalMail];
        }
        else{
          resp = finalMail;
        }
        
        // console.log(filtered);
        return apiResponse.successResponseWithData(
          res,
          responseMessage.COMMENT_LIST,
          resp
        );

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

module.exports = { router };