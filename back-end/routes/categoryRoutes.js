const express = require("express");

const router = express.Router();

const categoryController = require("../controllers/categoryController");

//middleware routes
const { getUserById } = require("../controllers/userController");
const {
  requireSignin,
  isAdmin,
  isAuth,
} = require("../controllers/authController");

// GET /api/categories
router.get("/categories", categoryController.getCategories);

router.get("/category/:categoryId", categoryController.read);

router.put("/category/:categoryId/:userId",
  requireSignin,
  isAuth,
  isAdmin,
  categoryController.updateCategory
);
router.delete("/category/:categoryId/:userId",
  requireSignin,
  isAuth,
  isAdmin,
  categoryController.deleteCategory
);

router.post("/category/create/:userId",
  requireSignin,
  isAuth,
  isAdmin,
  categoryController.createCategory
);
//run the middleware finduserById when there is a param of :userId
router.param("userId", getUserById);
router.param("categoryId", categoryController.getCategoryById);

module.exports = router;
