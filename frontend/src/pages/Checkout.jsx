import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { useCart } from "../context/CartContext.jsx";
import { createPaymentOrder, getApiErrorMessage, verifyPayment } from "../services/api";

const emptyAddress = {
  fullName: "",
  phone: "",
  addressLine1: "",
  city: "",
  state: "",
  pincode: "",
};

const fields = [
  ["fullName", "Full name", "text", "name"],
  ["phone", "Phone number", "tel", "tel"],
  ["addressLine1", "Address line 1", "text", "street-address"],
  ["city", "City", "text", "address-level2"],
  ["state", "State", "text", "address-level1"],
  ["pincode", "Six-digit pincode", "text", "postal-code"],
];

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value || 0);

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    let existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      if (existingScript.dataset.loadFailed === "true") {
        existingScript.remove();
        existingScript = null;
      }
    }

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(Boolean(window.Razorpay)), { once: true });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => {
      script.dataset.loadFailed = "true";
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

function Checkout() {
  const navigate = useNavigate();
  const { cartItems, loading: cartLoading, clearCart } = useCart();
  const [address, setAddress] = useState(emptyAddress);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(null);
  const verifyInProgress = useRef(false);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const validateAddress = () => {
    const errors = {};
    for (const [key, label] of fields) {
      if (!address[key].trim()) errors[key] = `${label} is required.`;
    }
    if (address.phone.trim() && !/^(?:\+91[\s-]?)?[6-9]\d{9}$/.test(address.phone.trim())) {
      errors.phone = "Enter a valid Indian phone number.";
    }
    if (address.pincode.trim() && !/^\d{6}$/.test(address.pincode.trim())) {
      errors.pincode = "Pincode must contain exactly 6 digits.";
    }
    return errors;
  };

  const confirmPayment = async (paymentDetails) => {
    if (verifyInProgress.current) return;
    verifyInProgress.current = true;
    setPendingPayment(paymentDetails);
    setError("");
    setIsSubmitting(true);

    try {
      const response = await verifyPayment(paymentDetails);
      clearCart();
      navigate(`/orders/${response.data.order._id}`, {
        replace: true,
        state: { paidConfirmed: true },
      });
    } catch (verificationError) {
      setError(getApiErrorMessage(verificationError, "Unable to verify payment. Please retry verification."));
    } finally {
      verifyInProgress.current = false;
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const validationErrors = validateAddress();
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length) {
      setError("Please correct the highlighted shipping details.");
      return;
    }
    if (cartLoading || cartItems.length === 0) {
      setError("Your cart is empty. Add items before checkout.");
      return;
    }

    setIsSubmitting(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Payment checkout could not be loaded. Check your connection and try again.");
      }

      const response = await createPaymentOrder(address);
      const paymentOrder = response.data;
      const checkout = new window.Razorpay({
        key: paymentOrder.key,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: "ShopKart",
        description: "Order payment",
        order_id: paymentOrder.razorpayOrderId,
        handler: (paymentResponse) => {
          confirmPayment({
            shopKartOrderId: paymentOrder.shopKartOrderId,
            ...paymentResponse,
          });
        },
        modal: {
          ondismiss: () => {
            if (!verifyInProgress.current) {
              setIsSubmitting(false);
              setError("Payment was cancelled. Your cart is unchanged.");
            }
          },
        },
        theme: { color: "#c2410c" },
      });

      checkout.on("payment.failed", (paymentFailure) => {
        setIsSubmitting(false);
        setError(paymentFailure.error?.description || "Payment failed. Your cart is unchanged.");
      });
      checkout.open();
    } catch (submitError) {
      setIsSubmitting(false);
      setError(submitError.response
        ? getApiErrorMessage(submitError, "Unable to initialize payment.")
        : submitError.message || "Unable to initialize payment.");
    }
  };

  if (cartLoading) {
    return <div className="page"><Navbar /><main className="page-content"><p className="loading">Loading your cart...</p></main></div>;
  }

  if (!cartItems.length) {
    return (
      <div className="page">
        <Navbar />
        <main className="page-content checkout-page">
          <section className="empty-state">
            <h1>Your cart is empty</h1>
            <p>Add products before starting checkout.</p>
            <Link className="btn btn-primary" to="/products">Browse Products</Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <Navbar />
      <main className="page-content checkout-page">
        <section className="checkout-shell">
          <div className="cart-header">
            <div><p className="brand-mark">Checkout</p><h1>Delivery details</h1></div>
            <Link to="/cart">Back to cart</Link>
          </div>
          {error ? <p className="alert alert-error" role="alert">{error}</p> : null}
          {pendingPayment ? (
            <div className="alert alert-error" role="status">
              Payment was received by the browser, but ShopKart has not confirmed it yet.
              <button className="btn btn-outline retry-verification" type="button" onClick={() => confirmPayment(pendingPayment)} disabled={isSubmitting}>
                {isSubmitting ? "Verifying..." : "Retry verification"}
              </button>
            </div>
          ) : null}
          <div className="checkout-layout">
            <form className="checkout-form" onSubmit={handleSubmit} noValidate>
              <h2>Shipping address</h2>
              {fields.map(([key, label, type, autocomplete]) => (
                <div className="field" key={key}>
                  <label htmlFor={key}>{label}</label>
                  <input
                    id={key}
                    name={key}
                    type={type}
                    autoComplete={autocomplete}
                    value={address[key]}
                    onChange={(event) => {
                      setAddress((current) => ({ ...current, [key]: event.target.value }));
                      setFieldErrors((current) => ({ ...current, [key]: "" }));
                    }}
                    aria-invalid={Boolean(fieldErrors[key])}
                    aria-describedby={fieldErrors[key] ? `${key}-error` : undefined}
                  />
                  {fieldErrors[key] ? <span className="field-error" id={`${key}-error`}>{fieldErrors[key]}</span> : null}
                </div>
              ))}
              <button className="btn btn-primary" type="submit" disabled={isSubmitting || Boolean(pendingPayment)}>
                {isSubmitting ? "Processing..." : "Place order and pay"}
              </button>
              <p className="checkout-note">Your final payable amount is validated by the server. Test Mode payment only.</p>
            </form>

            <aside className="cart-summary checkout-summary">
              <h2>Order summary</h2>
              {cartItems.map((item) => (
                <div className="checkout-item" key={item._id}>
                  {item.image ? <img src={item.image} alt="" /> : null}
                  <div><strong>{item.name}</strong><span>Qty {item.quantity} × {formatPrice(item.price)}</span></div>
                  <strong>{formatPrice(item.price * item.quantity)}</strong>
                </div>
              ))}
              <div className="summary-row total-row"><span>Payable total</span><strong>{formatPrice(subtotal)}</strong></div>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Checkout;
