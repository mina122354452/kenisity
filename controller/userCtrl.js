const expressAsyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const sendEmail = require("./emailCtrl");
const crypto = require("crypto");
const { generateToken } = require("../config/jwt");
const { generateRefreshToken } = require("../config/refreshToken");
const {
  generatePasswordResetMail,
  generateVerifyMail,
} = require("../messages/email");
const validateMongoDbId = require("../utils/validateMongodbId");
const createUser = expressAsyncHandler(async (req, res) => {
  const { firstname, lastname, email, password } = req.body;
  const findUser = await User.findOne({ email });
  if (!findUser) {
    const newUser = await User.create({
      firstname,
      lastname,
      email,

      password,
    });
    if (newUser.emailConfirm === false) {
      verifyEmailToken(req, res);
    } else {
      return res.status(201).json({
        message: "User created",
      });
    }
  } else {
    if (findUser.emailConfirm === false) {
      verifyEmailToken(req, res);
    } else {
      //FIXME:cutsom error handler
      throw new Error("user is already exist");
    }
  }
});
const loginUser = expressAsyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const findUser = await User.findOne({ email });
  if (!findUser) {
    throw new Error("there isn't exist user");
  }
  const passwordStatus = await findUser.isPasswordMatched(password);

  if (findUser && passwordStatus) {
    const mobile = findUser.mobile;
    if (findUser.emailConfirm === false) {
      verifyEmailToken(req, res);
    } else if (findUser.isBlocked == true) {
      throw new Error("User is blocked");
    } else {
      const refreshToken = await generateRefreshToken(findUser?.id);
      const updateUser = await User.findByIdAndUpdate(
        findUser?._id,
        {
          refreshToken: refreshToken,
        },
        {
          new: true,
        }
      );
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        sameSite: "strict",
        secure: true,
        maxAge: 72 * 60 * 60 * 1000, // 3 days
      });
      res.status(200).json({
        id: findUser?._id,
        firstname: findUser?.firstName,
        lastname: findUser?.lastName,
        email: findUser?.email,
        mobile: findUser?.mobile,
        token: generateToken(findUser?._id),
      });
    }
  } else {
    //FIXME:cutsom error handler
    throw new Error("Invalid credentials");
  }
});
const verifyEmailToken = expressAsyncHandler(async (req, res) => {
  const { email } = req.body;
  console.log(req.body);

  const user = await User.findOne({ email });

  if (!user) throw new Error("User Not Found With this email");
  try {
    if (user.emailConfirm === false) {
      const token = await user.verifyEmail();
      await user.save();
      // todo
      let mail = await generateVerifyMail(token, user.firstname, user.lastname);
      console.log(token);
      const data = {
        to: email,
        subject: "verify your Email",
        html: mail,
      };
      await sendEmail(data);
      res.status(201).json({
        status: "successfully",
        message: "we sent email verification",
      });
    } else {
      res.status(100).json({
        status: "Not Modified",
        message: "your email is already verified",
      });
    }
  } catch (error) {
    throw new Error(error);
  }
});
const verifyEmail = expressAsyncHandler(async (req, res) => {
  const { token } = req.params;
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    emailVerify: hashedToken,
    emailVerifyExpires: {
      $gt: Date.now(),
    },
  });
  //FIXME:cutsom error handler
  if (!user) throw new Error("token Expired,please try again later");
  user.emailConfirm = true;
  user.emailVerify = undefined;
  user.emailVerifyExpires = undefined;
  await user.save();
  if (user.emailConfirm === true) {
    res.status(202).json({
      status: "successfully",
      message: "user created and verified successfully",
    });
  }
});
const loginAdmin = expressAsyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw Error("no credentials");

  const findAdmin = await User.findOne({ email });
  if (findAdmin.role !== "admin") throw new Error("Not Authorized");
  const passwordStatus = await findAdmin.isPasswordMatched(password);
  if (findAdmin && passwordStatus) {
    const refreshToken = await generateRefreshToken(findAdmin?.id);
    const updateUser = await User.findByIdAndUpdate(
      findAdmin?._id,
      {
        refreshToken: refreshToken,
      },
      {
        new: true,
      }
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: true,
      maxAge: 72 * 60 * 60 * 1000,
    });
    res.status(200).json({
      id: findAdmin?._id,
      firstname: findAdmin?.firstName,
      lastname: findAdmin?.lastName,
      email: findAdmin?.email,
      mobile: findAdmin?.mobile,
      token: generateToken(findAdmin?._id),
    });
  } else {
    throw new Error("Invalid credentials");
  }
});
const handleRefreshToken = expressAsyncHandler(async (req, res) => {
  let cookie = await req.cookies;

  if (!cookie?.refreshToken) {
    //FIXME:cutsom error handler

    throw new Error("No refresh token in cookies");
  }
  const refreshToken = cookie.refreshToken;

  const user = await User.findOne({
    refreshToken,
  });
  if (!user) throw new Error("No refresh token in db or matched");
  jwt.verify(refreshToken, process.env.JWT_SECRET, (err, decoded) => {
    if (err || user.id !== decoded.id) {
      throw new Error("Refresh token is not valid");
    }
    const accessToken = generateToken(user?._id);
    res.status(200).json({ accessToken });
  });
});

