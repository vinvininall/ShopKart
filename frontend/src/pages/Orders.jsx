import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { getApiErrorMessage, getMyOrders } from "../services/api";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value || 0);

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getMyOrders();
      setOrders(response.data.orders || []);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Unable to load your orders."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, []);

  return (
    <div className="page">
      <Navbar />
      <main className="page-content orders-page">
        <section className="orders-shell">
          <div className="cart-header">
            <div><p className="brand-mark">ShopKart</p><h1>My Orders</h1></div>
            <Link to="/products">Continue shopping</Link>
          </div>
          {loading ? <p className="loading">Loading your orders...</p> : null}
          {error ? <div className="empty-state"><p className="alert alert-error">{error}</p><button className="btn btn-primary" onClick={loadOrders}>Try again</button></div> : null}
          {!loading && !error && orders.length === 0 ? (
            <div className="empty-state"><h2>No orders yet</h2><p>Your completed purchases will appear here.</p><Link className="btn btn-primary" to="/products">Browse Products</Link></div>
          ) : null}
          {!loading && !error ? (
            <div className="order-list">
              {orders.map((order) => (
                <article className="order-card" key={order._id}>
                  <div className="order-card-header">
                    <div><span className="order-label">Order</span><strong>#{order._id.slice(-8).toUpperCase()}</strong></div>
                    <time dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</time>
                  </div>
                  <div className="order-card-items">{order.items.map((item, index) => <p key={`${order._id}-${index}`}>{item.name} <span>× {item.quantity}</span></p>)}</div>
                  <div className="order-card-footer">
                    <span>{order.paymentStatus} · {order.status.replaceAll("_", " ")}</span>
                    <strong>{formatPrice(order.totalAmount)}</strong>
                    <Link to={`/orders/${order._id}`}>View details</Link>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

export default Orders;
