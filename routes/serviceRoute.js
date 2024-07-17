const express = require("express");
const {
  createService,
  editService,
  verifyEmailToken,
  verifyEmail,
  getAllServices,
} = require("../controller/serviceCtrl.js");
const {
  authMiddleware,
  isAdmin,
  isSecretaryOfService,
  isSecretaryGeneralOfServices,
} = require("../middlewares/authMiddleware.js");
const router = express.Router();

router.post(
  "/create",
  authMiddleware,
  isSecretaryGeneralOfServices,
  createService
);
router.put("/Email-verification/:token", verifyEmail);
router.put("/VerifyServiceEmail", authMiddleware, isAdmin, verifyEmailToken);
router.put("/editService/", authMiddleware, isSecretaryOfService, editService);
router.get("/getAllServices", getAllServices);
module.exports = router;
