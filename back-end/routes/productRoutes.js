const express = require("express");
const { body } = require("express-validator");

const router = express.Router();

const productController = require("../controllers/productController");
// const isAuth = require('../middleware/authMiddleware');

// const multer = require("multer");
// var storage = multer.memoryStorage();
// var upload = multer({ storage: storage });

//middleware routes
const { getUserById } = require("../controllers/userController");
const {
  requireSignin,
  isAdmin,
  isAuth,
} = require("../controllers/authController");

// Retrieve all Tutorials
router.get("/findproducts", productController.findAll);

// Retrieve all published Tutorials
router.get("/published", productController.findAllPublished);

// CRUD Methods
router.get("/product/:productId", productController.read);
router.put(
  "/product/:productId/:userId",
  requireSignin,
  isAuth,
  isAdmin,
  productController.updateProduct
);
router.delete(
  "/product/:productId/:userId",
  requireSignin,
  isAuth,
  isAdmin,
  productController.deleteProduct
);

//Customed GET routes
router.get("/listproducts", productController.getProducts);
router.get("/products/:userId", requireSignin,
  isAuth,
  isAdmin,
  productController.list);
router.get("/products/search", productController.listSearch);
router.get("/products/related/:productId", productController.listRelated);
router.get("/products/categories", productController.listCategories);
router.get("/product/photo/:productId", productController.photo);
router.get("/sold", productController.getProductSoldMost);
//Customed POST routes
router.post("/products/by/search", productController.listBySearch);
router.post("/product/create/:userId",
  requireSignin,
  isAuth,
  isAdmin,
  productController.createProduct
);
//run the middleware finduserById when there is a param of :userId
router.param("userId", getUserById);
router.param("productId", productController.getProductById);

module.exports = router;
