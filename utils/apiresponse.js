exports.successResponse = function (res, msg) {
  var data = {
    status: 1,
    message: msg,
  };
  return res.status(200).json(data);
};

exports.successResponseWithData = function (res, msg, data) {
  var resData = {
    status: 1,
    message: msg,
    data: data,
  };
  return res.status(200).json(resData);
};
exports.successResponseWithoutData = function (res) {
  return res.status(204).json();
};
exports.successResponseWithMultiData = function (res, msg, data,attachmentData,bodyData) {
  var resData = {
    status: 1,
    message: msg,
    data: data,
    attachmentData,
    bodyData,
  };
  return res.status(200).json(resData);
};
exports.ErrorResponse = function (res, msg) {
  var data = {
    status: 0,
    message: msg,
  };
  return res.status(500).json(data);
};

exports.validationErrorWithData = function (res, msg, data) {
  var resData = {
    status: 0,
    message: msg,
    data: data,
  };
  return res.status(400).json(resData);
};

exports.validationErrorWithoutData = function (res, msg) {
  var resData = {
    status: 0,
    message: msg,
  };
  return res.status(400).json(resData);
};

exports.unauthorizedResponse = function (res, msg) {
  var data = {
    status: 0,
    message: msg,
    data: "",
  };
  return res.status(401).json(data);
};

exports.unauthorizedResponseWithMessage = function (res, msg, data) {
  var data = {
    status: 0,
    message: msg,
    data: data,
  };
  return res.status(401).json(data);
};

exports.tokenExpired = function (res, msg) {
  var resData = {
    status: 3,
    message: msg,
  };
  return res.status(401).json(resData);
};
