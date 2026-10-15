const express = require("express");
const protect = require("../middlewares/auth.middleware");
const {
  createPaymentOrder,
  verifyPayment,
  getMyOrders,
  getOrderById,
} = require("../controllers/order.controller");

const router = express.Router();

router.post("/create-payment-order", protect, createPaymentOrder);
router.post("/verify-payment", protect, verifyPayment);
router.get("/", protect, getMyOrders);
router.get("/:id", protect, getOrderById);

module.exports = router;
