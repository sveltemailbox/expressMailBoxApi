const express = require("express");
var router = express.Router();
const Joi = require("joi");
const apiResponse = require("../../utils/apiresponse");
const auth = require("../shared/auth");
var http = require("http");
var https = require("https");
var fs = require("fs");
const { Attachement } = require("../../models");
const { split } = require("../private/secret");
const multer = require("multer");
const { uploadToRemote } = require("../services/uploadServer");
const responseMessage = require("../../utils/message");
const userRole = require("../../utils/roles");
const mailMongoModel = require("../models/mongo/mailMongoModel");
var sanitize = require("sanitize-filename");
let ClientHttp = require('ssh2-sftp-client');
const path = require('path');
const e = require("express");
const date = new Date();
require("custom-env").env(process.env.NODE_ENV);
const ObjectId = require("mongodb").ObjectID;
const _ = require('lodash');
const DB = require("../../models");
const { createLogs } = require("../services/logsService");
const { attachmentDownload, downloadFile, viewFile, deleteFile, uploadFile, attachmentDetailsById } = require("../../utils/logData");

const config = {
  host: process.env.DATA_SERVER_CRED_root_IP,
  port: process.env.DATA_SERVER_CRED_root_PORT,
  username: process.env.DATA_SERVER_CRED_root_USERNAME,
  password: process.env.DATA_SERVER_CRED_root_PASSWORD
};

const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// const auth = require("../shared/auth");

