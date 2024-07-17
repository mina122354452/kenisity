const express = require("express");
const {
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
} = require("../controller/userCtrl.js");
const {
  authMiddleware,
  isAdmin,
  isSecretaryOfService,
} = require("../middlewares/authMiddleware.js");
const router = express.Router();
router.post("/register", createUser);
router.post("/login", loginUser);
router.post("/loginAdmin", loginAdmin);
router.post("/forgot-password-token", forgotPasswordToken);
router.put("/password", authMiddleware, updatePassword);
router.put("/edit-user", authMiddleware, updateUser);
router.put("/reset-password/:token", resetPassword);
router.put("/block-user/:id", authMiddleware, isAdmin, blockUser);
router.put("/unblock-user/:id", authMiddleware, isAdmin, unblockUser);
router.put(
  "/becomeServant/:id",
  authMiddleware,
  isSecretaryOfService,
  becomeServant
);
router.put(
  "/becomeServant/:id",
  authMiddleware,
  isSecretaryOfService,
  unBecomeServant
);
router.put("/Email-verification/:token", verifyEmail);
router.get("/refresh", handleRefreshToken);
router.get("/all-users", authMiddleware, isSecretaryOfService, getallUser);
router.get("/logout", logout);
router.get("/details/", authMiddleware, getUserDetails);
router.get("/:id", authMiddleware, isSecretaryOfService, getaUser);
router.delete("/:id", authMiddleware, isAdmin, deleteaUser);

module.exports = router;
