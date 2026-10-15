const Razorpay = require("razorpay");

const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    const error = new Error("Razorpay Test Mode credentials are not configured");
    error.statusCode = 503;
    throw error;
  }

  if (!keyId.startsWith("rzp_test_")) {
    const error = new Error("ShopKart checkout only accepts Razorpay Test Mode credentials");
    error.statusCode = 503;
    throw error;
  }

  return {
    client: new Razorpay({ key_id: keyId, key_secret: keySecret }),
    keyId,
    keySecret,
  };
};

module.exports = { getRazorpayClient };
