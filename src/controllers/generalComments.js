"use strict"
const express = require("express");
const router = express.Router();
const Joi = require("joi");
const userRole = require("../../utils/roles");
const apiResponse = require("../../utils/apiresponse");
const responseMessage = require("../../utils/message");
const DB = require("../../models");
const mailController = require("./Mail");
const annotationController = require("./Annotation");
const _ = require('lodash');
const mailAction = require("../../utils/contants");
const { COMPOSED, crashed } = require("../../utils/contants");
const { Op } = require("sequelize");
const { createLogs } = require("../services/logsService");
const { commentOnMail, getMailComments } = require("../../utils/logData");

router.post("/commentOnMail", createLogs(commentOnMail), async (req, res) => {
  try {
    const Userdata = req.Userdata;

    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const { body } = req;
      const commentSchema = Joi.object({
        user_mail_id: Joi.number().required(),
        to: Joi.number().required(),
        comment: Joi.string().optional(),
        attachmentIds: Joi.array().optional(),
        action: Joi.string().optional(),
        from_action: Joi.string().optional(),
        mail_action: Joi.string().required(),
      });

      const result = await commentSchema.validateAsync(body);
      const { value, error } = result;
      const valid = error == null;
      body.from = Userdata.designation_id;

      if(!body.hasOwnProperty('comment')){
        body.comment = '';
      }

      const checkUserMail = await DB.UserMails.find({
        where: {
          id: body.user_mail_id,
        },
        raw: true
      })

      if(_.isEmpty(checkUserMail)){
        return apiResponse.validationErrorWithData(
          res,
          'No Entry in user mail'
        );
      }

      let UserMailData = checkUserMail.user_mail_id;
      let MailIdPre = UserMailData;
      const mail = await mailController.getMail({ id: MailIdPre });
      if (_.isEmpty(mail)) {
        return apiResponse.validationErrorWithData(
          res,
          responseMessage.MAIL_NOT_EXIST
        );
      }

      let createBody = {};
      if (mail) {
        createBody = createUserParams(body, mail,checkUserMail);
      }

      let mailData = {};
      mailData = await DB.UserMails.find({
        // document_id: mail ? mail.document_id : null,
        where: {
          to: body.to,
          from: body.from,
        },
        include: [
          {
            model: DB.Mail,
            where: {
              document_id: mail.document_id
            }
          }
        ],
        raw: true
      });
      if (!mailData) {
        mailData = await DB.UserMails.find({
          // document_id: mail ? mail.document_id : null,
          where : {
            to: body.from,
            from: body.to,
          },
          include: [
            {
              model: DB.Mail,
              where: {
                document_id: mail.document_id
              }
            }
          ]
        });
      }
      
      if (mailData) {
        if((mailData.to === body.from) && (mailData.from === body.to)){
         let udpateQuery = {
          id: mailData.id,
        };
        let updateData = {
          updatedAt: new Date().toISOString(),
          sent_enabled : 1,
        };
        
        // await DB.UserMails.updateMail(updateData, udpateQuery);
          await updateMail(updateData, udpateQuery);
        }

        if (body.hasOwnProperty("comment")) {
          const commentParams = createCommentParams(
            body,
            checkUserMail.user_mail_id,
          );

          const gcData = await createComment(commentParams, Userdata, checkUserMail.user_mail_id,checkUserMail.id,0);
          if (gcData) {
            const plainData = gcData.get({ plain: true });
            await createMappingData(plainData.id, body.attachmentIds);
          }
        }
      } else {
        createBody.user_mail_id = checkUserMail.user_mail_id;
        createBody.from_read_mail = 1;
        createBody.from_action = mailAction.Sent; // 67
        createBody.published  =0;
        const newUserMail = (await DB.UserMails.create(createBody)).get({plain:true});
        if (body.hasOwnProperty("comment")) {
          const commentParams = createCommentParams(body, newUserMail.user_mail_id, null);
          const gcData =  await createComment(commentParams, Userdata, checkUserMail.user_mail_id,newUserMail.id,1);
          if (gcData) {
            const plainData = gcData.get({ plain: true });
            await createMappingData(plainData.id, body.attachmentIds);
          }
        }
      }

      let udpateQuery = {
        id: body.user_mail_id,
      };
      let updateData = {
        updatedAt: new Date().toISOString(),
      };
      // console.log(checkUserMail.from, '==', body.from, '=========================',body.to, '!=', body.from)

      if (mailData) {
        const requiredMailAction = returnMailAction(body);
        if(checkUserMail.from == body.from){
          updateData.from_action =  requiredMailAction.from_action; // 68
          updateData.mail_action =  requiredMailAction.mail_action;  // 69
          updateData.is_read_mail = '0';
        }
        else if (body.to != body.from) {
          updateData.from_action =  requiredMailAction.mail_action; // 69
          updateData.mail_action =  requiredMailAction.from_action; // 68
          updateData.from_read_mail = '0';
        }
        else {
          updateData.from_action =  requiredMailAction.from_action; // 68
          updateData.mail_action =  requiredMailAction.mail_action; // 69
        }

        if(checkUserMail.from === Userdata.designation_id){
          const findUserComment = await DB.GeneralComments.count({
            where: {user_mail_id: body.user_mail_id, from: Userdata.designation_id}
          })
  
          if(findUserComment > 0){
            delete updateData["from_action"];
          }
        }
        
        await updateMail(updateData, udpateQuery);
      }

      updateAttAnnotaions(body);

      return apiResponse.successResponse(res, responseMessage.COMMENT_ON_MAIL);
    }
  }
  catch (err) {
    console.log(err);
    return apiResponse.validationErrorWithData(res, err);
  }
});

