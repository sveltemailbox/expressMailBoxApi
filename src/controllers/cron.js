
const express = require('express');
var router = express.Router();
const cron = require('node-cron');
const DB = require("../../models");
const { Op,Sequelize} = require("sequelize");
const TODAY_START = new Date().setHours(0, 0, 0, 0);
const NOW = new Date();
 
app = express();
router.get("/cronjobs", (req, res) => {
    cron.schedule('*/5 * * * * *', async () => {  // every 5 seconds
    // cron.schedule('59 23 * * *', function() {  // cron run at 11:59 PM every day.
        await DB.Mail.findAll({
            where : {
                $or :[
                    {
                        is_read_enabled : 1,
                    },
                    {
                        from_read_enabled : 1
                    }
                ],
                updatedAt : {
                    [Op.gt]: TODAY_START,
                    [Op.lt]: NOW
                }
            },
            attributes:['id','updatedAt','from_read_enabled','is_read_enabled'],
            raw: true, 
            order: [
                ['id', 'DESC'],
            ],
        }).then((cronData) => {
            // console.log(cronData,'cronData',cronData.length)
            if(cronData.length != 0){
                cronData.map((rows) => {
                    if(rows.is_read_enabled == 1){
                        DB.Mail.update({is_read : 1,is_read_enabled:0}, { where: { id: rows.id } }) // update is_read_enabled 0 because next time that row does not come 
                        .then(function (isResults) {
                            console.log('Successfully Updated is read enabled records',isResults);
                        })
                        .catch((err) => {
                            // console.error(err);
                            console.log(err.message);
                        });
                    }
                    else if(rows.from_read_enabled == 1)
                    {
                        DB.Mail.update({from_is_read:1,from_read_enabled : 0}, { where: { id: rows.id } }) // update from_read_enabled 0 because next time that row does not come 
                        .then(function (fromResults) {
                            console.log('Successfully Updated from read enabled records',fromResults);
                        })
                        .catch((err) => {
                            // console.error(err);
                            console.log(err.message);
                        }); 
                    }
                })
            }
            else{
                console.log('No Records found');
            }
        }).catch(function (err) {
            console.log(err.message);
        });
    },
    );
});

module.exports = router; 