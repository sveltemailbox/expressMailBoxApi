const mailMongoModel = require("../models/mongo/mailMongoModel");
//mongo search query
exports.MultisearchWithSearchByStringFrequency = async function (
  obj_ids,
  searchRegex
) {
  const mails = await mailMongoModel.aggregate([
    {
      $match: {
        $and: [
          { _id: { $in: obj_ids } },
          {
            $or: [
              { subject: { $regex: searchRegex, $options: "$i" } },
              { op: { $regex: searchRegex, $options: "$i" } },
              { body: { $regex: searchRegex, $options: "$i" } },
            ],
          },
        ],
      },
    },
    {
      $addFields: {
        num_of_sub_occ: {
          $size: {
            $filter: {
              input: { $split: ["$subject", " "] },
              as: "sub_text",
              cond: {
                $regexMatch: {
                  input: "$$sub_text",
                  regex: searchRegex,
                  options: "i",
                },
              },
            },
          },
        },
      },
    },
    {
      $addFields: {
        num_of_op_occ: {
          $size: {
            $filter: {
              input: { $split: ["$op", " "] },
              as: "op_text",
              cond: {
                $regexMatch: {
                  input: "$$op_text",
                  regex: searchRegex,
                  options: "i",
                },
              },
            },
          },
        },
      },
    },
    {
      $addFields: {
        num_of_body_occ: {
          $size: {
            $filter: {
              input: { $split: ["$body", " "] },
              as: "body_text",
              cond: {
                $regexMatch: {
                  input: "$$body_text",
                  regex: searchRegex,
                  options: "i",
                },
              },
            },
          },
        },
      },
    },
    {
      $project: {
        num_of_sub_occ: "$num_of_sub_occ",
        num_of_op_occ: "$num_of_op_occ",
        num_of_body_occ: "$num_of_body_occ",
        total_word_occurances: {
          $add: ["$num_of_sub_occ", "$num_of_op_occ", "$num_of_body_occ"],
        },
      },
    },
    {
      $sort: { total_word_occurances: -1 },
    },
  ]);
  let finalObj_ids = mails.map(function (item) {
    return item._id.toString();
  });
  return finalObj_ids;
};

//mongo search query
exports.multiKeywordsSearch = async function (searchRegex) {
  let MongooseQuery = "";
  MongooseQuery = {
        $or: [
          { subject: { $regex: searchRegex, $options: "$i" } },
          { op: { $regex: searchRegex, $options: "$i" } },
          { body: { $regex: searchRegex, $options: "$i" } },
        ]
  };
  const mails = await mailMongoModel.find(MongooseQuery)
  let finalObj_ids = mails.map(function (item) {
    return item._id.toString();
  });
  return finalObj_ids;
};