const returnMailAction = (body) => {
  const mailActions = {};
  if (COMPOSED.includes(body.mail_action)) {
    mailActions.from_action = mailAction.Composed_Read;
    mailActions.mail_action = mailAction.Composed_Unread;
  } else if (crashed.includes(body.mail_action)) {
    mailActions.from_action = mailAction.Crashed_Read;
    mailActions.mail_action = mailAction.Crashed_Unread;
  } else {
    mailActions.from_action = mailAction.Read;
    mailActions.mail_action = mailAction.Unread;
  }

  return mailActions;
};

const createMappingData = (generalCommentId, attachmentIds = []) => {
  attachmentIds.length > 0 && attachmentIds.forEach((id) => {
    const params = {
      gc_id: generalCommentId,
      attch_id: id,
    }

    DB.GcAttachmentMap.create(params);
  })
}


const updateMail = async (queryData, whereData) => {
  return DB.UserMails.update(queryData, {
    where: whereData,
  });
};

const createUserParams = (body, mail,checkUserMail) => {  
  const requiredMailAction = returnMailAction(body);
  return {
    to: body.to,
    from: body.from,
    attachement_ids: checkUserMail.attachement_ids,
    mail_action: requiredMailAction.mail_action,
  };
};

const createCommentParams = (body, mailId, lastCommentId) => {
  let attachmentIds = '';
  if (body.attachmentIds) {
    body.attachmentIds.forEach((id) => {
      attachmentIds += `${id},`;
    });
    attachmentIds = attachmentIds.substring(0, attachmentIds.length - 1);
  }

  return {
    from: body.from,
    to: body.to,
    user_mail_id: mailId,
    comment: body.comment,
    attachment_id: attachmentIds,
    action: body.action
  };
};

