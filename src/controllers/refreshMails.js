const express = require('express');
var router = express.Router();
const DB = require("../../models");
const { Op,Sequelize} = require("sequelize");
const responseMessage = require("../../utils/message");
const apiResponse = require("../../utils/apiresponse");
const userRole = require("../../utils/roles");

 
app = express();
router.post("/refresh_unread_mails", async(req, res, next) => {
    try {
        const Userdata = req.Userdata;
        if (Userdata.role == userRole.USER || Userdata.role == userRole.ADMIN) {
            const body = req.query;
            let readData = await DB.Mail.findAll({
                    where : {
                        $or :[
                            {
                                is_read_enabled : 1,
                            },
                            {
                                from_read_enabled : 1
                            }
                        ],
                        to : {
                            [Op.eq]: Userdata.designation_id
                        }
                    },
                    attributes:['id','to','from_read_enabled','is_read_enabled'],
                    raw: true, 
                    order: [
                        ['id', 'DESC'],
                    ]
                });
                if (!readData)
                    return apiResponse.validationErrorWithData(
                        res,
                        responseMessage.INVALID
                    );
                else{
                    if(readData.length != 0){
                        readData.map((rows) => {
                            if(rows.is_read_enabled == 1){
                                DB.Mail.update({is_read : 1,is_read_enabled:0}, { where: { id: rows.id } }) // update is_read_enabled 0 because next time that row does not come 
                                    .then(function (isResults) {
                                        console.log('Successfully Updated is read enabled records',isResults);
                                        return apiResponse.successResponseWithData(
                                            res,
                                            responseMessage.READMAIL,
                                            isResults
                                        );
                                    })
                                    .catch((err) => {
                                        console.error(err);
                                        return apiResponse.ErrorResponse(res, err);
                                    });
                            }
                            else if(rows.from_read_enabled == 1)
                            {
                                DB.Mail.update({from_is_read:1,from_read_enabled : 0}, { where: { id: rows.id } }) // update from_read_enabled 0 because next time that row does not come 
                                    .then(function (fromResults) {
                                        return apiResponse.successResponseWithData(
                                            res,
                                            responseMessage.READMAIL,
                                            fromResults
                                        );
                                    })
                                    .catch((err) => {
                                        console.error(err);
                                        return apiResponse.ErrorResponse(res, err);
                                    }); 
                            }
                        })
                    }
                    else{
                        console.log('No Records found');
                        return apiResponse.successResponseWithData(
                            res,
                            'No Records found'
                        );
                    }
                }
        }else{
            return apiResponse.validationErrorWithData(
                res,
                responseMessage.UNAUTHORIZED_USER
            );
        }
    } catch (error) {
        console.log(error);
        return apiResponse.validationErrorWithData(res, error.message);
    }
});

module.exports = router; 