const express = require("express");
const protect = require("../middlewares/auth.middleware");
const {
  addProductToWishlist,
  getWishlist,
  removeProductFromWishlist,
} = require("../controllers/customer.controller");

const router = express.Router();

router.get("/", protect, getWishlist);
router.post("/:productId", protect, addProductToWishlist);
router.delete("/:productId", protect, removeProductFromWishlist);

module.exports = router;