// attachmentDownloadApi
router.get("/download/:attachId", createLogs(attachmentDownload), async (req, res, next) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const { body } = req;
      const attachId = req.params.attachId;
      const attachementData = await Attachement.findOne({
        where: { id: attachId, published: 1 },
      });
      if (attachementData) {
        const data = attachementData.dataValues;
        const filename = data.url.split("/");
        let dest = `assets/${filename[filename.length - 1]}`;
        url = data.host == null ? data.url : `${data.host}${data.url}`;
        
        var url_dest = new URL(url);
        let client = url_dest.protocol == "https:" ? https : http;
        const options = {
          hostname: url_dest.hostname,
          path: url_dest.pathname, 
          headers: {
            Authorization:
              "Basic " +
              new Buffer(
                `${process.env.DATA_SERVER_CRED_USERNAME}:${process.env.DATA_SERVER_CRED_PASSWORD}`
              ).toString("base64"),
          },
        };
        var file = fs.createWriteStream(dest);
        client.get(url, function (response) {
          response.pipe(file);
          file.on("finish", function () {
            file.close();
            return res.download(dest, function (err) {
              fs.unlinkSync(dest);
            });
          });
        });
      } else {
        return apiResponse.validationErrorWithoutData(
          res,
          "Invalid attachmentId"
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

router.get("/downloadfile/:attachId/", createLogs(downloadFile), async (req, res, next) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const { body } = req;
      const attachId = req.params.attachId;
      const attachementData = await Attachement.findOne({
        where: { id: attachId, published: 1 },
      });
      if (attachementData) {
        const data = attachementData.dataValues;
        const filename = data.name;
        let dest = `assets/${filename}`;
        // url = data.host == null ? data.url : `${data.host}${data.url}`;
        
        let fullUrl ="";
        if(data.host == null || data.host == undefined){
          fullUrl = process.env.DATA_SERVER_PROTOCOL+process.env.DATA_SERVER_CRED_root_IP+process.env.DATA_SERVER_ATTACHMENT_LOC+data.url;
        }
        else{
          fullUrl = data.host + data.url;
        }

        var url_dest = new URL(fullUrl);
        
        let client = url_dest.protocol == "https:" ? https : http;

        const options = {
          hostname: url_dest.hostname,
          path: url_dest.pathname, 
          headers: {
            Authorization:
              "Basic " +
              new Buffer(
                `${process.env.DATA_SERVER_CRED_USERNAME}:${process.env.DATA_SERVER_CRED_PASSWORD}`
              ).toString("base64"),
          },
        };
        
        var file = fs.createWriteStream(dest);
        client.get(fullUrl, function (response) {
          response.pipe(file);
          file.on("finish", function () {
            file.close();
            return res.download(dest, function (err) {
              if(err){
                return apiResponse.validationErrorWithData(res, err);
              }
              fs.unlinkSync(dest);
            });
          });
        })
      } else {
        return apiResponse.validationErrorWithoutData(
          res,
          "Invalid attachmentId"
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

router.get("/viewfile/:attachId/", createLogs(viewFile), async (req, res, next) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const { body } = req;
      const attachId = req.params.attachId;
      const attachementData = await Attachement.findOne({
        where: { id: attachId, published: 1 },
      });
      if (attachementData) {
        const data = attachementData.dataValues;
        // const filename = data.url.split("/");
        const filename = data.name;
        let originalFileName = filename;
        let fullUrlName =""; 
        if(data.host === null || data.host === undefined){
          fullUrlName = process.env.DATA_SERVER_PROTOCOL+process.env.DATA_SERVER_CRED_root_IP+process.env.DATA_SERVER_ATTACHMENT_LOC+data.url; 
        }
        else{
          fullUrlName = data.host + data.url;
        }
        if(fullUrlName){
          resp = {};
          resp.url = fullUrlName;
          resp.filename = originalFileName;
          return apiResponse.successResponseWithData(res, 'File Url',resp);
        }
        else{
          return apiResponse.ErrorResponse(res, 'Error in file Url');
        }
      } else {
        return apiResponse.validationErrorWithoutData(
          res,
          "Invalid attachmentId"
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
  
router.get("/deletefile/:fileId/", createLogs(deleteFile), async(req,res) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const { body } = req;
      const attachId = req.params.fileId;
      const attachementData = await Attachement.findOne({
        where: { id: attachId, published: 1 },
      });
      if (attachementData) {
        const data = attachementData.dataValues;
        const urlName = data.url;
        let fullUrlName =  `${process.env.DATA_SERVER_ROOT_PATH}${process.env.DATA_SERVER_ATTACHMENT_LOC}${urlName}`;
        let sftp = new ClientHttp;
        sftp.connect(config)
        .then((conn) => {
          sftp.delete(fullUrlName,true)
        .then((resp) => {
          console.log(resp,'dsdsds');
          sftp.end();
          attachementData.destroy();
          // console.log(fullUrlName,'fullUrlName');
          return apiResponse.successResponseWithData(res, 'File deleted Successfully');
          });
        })
        .catch(err => {
          console.error(err.message);
          return apiResponse.validationErrorWithData(res, err.message);
        });

      }
      else{
        return apiResponse.validationErrorWithoutData(
          res,
          "Invalid attachmentId"
        );
      }
    }
  } catch (err) {
    console.log(err);
    return apiResponse.validationErrorWithData(res, err);
  }
})

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "assets/attachments/");
  },
  filename: function (req, file, cb) {
    let name = file.originalname.split(".");
    // let final_name = "file-" + Date.now() + "." + name[name.length - 1];
    let final_name = file.originalname.replace(/ /g,'-');
    req.final_name = sanitize(final_name);
    cb(null, final_name);
  },
});

let upload = multer({ storage: storage });

router.post(
  "/uploadAttachments",
  upload.any(),
  function (req, res) {
    try {
      const Userdata = req.Userdata;
      if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
        var file = req.files;
        uploadToRemote(
          req.final_name,
          "./assets/attachments/",
          process.env.DATA_SERVER_ROOT_PATH +
            process.env.DATA_SERVER_ATTACHMENT_LOC,
          (res) => {
            // if(req.final_name){
            //   path = "./assets/attachments/" + req.final_name;
            //   fs.unlinkSync(path);
            // }
          }
        );
        let attachmentObject = {
          url:
            process.env.DATA_SERVER_PROTOCOL +
            process.env.DATA_SERVER_CRED_root_IP +
            process.env.DATA_SERVER_ATTACHMENT_LOC +
            req.final_name,
          name: req.final_name,
          size: formatBytes(file?.size),
        };
        if(attachmentObject.url && attachmentObject.size && attachmentObject.name){
          const attachment = new Attachement(attachmentObject);
          attachment
            .save()
            .then((attachementCreated) => {
              return apiResponse.successResponseWithData(
                res,
                "Created Successfully",
                attachementCreated
              );
            })
            .catch((err) => {
              return apiResponse.ErrorResponse(res, err);
            });
        }
      } else {
        return apiResponse.validationErrorWithData(
          res,
          responseMessage.UNAUTHORIZED_USER
        );
      }
    } catch (err) {
      // console.log(err);
      return apiResponse.validationErrorWithData(
        res,
        responseMessage.UNAUTHORIZED_USER
      );
    }
  }
);

function formatBytes(bytes) {
  var marker = 1024; // Change to 1000 if required
  var decimal = 3; // Change as required
  var kiloBytes = marker; // One Kilobyte is 1024 bytes
  var megaBytes = marker * marker; // One MB is 1024 KB
  var gigaBytes = marker * marker * marker; // One GB is 1024 MB
  var teraBytes = marker * marker * marker * marker; // One TB is 1024 GB

  // return bytes if less than a KB
  if (bytes < kiloBytes) return bytes + " Bytes";
  // return KB if less than a MB
  else if (bytes < megaBytes)
    return (bytes / kiloBytes).toFixed(decimal) + " KB";
  // return MB if less than a GB
  else if (bytes < gigaBytes)
    return (bytes / megaBytes).toFixed(decimal) + " MB";
  // return GB if less than a TB
  else return (bytes / gigaBytes).toFixed(decimal) + " GB";
}

const imageStorage = multer.diskStorage({
  // Destination to store image  
    destination: function(req, file, cb) { 
      cb(null, 'assets/attachments');    
    }, 
    filename: (req, file, cb) => {
      cb(null, file.originalname )
    }
});

const imageUpload = multer({
  storage: imageStorage,
  // limits: {
    // fileSize: 50000000 // 1000000 Bytes = 1 MB
  // },
  fileFilter(req, file, cb) {
    cb(undefined, true)
  }
}) 

// upload.single('images')
router.post("/uploadfile", createLogs(uploadFile), imageUpload.single('images'), async (req, res,next) => {
  try {

      const maxSize = 500 * 1024 * 1024; //file size allow 500 MB

      const file = req.file;

      if (!file) {
        return apiResponse.ErrorResponse(res, 'Please select the image');
      }
      const Userdata = req.Userdata;
      const fileName = req.body.imagename;
      let mailId = req.body.mailId;
      mailId = mailId ?? 0;

      let localPath = path.resolve("./assets/attachments/"+file.originalname);

      if(file.size > maxSize){
        fs.unlink(`${localPath}`, (err => {
          if (err){
            return apiResponse.ErrorResponse(res, err);
          } 
        }));
        return apiResponse.ErrorResponse(res, 'File size should be less than 500 MB');
      }

      if(typeof fileName == 'undefined' ){
        fs.unlink(`${localPath}`, (err => {
          if (err){
            return apiResponse.ErrorResponse(res, err);
          } 
        }));
        return apiResponse.ErrorResponse(res, 'Invalid key imagename');
      }

      if(fileName.length == 0){
        fs.unlink(`${localPath}`, (err => {
          if (err){
            return apiResponse.ErrorResponse(res, err);
          } 
        }));
        return apiResponse.ErrorResponse(res, 'Please pass the value as imagename');
      }

      //calculate file size
      const fileSize = formatBytes(file.size);

      var fileExtension = file.originalname.substring(file.originalname.lastIndexOf('.')+1);
      // var imageName = file.originalname.substring(0, file.originalname.lastIndexOf('.'));
      
      let renameImageName = fileName+"."+fileExtension;
      fs.rename(localPath, path.resolve("./assets/attachments/"+renameImageName), function(err) {
          if ( err ){
            // console.log('ERROR: ' + err);
            return apiResponse.ErrorResponse(res, err);
          } 
          else{
            // console.log(path.resolve("./assets/attachments/"+renameImageName),'new filename')
          }
      });
      
      const SHOWURL = process.env.DATA_SERVER_PROTOCOL + process.env.DATA_SERVER_CRED_root_IP + process.env.DATA_SERVER_ATTACHMENT_LOC +Userdata.designation_id+"/"+date.getFullYear()+'/'+monthNames[date.getMonth()]+'/'+date.getDate();

      const URLInsert = Userdata.designation_id+"/"+date.getFullYear()+'/'+monthNames[date.getMonth()]+'/'+date.getDate();
      
      let remoteFolder = process.env.DATA_SERVER_ROOT_PATH+process.env.DATA_SERVER_ATTACHMENT_LOC +Userdata.designation_id;
      let remoteFullPath ="";
      let sftp = new ClientHttp;


      //If mailid is not null or not undefined
      let UserMailId=0,UsermailAttachmentId=0,wherecondition ={},updateData ={};
      if(mailId > 0){
        const getUsermailsId = await DB.UserMails.findOne({
          where: {
            id : mailId
          },
          raw: true,
          attributes:['id','attachement_ids'],
        });

        if(getUsermailsId){
          UserMailId = getUsermailsId.id;
          UsermailAttachmentId = getUsermailsId.attachement_ids;
        }
        else{
          UserMailId = 0;
          UsermailAttachmentId = 0;
          return apiResponse.ErrorResponse(res, 'Mail id does not exists, Please try with another id');
        }
      }

      sftp.connect(config).then(() => {
        //First Check User Id with designation
        return sftp.exists(remoteFolder);
      }).then( async(fileResp) => {
        // console.log(fileResp,'fileResp 11', typeof fileResp ,'fileResp');
        if(!fileResp){
          // console.log('Full path is not exists');
          remoteFullPath = remoteFolder+'/'+date.getFullYear()+'/'+monthNames[date.getMonth()]+'/'+date.getDate();
          // create full path with folder
          const createFolderResult = await createFolder(remoteFullPath,sftp);
          // console.log(createFolderResult,'createFolderResult121212121212')
          
          if (createFolderResult.status == 0) {
            // console.log('no create folder----------------------');
            return apiResponse.ErrorResponse(res, createFolderResult.msg);
          }
          else if(createFolderResult.status ==1){
            // console.log('insert file in this folder ###')
            let localPath = "/assets/attachments/"+renameImageName;
            let remoteFolderPath = remoteFolder+'/'+date.getFullYear()+'/'+monthNames[date.getMonth()]+'/'+date.getDate();
            let fileName = renameImageName.replace(/[&\/\\#,+()$~%'":*?<>{}^]/g, ''); //renameImageName;
            let putFileRes = await putFileOnRemoter(fileName,localPath,remoteFolderPath,sftp);
            // console.log(putFileRes,'putFileRes 000000',putFileRes,'putFileRes')
            if(putFileRes.status === 0){
              return apiResponse.ErrorResponse(res, putFileRes.msg);
            }
            else if(putFileRes.status === 1){
              // console.log('file create successfully in year block');
              putFileRes.name = renameImageName; 
              putFileRes.size = fileSize;
              // putFileRes.url = SHOWURL+'/'+renameImageName;
              putFileRes.url = URLInsert + "/"+fileName;

              //insert records into attachement table
              let attachmentObject = {
                // url:URLInsert + "/"+renameImageName,
                url : URLInsert + "/"+fileName,
                name: renameImageName,
                size: fileSize,
                };

                let insertRecords = await insertReccords(attachmentObject);
                // console.log(insertRecords,'insertRecords -0-0-0-0-0-0-0-')
                if(insertRecords.dataValues.id > 0){
                  if(UserMailId !== 0){
                    wherecondition = {
                      id : mailId
                    }  
                    updateData = {
                      attachement_ids : UsermailAttachmentId+ "," +  insertRecords.dataValues.id
                    }
                    if(mailId === 0){
                      await updateUserMails(wherecondition,updateData);
                    }                    

                    putFileRes.createdAt = insertRecords.dataValues.createdAt;
                    putFileRes.body_flag = insertRecords.dataValues.body_flag;
                    putFileRes.published = insertRecords.dataValues.published;
                    putFileRes.name = insertRecords.dataValues.name;
                    putFileRes.message = "Record Updated Successfully";
                    putFileRes.id = insertRecords.dataValues.id;
                  }
                  else{
                    putFileRes.createdAt = insertRecords.dataValues.createdAt;
                    putFileRes.body_flag = insertRecords.dataValues.body_flag;
                    putFileRes.published = insertRecords.dataValues.published;
                    putFileRes.name = insertRecords.dataValues.name;
                    putFileRes.message = "Created Successfully";
                    putFileRes.id = insertRecords.dataValues.id;
                  }
                  return apiResponse.successResponseWithData(res, putFileRes.message,putFileRes);
                }
                else{
                  return apiResponse.ErrorResponse(res, 'Error in record insert');
                }
            }
          }
        }
        else if(typeof fileResp == "string" && fileResp == "d"){
          // console.log('check year folder exists or not');
          return sftp.exists(remoteFolder+'/'+date.getFullYear())
          .then(async(respYear) => { 
            if(!respYear){
              //create folder for year
              // console.log('folder not exist already');
              remoteFullPath = remoteFolder+'/'+date.getFullYear()+'/'+monthNames[date.getMonth()]+'/'+date.getDate();
              // create full path with folder within same desigantion folder
              const createFolderResult = await createFolder(remoteFullPath,sftp);
              // console.log(createFolderResult,'createFolderResult 909090');
              if (createFolderResult.status == 0) {
                return apiResponse.ErrorResponse(res, createFolderResult.msg);
              }
              else{
                // console.log('insert file in this folder ###')
                let localPath = "/assets/attachments/"+renameImageName;
                let remoteFolderPath = remoteFolder+'/'+date.getFullYear()+'/'+monthNames[date.getMonth()]+'/'+date.getDate();
                let fileName = renameImageName.replace(/[&\/\\#,+()$~%'":*?<>{}^]/g, '');//renameImageName;
                let putFileRes =await putFileOnRemoter(fileName,localPath,remoteFolderPath,sftp);
                // console.log(putFileRes,'putFileRes 000000',putFileRes,'putFileRes')
                if(putFileRes.status === 0){
                  return apiResponse.ErrorResponse(res, putFileRes.msg);
                }
                else{
                  // console.log('file create successfully in year block');
                  putFileRes.name = renameImageName; 
                  putFileRes.size = fileSize;
                  // putFileRes.url = SHOWURL+'/'+renameImageName;
                  putFileRes.url = SHOWURL +"/"+ fileName; 

                  //insert records into attachement table
                  let attachmentObject = {
                    // url:URLInsert + "/"+renameImageName,
                    url : URLInsert + "/"+fileName,
                    name: renameImageName,
                    size: fileSize,
                    };
                  
                    let insertRecords = await insertReccords(attachmentObject);
                    if(insertRecords.dataValues.id > 0){
                      
                      if(UserMailId !== 0){
                        wherecondition = {
                          id : mailId
                        }  
                        updateData = {
                          attachement_ids : UsermailAttachmentId+ "," +  insertRecords.dataValues.id
                        }
                        if(mailId === 0){
                          await updateUserMails(wherecondition,updateData);
                        }
    
                        putFileRes.createdAt = insertRecords.dataValues.createdAt;
                        putFileRes.body_flag = insertRecords.dataValues.body_flag;
                        putFileRes.published = insertRecords.dataValues.published;
                        putFileRes.name = insertRecords.dataValues.name;
                        putFileRes.message = "Record Updated Successfully";
                        putFileRes.id = insertRecords.dataValues.id;
                      }
                      else{
                        putFileRes.createdAt = insertRecords.dataValues.createdAt;
                        putFileRes.body_flag = insertRecords.dataValues.body_flag;
                        putFileRes.published = insertRecords.dataValues.published;
                        putFileRes.name = insertRecords.dataValues.name;
                        putFileRes.message = "Created Successfully";
                        putFileRes.id = insertRecords.dataValues.id;
                      }
                      return apiResponse.successResponseWithData(res, putFileRes.message,putFileRes);
                    }
                    else{
                      return apiResponse.ErrorResponse(res, 'Error in record insert');
                    }
                }
              }
            }
            else if(typeof respYear == "string" && respYear == "d"){
              // console.log('check month folder exist or not');
              return sftp.exists(remoteFolder+'/'+date.getFullYear()+'/'+monthNames[date.getMonth()])
                .then(async(respMonth) => {
                  if(!respMonth){
                    remoteFullPath = remoteFolder+'/'+date.getFullYear()+'/'+monthNames[date.getMonth()]+'/'+date.getDate();
                    // create full path with folder within same desigantion folder
                    const createFolderResult = await createFolder(remoteFullPath,sftp);
                    if (createFolderResult.status == 0) {
                      return apiResponse.ErrorResponse(res, createFolderResult.msg);
                    }
                    else{
                      // console.log('insert file in this folder ###')
                      let localPath = "/assets/attachments/"+renameImageName;
                      let remoteFolderPath = remoteFolder+'/'+date.getFullYear()+'/'+monthNames[date.getMonth()]+'/'+date.getDate();
                      let fileName = renameImageName.replace(/[&\/\\#,+()$~%'":*?<>{}^]/g, '');//renameImageName;
                      let putFileRes =await putFileOnRemoter(fileName,localPath,remoteFolderPath,sftp);
                      // console.log(putFileRes,'putFileRes 000000',putFileRes,'putFileRes')
                      if(putFileRes.status === 0){
                        return apiResponse.ErrorResponse(res, putFileRes.msg);
                      }
                      else{
                        // console.log('file create successfully in year block');
                        putFileRes.name = renameImageName; 
                        putFileRes.size = fileSize;
                        // putFileRes.url = SHOWURL+'/'+renameImageName;
                        putFileRes.url = SHOWURL+"/"+fileName;
                        
                        //insert records into attachement table
                        let attachmentObject = {
                          // url:URLInsert + "/"+renameImageName,
                          url : URLInsert + "/"+fileName,
                          name: renameImageName,
                          size: fileSize,
                          };

                          let insertRecords = await insertReccords(attachmentObject);
                          if(insertRecords.dataValues.id > 0){
                           
                            if(UserMailId !== 0){
                              wherecondition = {
                                id : mailId
                              }  
                              updateData = {
                                attachement_ids : UsermailAttachmentId+ "," +  insertRecords.dataValues.id
                              }
                              if(mailId === 0){
                                await updateUserMails(wherecondition,updateData);
                              }
          
                              putFileRes.createdAt = insertRecords.dataValues.createdAt;
                              putFileRes.body_flag = insertRecords.dataValues.body_flag;
                              putFileRes.published = insertRecords.dataValues.published;
                              putFileRes.name = insertRecords.dataValues.name;
                              putFileRes.message = "Record Updated Successfully";
                              putFileRes.id = insertRecords.dataValues.id;
                            }
                            else{
                              putFileRes.createdAt = insertRecords.dataValues.createdAt;
                              putFileRes.body_flag = insertRecords.dataValues.body_flag;
                              putFileRes.published = insertRecords.dataValues.published;
                              putFileRes.name = insertRecords.dataValues.name;
                              putFileRes.message = "Created Successfully";
                              putFileRes.id = insertRecords.dataValues.id;
                            }
                            return apiResponse.successResponseWithData(res, putFileRes.message,putFileRes);
                          }
                          else{
                            return apiResponse.ErrorResponse(res, 'Error in record insert');
                          }
                      }
                    }
                  }
                  else if(typeof respYear == "string" && respYear == "d"){
                    // console.log('check current day if exist or not');
                    return sftp.exists(remoteFolder+'/'+date.getFullYear()+'/'+monthNames[date.getMonth()]+'/'+date.getDate())
                      .then(async (respDays) =>{
                        if(!respDays){
                          // console.log('create current day folder ##333')
                          remoteFullPath = remoteFolder+'/'+date.getFullYear()+'/'+monthNames[date.getMonth()]+'/'+date.getDate();
                          // create full path with folder within same desigantion folder
                          const createFolderResult = await createFolder(remoteFullPath,sftp);
                          // console.log(createFolderResult,'createFolderResult 909090');
                          if (createFolderResult.status == 0) {
                            return apiResponse.ErrorResponse(res, createFolderResult.msg);
                          }
                          else{
                            // console.log('insert file in this folder ### days block')
                            let localPath = "/assets/attachments/"+renameImageName;
                            let remoteFolderPath = remoteFolder+'/'+date.getFullYear()+'/'+monthNames[date.getMonth()]+'/'+date.getDate();
                            let fileName = renameImageName.replace(/[&\/\\#,+()$~%'":*?<>{}^]/g, '');//renameImageName;
                            let putFileRes =await putFileOnRemoter(fileName,localPath,remoteFolderPath,sftp);
                            // console.log(putFileRes,'putFileRes 000000',putFileRes,'putFileRes')
                            if(putFileRes.status === 0){
                              return apiResponse.ErrorResponse(res, putFileR32es.msg);
                            }
                            else{
                              // console.log('file create successfully in year block ###3');
                              putFileRes.name = renameImageName; 
                              putFileRes.size = fileSize;
                              // putFileRes.url = SHOWURL+'/'+renameImageName;
                              putFileRes.url = SHOWURL+"/"+fileName;
                              
                              //insert records into attachement table
                              let attachmentObject = {
                                // url:URLInsert + "/"+renameImageName,
                                url : URLInsert + "/"+fileName,
                                name: renameImageName,
                                size: fileSize,
                                };
                                let insertRecords = await insertReccords(attachmentObject);
                                if(insertRecords.dataValues.id > 0){
                                  if(UserMailId !== 0){
                                    wherecondition = {
                                      id : mailId
                                    }  
                                    updateData = {
                                      attachement_ids : UsermailAttachmentId+ "," +  insertRecords.dataValues.id
                                    }
                                    if(mailId === 0){
                                      await updateUserMails(wherecondition,updateData);
                                    }
                
                                    putFileRes.createdAt = insertRecords.dataValues.createdAt;
                                    putFileRes.body_flag = insertRecords.dataValues.body_flag;
                                    putFileRes.published = insertRecords.dataValues.published;
                                    putFileRes.name = insertRecords.dataValues.name;
                                    putFileRes.message = "Record Updated Successfully";
                                    putFileRes.id = insertRecords.dataValues.id;
                                  }
                                  else{
                                    putFileRes.createdAt = insertRecords.dataValues.createdAt;
                                    putFileRes.body_flag = insertRecords.dataValues.body_flag;
                                    putFileRes.published = insertRecords.dataValues.published;
                                    putFileRes.name = insertRecords.dataValues.name;
                                    putFileRes.message = "Created Successfully";
                                    putFileRes.id = insertRecords.dataValues.id;
                                  }
                                  return apiResponse.successResponseWithData(res, putFileRes.message,putFileRes);
                                }
                                else{
                                  return apiResponse.ErrorResponse(res, 'Error in record insert');
                                }
                            }
                          }
                        }
                        else if(typeof respYear == "string" && respYear == "d"){
                          // console.log('check file is exist or not in the above folder')
                          return sftp.exists(remoteFolder+'/'+date.getFullYear()+'/'+monthNames[date.getMonth()]+'/'+date.getDate()+'/'+renameImageName)
                            .then(async (respfile) =>{
                              if(!respfile){
                                // console.log('insert file in this folder')
                                let localPath = "/assets/attachments/"+renameImageName;
                                let remoteFolderPath = remoteFolder+'/'+date.getFullYear()+'/'+monthNames[date.getMonth()]+'/'+date.getDate();
                                let fileName = renameImageName.replace(/[&\/\\#,+()$~%'":*?<>{}^]/g, '');//renameImageName;
                                let putFileRes =await putFileOnRemoter(fileName,localPath,remoteFolderPath,sftp);
                                // console.log(putFileRes,'putFileRes 000000',putFileRes,'putFileRes')
                                if(putFileRes.status === 0){
                                  return apiResponse.ErrorResponse(res, putFileRes.msg);
                                }
                                else{
                                  // console.log('file create successfully');
                                  putFileRes.name = renameImageName; 
                                  putFileRes.size = fileSize;
                                  // putFileRes.url = SHOWURL+'/'+renameImageName;
                                  putFileRes.url = SHOWURL+"/"+fileName;
                                  
                                  //insert records into attachement table
                                  let attachmentObject = {
                                    // url:URLInsert + "/"+renameImageName,
                                    url : URLInsert + "/"+fileName,
                                    name: renameImageName,
                                    size: fileSize,
                                    };

                                    let insertRecords = await insertReccords(attachmentObject);
                                    if(insertRecords.dataValues.id > 0){
                                      
                                      if(UserMailId !== 0){
                                        wherecondition = {
                                          id : mailId
                                        }  
                                        updateData = {
                                          attachement_ids : UsermailAttachmentId+ "," +  insertRecords.dataValues.id
                                        }
                                        if(mailId === 0){
                                          await updateUserMails(wherecondition,updateData);
                                        }
                    
                                        putFileRes.createdAt = insertRecords.dataValues.createdAt;
                                        putFileRes.body_flag = insertRecords.dataValues.body_flag;
                                        putFileRes.published = insertRecords.dataValues.published;
                                        putFileRes.name = insertRecords.dataValues.name;
                                        putFileRes.message = "Record Updated Successfully";
                                        putFileRes.id = insertRecords.dataValues.id;
                                      }
                                      else{
                                        putFileRes.createdAt = insertRecords.dataValues.createdAt;
                                        putFileRes.body_flag = insertRecords.dataValues.body_flag;
                                        putFileRes.published = insertRecords.dataValues.published;
                                        putFileRes.name = insertRecords.dataValues.name;
                                        putFileRes.message = "Created Successfully";
                                        putFileRes.id = insertRecords.dataValues.id;
                                      }
                                      return apiResponse.successResponseWithData(res, putFileRes.message,putFileRes);
                                    }
                                    else{
                                      return apiResponse.ErrorResponse(res, 'Error in record insert');
                                    }
                                }
                              }
                              else{
                                /* let removeFile = path.resolve("./assets/attachments/"+renameImageName);
                                fs.unlink(`${removeFile}`, (err => {
                                  if (err){
                                    return apiResponse.validationErrorWithoutData(
                                      res,
                                      err
                                    );
                                  } 
                                  else {
                                    return apiResponse.validationErrorWithoutData(
                                      res,
                                      "File with same name has already been uploaded today"
                                    );
                                  }
                                })) */
                                // console.log('insert file in this folder')
                                let localPath = "/assets/attachments/"+renameImageName;
                                let remoteFolderPath = remoteFolder+'/'+date.getFullYear()+'/'+monthNames[date.getMonth()]+'/'+date.getDate();
                                let fileName = renameImageName.replace(/[&\/\\#,+()$~%'":*?<>{}^]/g, '');//renameImageName;
                                let name = fileName.split(".");
                                let final_name = fileName + Date.now() + "." + name[name.length - 1];
                                fileName = final_name;
                                let putFileRes =await putFileOnRemoter(fileName,localPath,remoteFolderPath,sftp);
                                // console.log(putFileRes,'putFileRes 000000',putFileRes,'putFileRes')
                                if(putFileRes.status === 0){
                                  return apiResponse.ErrorResponse(res, putFileRes.msg);
                                }
                                else{
                                  // console.log('file create successfully');
                                  putFileRes.name = renameImageName; 
                                  putFileRes.size = fileSize;
                                  // putFileRes.url = SHOWURL+'/'+renameImageName;
                                  putFileRes.url = SHOWURL+"/"+fileName;
                                  
                                  //insert records into attachement table
                                  let attachmentObject = {
                                    // url:URLInsert + "/"+renameImageName,
                                    url : URLInsert + "/"+fileName,
                                    name: renameImageName,
                                    size: fileSize,
                                    };

                                    let insertRecords = await insertReccords(attachmentObject);
                                    if(insertRecords.dataValues.id > 0){
                                      
                                      if(UserMailId !== 0){
                                        wherecondition = {
                                          id : mailId
                                        }  
                                        updateData = {
                                          attachement_ids : UsermailAttachmentId+ "," +  insertRecords.dataValues.id
                                        }
                                        if(mailId === 0){
                                          await updateUserMails(wherecondition,updateData);
                                        }
                    
                                        putFileRes.createdAt = insertRecords.dataValues.createdAt;
                                        putFileRes.body_flag = insertRecords.dataValues.body_flag;
                                        putFileRes.published = insertRecords.dataValues.published;
                                        putFileRes.name = insertRecords.dataValues.name;
                                        putFileRes.message = "Record Updated Successfully";
                                        putFileRes.id = insertRecords.dataValues.id;
                                      }
                                      else{
                                        putFileRes.createdAt = insertRecords.dataValues.createdAt;
                                        putFileRes.body_flag = insertRecords.dataValues.body_flag;
                                        putFileRes.published = insertRecords.dataValues.published;
                                        putFileRes.name = insertRecords.dataValues.name;
                                        putFileRes.message = "Created Successfully";
                                        putFileRes.id = insertRecords.dataValues.id;
                                      }
                                      return apiResponse.successResponseWithData(res, putFileRes.message,putFileRes);
                                    }
                                    else{
                                      return apiResponse.ErrorResponse(res, 'Error in record insert');
                                    }
                                }
                              }
                            })
                            .catch(err => {
                              console.error(err.message);
                              return apiResponse.validationErrorWithoutData(
                                res,
                                err.message
                              );
                            });
                        }
                      })
                      .catch(err => {
                        console.error(err.message);
                        return apiResponse.validationErrorWithoutData(
                          res,
                          err.message
                        );
                      });
                  }
                })
                .catch(err => {
                  console.error(err.message);
                  return apiResponse.validationErrorWithoutData(
                    res,
                    err.message
                  );
                });
            }
          })
          .catch(err => {
            console.error(err.message);
            return apiResponse.validationErrorWithoutData(
              res,
              err.message
            );
          });
        }
      })
      .catch(err => {
        // console.error(err.message,'9999----------');
        return apiResponse.validationErrorWithoutData(
          res,
          err.message
        );
      });
    }
  catch(err){
    // console.log(err,'errrr000000-----------');
    return apiResponse.validationErrorWithoutData(
      res,
      err
    );
  }
});

const insertReccords = async(data) => {
  let records  = new Attachement(data);
  let result =  await records.save();
  return result;
}
   
const updateUserMails = async (whereData,queryData) => {
  return DB.UserMails.update(queryData, {
    where: whereData,
    raw:true
  });

};
  /* const attachment =  await new Attachement(data);
  attachment
  .save()
  .then((attachementCreated) => {
    records.createdAt = attachementCreated.createdAt;
    records.status = 1;
    records.body_flag = attachementCreated.body_flag;
    records.published = attachementCreated.published;
    records.name = attachementCreated.name;
    records.message = "Created Successfully";
    records.id = attachementCreated.dataValues.id;
    console.log(records,'return records  0000')
    return {
      attachment: {
        createdAt : attachementCreated.createdAt,
        status : 1,
        body_flag : attachementCreated.body_flag,
        published : attachementCreated.published,
        name : attachementCreated.name,
        message : "Created Successfully",
        id : attachementCreated.dataValues.id
      },
     };
    // return records;
    // return apiResponse.successResponseWithData(res, 'File upload Successfully',putFileRes);
  })
  .catch((err) => {
    // return apiResponse.ErrorResponse(res, err);
    records.message = err;
    records.status = 0;
  });
} */

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const createFolder = (folderPathName,sftp) => {
  outputResult = {}
  return sftp.mkdir(folderPathName, true)
    .then((fullFolderResp) => {
      // console.log(fullFolderResp,'fullFolderResp created',typeof fullFolderResp);
      // /var/www/html/assets/attachments/2/2021/August/10 directory created fullFolderResp created string
      if(typeof fullFolderResp == "string"){
        outputResult.status = 1;
        outputResult.msg = 'Folder Created';
        return outputResult;
      }
    })
    .catch((err) => {
      outputResult.status = 0;
      outputResult.msg = err;
      return outputResult;
    })
}

//insert file into folder

const putFileOnRemoter = async (fileName,localPath,remoterfileWithPath,sftp) => {
  outputResult = {}
    let localPathMod = path.resolve("."+localPath);
    console.log(localPathMod,remoterfileWithPath,'remoterfileWithPath',localPath);
    return await sftp.fastPut(localPathMod, remoterfileWithPath +'/'+fileName)
      .then(async (finalResp) => {
        // console.log(finalResp,'finalResp 12121212');
        if(finalResp){
          // console.log(finalResp,'finalRespfinalRespfinalRespfinalResp');
          await fs.unlink(`.${localPath}`, (err => {
            if (err){
              outputResult.status = 0;
              outputResult.msg = err;
              return outputResult;
            } 
            else {
              // console.log("\nDeleted file: "+localPath);
              outputResult.status = 1;
              outputResult.msg = 'File deleted Successfully';
              return outputResult;
            }
          }))
        }
        else{
          // console.log('File not delete from local server')
        }
      })
      .then(() => {
        sftp.end();
        outputResult.status = 1;
        outputResult.msg = 'File deleted Successfully';
        return outputResult;
      })
      .catch((err) => {
        outputResult.status = 0;
        outputResult.msg = err;
        return outputResult;
      })
}

router.get("/attchmentDetailsById", createLogs(attachmentDetailsById), async (req, res) => {
  try {
    const Userdata = req.Userdata;
    let attId = req.query.attId;
    let _id = ObjectId(req.query.document_id);
    console.log(_id);
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      let result = await mailMongoModel.findById(_id);
      let attachment = result?.attachments;
      let resultData = [];

      if(attachment && attachment.length > 0){
       resultData = attachment.filter((v)=>{ return v.attId == attId });
      }

      return apiResponse.successResponseWithData(
        res,
        responseMessage.ATT_DETAILS,
        resultData.length > 0 ? resultData[0] : [] 
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

module.exports = router;
