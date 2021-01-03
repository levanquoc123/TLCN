const express = require("express");
const router = express.Router();

const {
  requireSignin,
  isAuth,
  isAdmin,
} = require("../controllers/authController");
const {
  getUserById,
  addOrderToUserHistory,
} = require("../controllers/userController");
const {
  getOrderById,
  createOrder,
  getOrders,
  getOrdersByValue,
  getStatusValues,
  updateOrderStatus,
} = require("../controllers/orderController");
const { decreaseQuantity } = require("../controllers/productController");
router.post("/order/create/:userId",
  requireSignin,
  isAuth,
  addOrderToUserHistory,
  decreaseQuantity,
  createOrder
);
router.get("/order/list/:userId", requireSignin, isAuth, isAdmin, getOrders);
router.get("/order/listchart/", getOrdersByValue);
router.get("/order/status-values/:userId",
  requireSignin,
  isAuth,
  isAdmin,
  getStatusValues
);
router.put("/order/:orderId/status/:userId",
  requireSignin,
  isAuth,
  isAdmin,
  updateOrderStatus
);

router.param("userId", getUserById);
router.param("orderId", getOrderById);

module.exports = router;
