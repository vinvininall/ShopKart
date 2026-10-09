const express = require("express");
const protect = require("../middlewares/auth.middleware");
const {
  getCart,
  addProductToCart,
  updateCartItemQuantity,
  removeProductFromCart,
} = require("../controllers/cart.controller");

const router = express.Router();

router.get("/", protect, getCart);
router.post("/:productId", protect, addProductToCart);
router.patch("/:productId", protect, updateCartItemQuantity);
router.delete("/:productId", protect, removeProductFromCart);

module.exports = router;
