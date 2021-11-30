const mongoose = require("mongoose");
const searchResultsSchema = mongoose.Schema,
  ObjectId = searchResultsSchema.ObjectId;
const searchResultsmodelSchema = new searchResultsSchema(
  {
    designationId: {
      type: Number,
    },
    keyword: {
      type: String,
      required: true,
    },
    filters: {
      type: String,
    },
    resultSet: {
      type: Array,
    },
    updatedAt: {
      type: Date,
      default: new Date(),
    },
    createdAt: {
      type: Date,
      default: new Date(),
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  { collection: "searchResults" }
);
let searchResultsmodelSchema = mongoose.model(
  "searchResults",
  searchResultsmodelSchema
);
module.exports = searchResultsmodelSchema;
