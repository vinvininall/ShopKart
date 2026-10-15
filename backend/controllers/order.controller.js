const crypto = require("crypto");
const mongoose = require("mongoose");
const Customer = require("../models/customer.model");
const Order = require("../models/order.model");
const Product = require("../models/product.model");
const { getRazorpayClient } = require("../services/payment.service");

const validateShippingAddress = (address) => {
  if (!address || typeof address !== "object" || Array.isArray(address)) {
    return "Shipping address is required";
  }

  const fields = ["fullName", "phone", "addressLine1", "city", "state", "pincode"];
  for (const field of fields) {
    if (typeof address[field] !== "string" || !address[field].trim()) {
      return `${field} is required`;
    }
  }

  if (!/^(?:\+91[\s-]?)?[6-9]\d{9}$/.test(address.phone.trim())) {
    return "Enter a valid Indian phone number";
  }

  if (!/^\d{6}$/.test(address.pincode.trim())) {
    return "Pincode must contain exactly 6 digits";
  }

  return null;
};

const createPaymentOrder = async (req, res) => {
  const addressError = validateShippingAddress(req.body?.shippingAddress);
  if (addressError) {
    return res.status(400).json({ success: false, message: addressError });
  }

  let payment;
  try {
    payment = getRazorpayClient();
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }

  try {
    const customer = await Customer.findById(req.user._id).select("cart");
    if (!customer) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!customer.cart?.length) {
      return res.status(400).json({ success: false, message: "Your cart is empty" });
    }

    const productIds = customer.cart.map((item) => item.product);
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    const productById = new Map(products.map((product) => [product._id.toString(), product]));
    const items = [];

    for (const cartItem of customer.cart) {
      const product = productById.get(cartItem.product.toString());
      if (!product) {
        return res.status(400).json({
          success: false,
          message: "A product in your cart is no longer available. Please update your cart.",
        });
      }

      if (!Number.isInteger(cartItem.quantity) || cartItem.quantity < 1 || cartItem.quantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `${product.name} does not have enough stock for the requested quantity`,
        });
      }

      const pricePaise = Math.round(product.price * 100);
      if (!Number.isSafeInteger(pricePaise) || pricePaise < 1) {
        return res.status(400).json({ success: false, message: `${product.name} has an invalid price` });
      }

      items.push({
        product: product._id,
        name: product.name,
        price: pricePaise / 100,
        quantity: cartItem.quantity,
        image: product.image || "",
        lineTotalPaise: pricePaise * cartItem.quantity,
      });
    }

    const totalAmountPaise = items.reduce((sum, item) => sum + item.lineTotalPaise, 0);
    if (!Number.isSafeInteger(totalAmountPaise) || totalAmountPaise < 1) {
      return res.status(400).json({ success: false, message: "Order total is invalid" });
    }

    const order = await Order.create({
      user: req.user._id,
      items: items.map(({ lineTotalPaise, ...item }) => item),
      shippingAddress: Object.fromEntries(
        ["fullName", "phone", "addressLine1", "city", "state", "pincode"].map((field) => [
          field,
          req.body.shippingAddress[field].trim(),
        ])
      ),
      totalAmount: totalAmountPaise / 100,
      totalAmountPaise,
    });

    try {
      const razorpayOrder = await payment.client.orders.create({
        amount: totalAmountPaise,
        currency: "INR",
        receipt: order._id.toString(),
        notes: { shopKartOrderId: order._id.toString() },
      });

      order.razorpayOrderId = razorpayOrder.id;
      await order.save();

      return res.status(201).json({
        success: true,
        shopKartOrderId: order._id,
        razorpayOrderId: razorpayOrder.id,
        amount: totalAmountPaise,
        currency: "INR",
        key: payment.keyId,
      });
    } catch (error) {
      console.error("Razorpay order initialization failed:", error.message);
      return res.status(502).json({
        success: false,
        message: "Payment service could not initialize your order. Your cart has not been changed.",
      });
    }
  } catch (error) {
    console.error("Order initialization failed:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while initializing your order",
    });
  }
};