const createComment = async (params, Userdata, mailId,umailId,typeValue) => {
  const mail = await DB.UserMails.findOne({
    where: {id: params.user_mail_id},
    attributes: ["to","leave_mail"],
    raw: true
  })

  const currentDate = new Date();
  const date = currentDate.toLocaleDateString().split("/").reverse().join("-");
  const time = currentDate.toLocaleTimeString();
  const dateTime = date + " " + time;
  // commented from here
  // const leaveUser = await DB.Leave.find({
  //   where: {
  //     [Op.and]: [
  //       {
  //         [Op.or]: [
  //           { receiver: mail.to },
  //           { forwarder: mail.to },
  //         ],
  //       },
  //       {
  //         [Op.and]: [
  //           { leave_from: { $lte: dateTime } },
  //           { leave_to: { $gte: dateTime } },
  //         ],
  //       },
  //     ],
  //   },
  //   attributes: ["receiver", "forwarder"],
  // });

  // commented upto here

  // if (leaveUser) {  
  //   let _params = {
  //     ...params,
  //     user_mail_id: mail.is_composed
  //   }

  //   const _generalCommentsData1 = await DB.GeneralComments.create(_params);
  //   const _generalCommentsData2 = await DB.GeneralComments.create(params);  

  //   return {..._generalCommentsData1, ..._generalCommentsData2}
  // } 
  // else {
    // created a comment >>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    params.umail_id = umailId;
    if(typeValue ==1 || typeValue ==true) {
      params.forward_mail_id = umailId;
    }
    const comment = await DB.GeneralComments.create(params);
    let commentMapParams = {
      mail_id: mailId,
      com_id: comment.id,
      prev_com_id: null,
      user: params.from
    }

    const previousComments = await DB.CommentMap.findAll({
      where: {
        [Op.and]: [
          {
            mail_id: mailId
          },
          {
            user: params.from
          },
        ],
      },
      attributes: ["com_id", "prev_com_id", "anno_id", "prev_anno_id"],
      raw: true
    });  


    await DB.CommentMap.create(commentMapParams) 
    
    // will two time

    let prevComm = [];
    let prevAnno = [];
    previousComments.forEach(item=>{
      if(item.com_id){
        prevComm.push(item.com_id);
      }
      if(item.anno_id){
        prevAnno.push(item.anno_id);
      }
      if(item.prev_anno_id){
        prevAnno.push(...item.prev_anno_id.split(","))
      }
      if(item.prev_com_id){
        prevComm.push(...item.prev_com_id.split(","))
      }
    })

    let _commentMapParams = {
      ...commentMapParams,
      prev_com_id: prevComm,
      user: params.to
    }

    if(prevComm.length > 0){
      _commentMapParams["prev_com_id"] = prevComm
    }
    if(prevAnno.length > 0){
      _commentMapParams["prev_anno_id"] = prevAnno
    }   

    await DB.CommentMap.create(_commentMapParams)
    // commented from here
    // if(leaveUser){
    //   if(params.to === leaveUser.forwarder){
    //     _commentMapParams.user = leaveUser.receiver
    //   }else{
    //     _commentMapParams.user = leaveUser.forwarder
    //   }
    //   await DB.CommentMap.create(_commentMapParams)
    // }

    // commented upto here
    
    return comment
  // }
};

const updateAttAnnotaions = (body) => {
  const whereData = {
    degn_id: body.from,
    mailid: body.user_mail_id,
  };

  annotationController.updateAttAnnotaion({ enb_sent: 1 }, whereData);
};

//get comments api
router.get("/getMailComments/:userMailId/", createLogs(getMailComments), async (req, res) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {

      const comments = await DB.CommentMap.findAll({
        where: {
          mail_id: req.params.userMailId,
          user: Userdata.designation_id
        },
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
          where: { id: { $in: uniqueCommentId }},
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
                {
                  model: DB.Attachement,
                  attributes: ["id", "url", "name", "size"],
                  as: "Attachments",
                },
          ],
        })

      return apiResponse.successResponseWithData(
        res,
        responseMessage.COMMENT_LIST,
        allComments
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

const getComment = async (whereData) => {
  return await DB.GeneralComments.findOne({
    where: whereData,
    order: [["createdAt", "DESC"]],
    raw: true,
  });
};

const getAnnotation = async (whereData) => {
  return await DB.Annotations.findOne({
    where: whereData,
    order: [["createdAt", "DESC"]],
    raw: true,
  });
};
/* 
const createMailParams = (body, mail) => {
  return {
    to: body.to,
    from: body.from,
    op: mail.op,
    source: mail.source,
    subject: mail.subject,
    attachement_ids: mail.attachement_ids,
    document_id: mail.document_id,
    is_crashed: null,
    annotation_ids: mail.annotation_ids,
    gen_comm_ids: mail.gen_comm_ids,
    is_read: 0,
    is_starred: 0,
    folder: null,
  };
}; */

module.exports = router;
