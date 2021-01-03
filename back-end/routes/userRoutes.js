const express = require("express");
const router = express.Router();

const {
  requireSignin,
  isAdmin,
  isAuth,
} = require("../controllers/authController");

const {
  getUserById,
  read,
  updateUser,
  purchaseHistory,
} = require("../controllers/userController");

router.get("/secret/:userId", requireSignin, isAuth, isAdmin, (req, res) => {
  res.json({
    user: req.profile,
  });
});
// CRUD routes
router.get("/user/:userId", requireSignin, isAuth, read);
router.put("/user/:userId", requireSignin, isAuth, updateUser);
router.get("/orders/by/user/:userId", requireSignin, isAuth, purchaseHistory);
//run the middleware finduserById when there is a param of :userId
router.param("userId", getUserById);

module.exports = router;