const clearCustomerCart = async (customerId) => {
  await Customer.updateOne({ _id: customerId }, { $set: { cart: [] } });
};

const verifyPayment = async (req, res) => {
  const {
    shopKartOrderId,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: razorpaySignature,
  } = req.body || {};

  if (
    typeof shopKartOrderId !== "string" ||
    !mongoose.Types.ObjectId.isValid(shopKartOrderId) ||
    typeof razorpayOrderId !== "string" ||
    !razorpayOrderId ||
    typeof razorpayPaymentId !== "string" ||
    !razorpayPaymentId ||
    typeof razorpaySignature !== "string" ||
    !/^[a-f\d]{64}$/i.test(razorpaySignature)
  ) {
    return res.status(400).json({ success: false, message: "Payment verification details are invalid" });
  }

  try {
    const order = await Order.findOne({ _id: shopKartOrderId, user: req.user._id });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.paymentStatus === "PAID") {
      if (order.razorpayOrderId !== razorpayOrderId || order.razorpayPaymentId !== razorpayPaymentId) {
        return res.status(409).json({ success: false, message: "Order was confirmed with a different payment" });
      }
      return res.status(200).json({
        success: true,
        message: "Payment verified and order confirmed",
        order,
      });
    }

    if (
      order.paymentStatus !== "PENDING" ||
      order.status !== "PENDING_PAYMENT" ||
      order.razorpayOrderId !== razorpayOrderId
    ) {
      return res.status(409).json({ success: false, message: "Order is not awaiting this payment" });
    }

    const { client, keySecret } = getRazorpayClient();
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${order.razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");
    const provided = Buffer.from(razorpaySignature, "hex");
    const expected = Buffer.from(expectedSignature, "hex");

    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
      return res.status(400).json({ success: false, message: "Payment signature is invalid" });
    }

    let paymentDetails;
    try {
      paymentDetails = await client.payments.fetch(razorpayPaymentId);
    } catch (error) {
      console.error("Razorpay payment status lookup failed:", error.message);
      return res.status(502).json({
        success: false,
        message: "Unable to confirm payment status. Please retry verification.",
      });
    }

    if (
      paymentDetails.order_id !== order.razorpayOrderId ||
      paymentDetails.amount !== order.totalAmountPaise ||
      paymentDetails.currency !== "INR"
    ) {
      return res.status(400).json({ success: false, message: "Payment details do not match this order" });
    }

    if (paymentDetails.status !== "captured") {
      return res.status(409).json({
        success: false,
        message: "Payment has not been captured. Your cart has not been cleared.",
      });
    }

    const result = await Order.updateOne(
      {
        _id: order._id,
        user: req.user._id,
        paymentStatus: "PENDING",
        status: "PENDING_PAYMENT",
        razorpayOrderId,
      },
      {
        $set: {
          paymentStatus: "PAID",
          status: "PLACED",
          razorpayPaymentId,
        },
      }
    );

    let confirmedOrder;
    if (result.modifiedCount === 1) {
      confirmedOrder = await Order.findById(order._id);
    } else {
      confirmedOrder = await Order.findOne({
        _id: order._id,
        user: req.user._id,
        paymentStatus: "PAID",
        razorpayOrderId,
        razorpayPaymentId,
      });
      if (!confirmedOrder) {
        return res.status(409).json({ success: false, message: "Order payment state has changed" });
      }
    }

    if (result.modifiedCount === 1) {
      await clearCustomerCart(req.user._id);
    }
    return res.status(200).json({
      success: true,
      message: "Payment verified and order confirmed",
      order: confirmedOrder,
    });
  } catch (error) {
    console.error("Payment verification failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Something went wrong while verifying payment",
    });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error("Order history lookup failed:", error);
    return res.status(500).json({ success: false, message: "Unable to load your orders" });
  }
};

const getOrderById = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id }).lean();
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("Order detail lookup failed:", error);
    return res.status(500).json({ success: false, message: "Unable to load this order" });
  }
};

module.exports = { createPaymentOrder, verifyPayment, getMyOrders, getOrderById };
