import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { getApiErrorMessage, getOrderById } from "../services/api";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value || 0);

function OrderDetails() {
  const { id } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getOrderById(id)
      .then((response) => { if (active) setOrder(response.data.order); })
      .catch((loadError) => { if (active) setError(getApiErrorMessage(loadError, "Unable to load this order.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  return (
    <div className="page">
      <Navbar />
      <main className="page-content orders-page">
        <section className="orders-shell">
          {loading ? <p className="loading">Loading order...</p> : null}
          {error ? <div className="empty-state"><p className="alert alert-error">{error}</p><Link className="btn btn-outline" to="/orders">Back to My Orders</Link></div> : null}
          {order ? (
            <>
              <div className="cart-header">
                <div>
                  <p className="brand-mark">{location.state?.paidConfirmed && order.paymentStatus === "PAID" ? "Payment confirmed" : "Order details"}</p>
                  <h1>Order #{order._id.slice(-8).toUpperCase()}</h1>
                </div>
                <Link to="/orders">My Orders</Link>
              </div>
              <div className="order-detail-card">
                <div className="order-detail-status">
                  <div><span>Payment</span><strong>{order.paymentStatus}</strong></div>
                  <div><span>Order status</span><strong>{order.status.replaceAll("_", " ")}</strong></div>
                  <div><span>Placed</span><strong>{new Date(order.createdAt).toLocaleString("en-IN")}</strong></div>
                </div>
                <h2>Items</h2>
                {order.items.map((item, index) => (
                  <div className="checkout-item" key={`${order._id}-${index}`}>
                    {item.image ? <img src={item.image} alt="" /> : null}
                    <div><strong>{item.name}</strong><span>Qty {item.quantity} × {formatPrice(item.price)}</span></div>
                    <strong>{formatPrice(item.price * item.quantity)}</strong>
                  </div>
                ))}
                <div className="summary-row total-row"><span>Total paid</span><strong>{formatPrice(order.totalAmount)}</strong></div>
                <h2>Shipping address</h2>
                <address>
                  {order.shippingAddress.fullName}<br />
                  {order.shippingAddress.addressLine1}<br />
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}<br />
                  {order.shippingAddress.phone}
                </address>
              </div>
              <div className="order-links">
                <Link className="btn btn-outline" to="/orders">View all orders</Link>
                <Link className="btn btn-primary" to="/products">Continue shopping</Link>
              </div>
            </>
          ) : null}
        </section>
      </main>
    </div>
  );
}

export default OrderDetails;
