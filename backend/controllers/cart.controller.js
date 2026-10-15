const mongoose = require("mongoose");
const Customer = require("../models/customer.model");
const Product = require("../models/product.model");

const normalizeProductCartEntry = (entry) => ({
  _id: entry.product?._id || entry.product,
  name: entry.product?.name,
  description: entry.product?.description,
  price: entry.product?.price,
  category: entry.product?.category,
  image: entry.product?.image,
  stock: entry.product?.stock,
  quantity: entry.quantity,
});

const getCart = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id)
      .populate({
        path: "cart.product",
        model: "Product",
      })
      .lean();

    if (!customer) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const cartItems = (customer.cart || [])
      .filter((item) => item?.product)
      .map((item) => ({
        _id: item.product._id,
        name: item.product.name,
        description: item.product.description,
        price: item.product.price,
        category: item.product.category,
        image: item.product.image,
        stock: item.product.stock,
        quantity: item.quantity,
      }));
      //same process gets repeated as "Add to cart , except few additions like duplicate availability"

    return res.status(200).json({
      success: true,
      count: cartItems.length,
      cart: cartItems,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong while loading your cart",
    });
  }
};

const addProductToCart = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const customer = await Customer.findById(req.user._id);

    if (!customer) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const existingItem = customer.cart.find((item) => item.product.toString() === productId);

    if (existingItem) {
      const nextQuantity = existingItem.quantity + 1;

      if (nextQuantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: "Requested quantity exceeds available stock",
        });
      }

      existingItem.quantity = nextQuantity;
    } else {
      if (product.stock <= 0) {
        return res.status(400).json({
          success: false,
          message: "Product is currently out of stock",
        });
      }

      customer.cart.push({ product: product._id, quantity: 1 });
    }

    await customer.save();

    const savedCustomer = await Customer.findById(req.user._id).populate("cart.product").lean();
    const cart = (savedCustomer.cart || []).filter((item) => item?.product).map((item) => normalizeProductCartEntry(item));

    return res.status(200).json({
      success: true,
      message: "Product added to cart",
      cart,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong while adding the product to cart",
    });
  }
};

const updateCartItemQuantity = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive integer",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const customer = await Customer.findById(req.user._id);

    if (!customer) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const existingItem = customer.cart.find((item) => item.product.toString() === productId);

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: "Product not found in cart",
      });
    }

    if (quantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: "Requested quantity exceeds available stock",
      });
    }

    existingItem.quantity = quantity;
    await customer.save();

    const savedCustomer = await Customer.findById(req.user._id).populate("cart.product").lean();
    const cart = (savedCustomer.cart || []).filter((item) => item?.product).map((item) => normalizeProductCartEntry(item));

    return res.status(200).json({
      success: true,
      message: "Cart updated successfully",
      cart,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating cart quantity",
    });
  }
};

const removeProductFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const customer = await Customer.findById(req.user._id);

    if (!customer) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const initialLength = customer.cart.length;
    customer.cart = customer.cart.filter((item) => item.product.toString() !== productId);

    if (customer.cart.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: "Product not found in cart",
      });
    }

    await customer.save();

    const savedCustomer = await Customer.findById(req.user._id).populate("cart.product").lean();
    const cart = (savedCustomer.cart || []).filter((item) => item?.product).map((item) => normalizeProductCartEntry(item));

    return res.status(200).json({
      success: true,
      message: "Product removed from cart",
      cart,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong while removing the product from cart",
    });
  }
};

module.exports = {
  getCart,
  addProductToCart,
  updateCartItemQuantity,
  removeProductFromCart,
};
