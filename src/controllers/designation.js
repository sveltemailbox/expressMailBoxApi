const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");

const userRole = require("../../utils/roles");
const apiResponse = require("../../utils/apiresponse");
const responseMessage = require("../../utils/message");
const DB = require("../../models");
const { createLogs } = require("../services/logsService");
const { getAllDesignation, getAllStations, getAllBranches, getDesignationThBrach } = require("../../utils/logData");

//get all designations api
router.get("/", createLogs(getAllDesignation), async (req, res) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const findDes = await DB.Designation.findOne({
        where: { 
          user_id: Userdata.id,
          default_desig : {[Op.gt]: 0}
        } 
      });

      if (findDes) {
        const branchVal = findDes.branch;
        DB.Designation.sequelize
        .query(
          "SELECT `id`, `branch`, `designation`, `user_id`, `default_desig`, `createdAt`, `updatedAt` FROM `designation` AS `Designation` WHERE `Designation`.`id` != '"+ findDes.id + "' AND `Designation`.`designation` IS NOT NULL AND `Designation`.`default_desig` > 0 AND `Designation`.`user_id` IS NOT NULL ORDER BY FIELD(branch, '" + branchVal + "') DESC",
          { type: DB.sequelize.QueryTypes.SELECT }
        ) .then((dirResp) => {
          return apiResponse.successResponseWithData(
            res,
            responseMessage.MAIL_LIST,
            dirResp
          );
        });
      }
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

router.get("/allStations", createLogs(getAllStations), async (req, res) => {
  try {
    const Userdata = req.Userdata;
    if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
      const dir = await DB.Designation.findAll({
        where: {
          branch: {
            [Op.ne]: null,
          },
        },
      });
      return apiResponse.successResponseWithData(
        res,
        responseMessage.SATATIONS_LIST,
        dir
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

router.get('/allAllUserDesgination', createLogs(getAllDesignation), async (req, res) => {
  try {
    const userData = req.Userdata;
    if (userData.role == userRole.USER || userData.role == userRole.ADMIN) {
      const designations = await DB.Designation.findAll({
        where: {
          user_id: userData.id
        },
      });
      return apiResponse.successResponseWithData(
        res,
        responseMessage.MAIL_LIST,
        designations
      );
    }
    else {
      return apiResponse.validationErrorWithData(
        res,
        responseMessage.UNAUTHORIZED_USER
      );
    }
  } catch(err) {
    console.log(err);
    return apiResponse.ErrorResponse(res, err);
  }
});

router.get('/getAllBranches', createLogs(getAllBranches), async (req, res) => {
  try {
    const userData = req.Userdata;
    if (userData.role == userRole.USER || userData.role == userRole.ADMIN) {
      const designations = await DB.Designation.findOne({
        where: {
          user_id: userData.id
        },
      });

      // get all the branches using group
      const branchesList = await DB.Designation.findAll({
        where: {
          branch: {
            [Op.ne]: designations.branch,
          },
        },
        group: ['branch'],
        order: [
          ['branch', 'ASC'],
        ],
      });

      let branchName =[];
      branchesList.forEach((item,index) =>{
        branchName[item.branch] = {
          "id": item.id,
          "branch": item.branch
        }
      })

      //own branch get all the designation
      const ownBranch = await DB.Designation.findAll({
        where : {
          branch : designations.branch
        },
        order: [
          ['designation', 'ASC'],
        ],
      })
      var response = [];
      var ownBranchList = [];
      ownBranch.forEach((item,index) => {
        ownBranchList[index] = {
          "id": item.id,
          "branch": item.branch,
          "designationBranch" :item.designation+'('+item.branch+')',
          "designation" :item.designation,
          "user_id" : item.user_id
        }
      })

      response = {"ownBranch" : ownBranchList,...branchName};
      return apiResponse.successResponseWithData(
        res,
        responseMessage.MAIL_LIST,
        response
      );
    }
    else{
      return apiResponse.validationErrorWithData(
        res,
        responseMessage.UNAUTHORIZED_USER
      );
    }
  }
  catch(err) {
    console.log(err);
    return apiResponse.ErrorResponse(res, err);
  }
});

router.get('/getDesignationThBranch/:branchName', createLogs(getDesignationThBrach), async (req, res) => {
  try {
    const userData = req.Userdata;
    // console.log(req.query.name,'userData');
    if (userData.role == userRole.USER || userData.role == userRole.ADMIN) {
      const branchName =  req.params.branchName.toUpperCase();
      if(branchName.length == null || branchName.length ==0){
        return apiResponse.validationErrorWithData(
          res,
          responseMessage.BRANCH_EMPTY
        );
      }
      else{
        // console.log('4567890876543567890---------------------------')
        const ownBranch = await DB.Designation.findAll({
          where : {
            branch : branchName
          },
          order: [
            ['designation', 'ASC'],
          ],
        })
        var ownBranchList = [];
        ownBranch.forEach((item,index) => {
          ownBranchList[index] = {
            "id": item.id,
            "branch": item.branch,
            "designationBranch" :item.designation+'('+item.branch+')',
            "designation" :item.designation,
            "user_id" : item.user_id
          }
        })
        return apiResponse.successResponseWithData(
          res,
          responseMessage.MAIL_LIST,
          ownBranchList
        );
      }
    }
    else{
      return apiResponse.validationErrorWithData(
        res,
        responseMessage.UNAUTHORIZED_USER
      );
    }
  }
  catch(err) {
    console.log(err);
    return apiResponse.ErrorResponse(res, err);
  }
});

module.exports = router;
