const User = require("../models/userModel");

const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");

const authMiddleware = asyncHandler(async (req, res, next) => {
  let token;
  if (req?.headers?.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
    try {
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded?.id);
        //FIXME:cutsom error handler
        if (user.isBlocked == true) {
          throw new Error("User is blocked");
        }
        if (user.emailConfirm == false) {
          throw new Error("User is not verified , login again");
        }
        req.user = user;
        next();
      }
    } catch (error) {
      //FIXME:cutsom error handler

      throw new Error(
        error == "JsonWebTokenError: invalid signature"
          ? "Not Authorized token expired, Please Login again"
          : error
      );
    }
  } else {
    throw new Error("There is no token attached to header");
  }
});
const isAdmin = asyncHandler(async (req, res, next) => {
  const { email } = req.user;
  const adminUser = await User.findOne({ email });
  if (adminUser.role !== "admin") {
    throw new Error("You are not an admin");
  } else {
    next();
  }
});
const isSecretaryOfService = asyncHandler(async (req, res, next) => {
  const { email } = req.user;
  const SecretaryOfService = await User.findOne({ email });
  if (
    SecretaryOfService.SecretaryGeneralOfServices !== true &&
    SecretaryOfService.ServiceAssistantSecretary !== true &&
    SecretaryOfService.SecretaryOfService !== true &&
    SecretaryOfService.role !== "admin"
  ) {
    throw new Error("You are not an admin or the Secretary Of Service");
  } else {
    next();
  }
});
const isSecretaryGeneralOfServices = asyncHandler(async (req, res, next) => {
  const { email } = req.user;
  const SecretaryOfService = await User.findOne({ email });
  if (
    SecretaryOfService.SecretaryGeneralOfServices !== true &&
    SecretaryOfService.role !== "admin"
  ) {
    throw new Error(
      "You are not an admin or the Secretary General Of Services"
    );
  } else {
    next();
  }
});
module.exports = {
  authMiddleware,
  isAdmin,
  isSecretaryOfService,
  isSecretaryGeneralOfServices,
};
