require("custom-env").env(process.env.NODE_ENV);
const server = require("./src/config/appconfig/serverconfig");
const mongodb = require("./src/config/dbconfig/mongodbConfig");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const userController = require("./src/controllers/User");
const folderController = require("./src/controllers/Folder");
const attachmentController = require("./src/controllers/Attachment");
const generalCommentsController = require("./src/controllers/generalComments");
const designationController = require("./src/controllers/designation");
const staticCommentsController = require("./src/controllers/staticComments");
const annotationController = require("./src/controllers/Annotation");
const userLogsController = require("./src/controllers/UserLogs");
const historyController = require("./src/controllers/history");
const imageAcessController = require("./src/controllers/Misc/imageAcess");
const userPreferencesController = require("./src/controllers/UserPreferences");
const leaveController = require("./src/controllers/leave");
const userMailsController = require('./src/controllers/UserMails')
const userMailsControllerTest = require('./src/controllers/UserMailsTest')

const auth = require("./src/shared/auth");
// const session = require("./src/services/userSession");
 
let app1 = new server().returnServer();
app1.use(express.json());
app1.use(cors());
app1.options('*', cors());
app1.use(function (req, res, next) {

  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers','*');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Pass to next layer of middleware
  next();
});
app1.use(express.urlencoded({ limit: "50mb", extended: true }));

mongodb
  .on("error", console.error.bind(console, "MongoDB connection error:"))
  .then(() => console.log("MongoDB Connected"));

app1.get("/", (req, res) => {
  res.send("Hello Mailbox");
});

/**************************************Controllers Routes***********************************************************/

app1.use("/api/users", userController);
app1.use("/api/folders", auth.isAuthorized, folderController);
app1.use("/api/mails",auth.isAuthorized, userMailsController);
app1.use("/api/mailsTest",auth.isAuthorized, userMailsControllerTest);
app1.use("/api/attachment", auth.isAuthorized, attachmentController);
app1.use("/api/comments", auth.isAuthorized, generalCommentsController);
app1.use("/api/designation", auth.isAuthorized, designationController);
app1.use("/api/static", auth.isAuthorized, staticCommentsController);
app1.use("/api/annotation", auth.isAuthorized, annotationController.router);
app1.use("/api/logs", auth.isAuthorized, userLogsController.router);
app1.use("/api/history", auth.isAuthorized, historyController.router);
app1.use("/api/images", auth.isAuthorized, imageAcessController);
app1.use("/api/preferences", auth.isAuthorized, userPreferencesController);
app1.use("/api/leave", auth.isAuthorized, leaveController);
