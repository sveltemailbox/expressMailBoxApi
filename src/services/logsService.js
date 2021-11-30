const { createLogs } = require("../controllers/UserLogs");
const { User } = require("../../models");

exports.createLogs = (type) => {
  return async (req, res, next) => {
    try {
      let finalip = req.header('x-forwarded-for') || req.connection.remoteAddress;
      let mail_id = null;
      let logsdata = {
          user_id: req.Userdata?.id,
          type: type,
          ip: finalip,
      };
      if (req.body.mailId) {
          logsdata.mail_id = req.body.mailId;
      } else if (req.body.mail_id) {
          logsdata.mail_id = req.body.mail_id;
      } else if (req.params.mailId) {
          logsdata.mail_id = req.params.mailId;
        mail_id = req.params.mailId;
      } else if (req.params.mail_id) {
          logsdata.mail_id = req.params.mail_id;
      } else if (req.query.mailId) {
          logsdata.mail_id = req.query.mailId;
      } else if (req.query.mail_id) {
          logsdata.mail_id = req.query.mail_id;
      }
      createLogs(logsdata);
  
      next();
    } catch (e) {
      console.log(e);
      next();
    }
  }  
};
