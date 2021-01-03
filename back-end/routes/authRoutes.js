const express = require("express");
const router = express.Router();

const { verifySignUp } = require("../middleware");

const {
  signUp,
  signIn,
  signOut,
  forgotPassword,
  resetPassword,
  confirmationPost,
  resendTokenPost,
  getHomeAll,
} = require("../controllers/authController");

const {
  userSignupValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} = require("../validator");

router.get("/test/all", getHomeAll);

router.post("/signup", userSignupValidator, signUp);
router.post("/signin", signIn);
router.get("/signout", signOut);

router.put("/forgot-password", forgotPasswordValidator, forgotPassword);
router.put("/reset-password", resetPasswordValidator, resetPassword);

router.post("/confirmation", confirmationPost);
router.post("/resend", resendTokenPost);

module.exports = router;