const logout = expressAsyncHandler(async (req, res) => {
  const cookie = req.cookies;
  if (!cookie?.refreshToken) {
    //FIXME:cutsom error handler

    throw new Error("No refresh token in cookies");
  }
  const refreshToken = cookie.refreshToken;
  const user = await User.findOne({
    refreshToken,
  });
  if (!user) {
    res.clearCookie("refreshToken", {
      httpOnly: true,

      secure: true,
    });
    return res.sendStatus(204);
  }
  await User.findOneAndUpdate(
    { refreshToken },
    {
      refreshToken: "",
    }
  );
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
  });
  return res.sendStatus(204);
});

const getallUser = expressAsyncHandler(async (req, res) => {
  try {
    const getUsers = await User.find();
    res.status(200).json(getUsers);
  } catch (err) {
    //FIXME:cutsom error handler

    throw new Error(err);
  }
});
const getaUser = expressAsyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);

  try {
    const getaUser = await User.findById(id);
    res.status(200).json({ getaUser });
  } catch (err) {
    //FIXME:cutsom error handler

    throw new Error(err);
  }
});
const getUserDetails = expressAsyncHandler(async (req, res) => {
  const { id } = req.user;
  validateMongoDbId(id);

  try {
    const getaUser = await User.findById(id).select(
      "firstname lastname email mobile address isSeller -_id"
    );
    res.status(200).json({ getaUser });
  } catch (err) {
    //FIXME:cutsom error handler

    throw new Error(err);
  }
});

const updateUser = expressAsyncHandler(async (req, res) => {
  const { id } = req.user;
  validateMongoDbId(id);
  try {
    const user = await User.findById(id);

    if (req?.body?.firstName) user.firstname = req?.body?.firstName;
    if (req?.body?.lastName) user.lastname = req?.body?.lastName;
    if (req?.body?.email) user.email = req?.body?.email;
    if (req?.body?.mobile) user.mobile = req?.body?.mobile;
    user.save();
    res.status(202).json({ status: "success", message: "updated user data" });
  } catch (error) {
    //FIXME:cutsom error handler

    throw new Error(error);
  }
});

const deleteaUser = expressAsyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);

  try {
    const deleteaUser = await User.findByIdAndDelete(id);
    res.status(200).json({
      status: "success",
      message: "User Deleted successfully",
    });
  } catch (err) {
    //FIXME:cutsom error handler

    throw new Error(err);
  }
});

const blockUser = expressAsyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);

  try {
    const block = await User.findByIdAndUpdate(
      id,
      {
        isBlocked: true,
      },
      {
        new: true,
      }
    );
    res.status(202).json({ status: "success", message: "User Blocked" });
  } catch (err) {
    //FIXME:cutsom error handler

    throw new Error(err);
  }
});
const unblockUser = expressAsyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);

  try {
    const block = await User.findByIdAndUpdate(
      id,
      {
        isBlocked: false,
      },
      {
        new: true,
      }
    );
    res.status(202).json({ status: "success", message: "User unBlocked" });
  } catch (err) {
    //FIXME:cutsom error handler

    throw new Error(err);
  }
});
const updatePassword = expressAsyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { password } = req.body;
  validateMongoDbId(_id);
  const user = await User.findById(_id);
  if (password) {
    user.password = password;
    user.passwordChangedAt = Date.now();
    const updatedPassword = await user.save();
    res
      .status(200)
      .json({ status: "success", message: "password updated successfully" });
  } else {
    res.json(user);
  }
});
const forgotPasswordToken = expressAsyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) throw new Error("User Not Found With this email");
  try {
    const token = await user.createPasswordResetToken();
    await user.save();
    // todo
    let mail = await generatePasswordResetMail(
      token,
      user.firstname,
      user.lastname
    );
    console.log(token);
    const data = {
      to: email,
      subject: "Reset Password link",
      html: mail,
    };
    await sendEmail(data);

    res.status(200).json({
      status: "success",
      message: "Password reset token sent to your email",
    });
  } catch (error) {
    //FIXME:cutsom error handler
    throw new Error(error);
  }
});

const resetPassword = expressAsyncHandler(async (req, res) => {
  const { password } = req.body;
  const { token } = req.params;
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: {
      $gt: Date.now(),
    },
  });
  if (!user) throw new Error("token Expired,please try again later");
  user.password = password;
  user.passwordChangedAt = Date.now();
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  res.json({
    status: "success",
    message: "password changed successfully",
  });
});
//! working -- logic not complete
const becomeServant = expressAsyncHandler(async (req, res) => {
  const { id } = req.params;
  const { serviceId } = req.params;
  const user = await User.findById(id);
  user.servant = true;

  user.servesIn = req.user.servesIn || serviceId;

  user.save();
  res.json({
    status: "success",
    message: `user now is servant successfully`,
  });
});
const unBecomeServant = expressAsyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  user.servant = false;

  user.servesIn = null;

  user.save();
  res.json({
    status: "success",
    message: "user now isn't servant ",
  });
});
module.exports = {
  createUser,
  verifyEmailToken,
  verifyEmail,
  loginUser,
  loginAdmin,
  handleRefreshToken,
  logout,
  getallUser,
  getaUser,
  getUserDetails,
  updateUser,
  deleteaUser,
  blockUser,
  unblockUser,
  updatePassword,
  forgotPasswordToken,
  resetPassword,
  becomeServant,
  unBecomeServant,
};
