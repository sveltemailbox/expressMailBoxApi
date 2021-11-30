const mongoose = require("mongoose");
var mailSchema = mongoose.Schema,
  ObjectId = mailSchema.ObjectId;
let mailmodelSchema = new mailSchema(
  {
    body: {
      type: String,
    },
    subject: {
      type: String,
      required: true,
    },
    op: {
      type: String,
      // required: true,
    },
    attachments: [
      {
        attId: { type: Number },
        attText: { type: String },
      },
    ],
    createdAt: {
      type: Date,
    },
    updatedAt: {
      type: Date,
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  { collection: "mails" }
);
let mailmongoModel = mongoose.model("mails", mailmodelSchema);
module.exports = mailmongoModel;
