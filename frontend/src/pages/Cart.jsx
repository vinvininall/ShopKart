import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { useCart } from "../context/CartContext.jsx";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

function Cart() {
  const { cartItems, loading, error, refreshCart, updateItemQuantity, removeItemFromCart, pendingActions } = useCart();

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleQuantityChange = async (productId, nextQuantity) => {
    if (nextQuantity < 1) {
      return;
    }

    await updateItemQuantity(productId, nextQuantity);
  };

  const isBusy = (productId) => Boolean(pendingActions[productId]);

  if (loading) {
    return (
      <div className="page">
        <Navbar />
        <main className="page-content cart-page">
          <p className="loading">Loading your cart...</p>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <Navbar />
        <main className="page-content cart-page">
          <div className="empty-state">
            <h2>Something went wrong.</h2>
            <p>{error}</p>
            <button type="button" className="btn btn-primary" onClick={refreshCart}>
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <Navbar />
      <main className="page-content cart-page">
        <section className="cart-shell">
          <div className="cart-header">
            <div>
              <p className="brand-mark">Cart</p>
              <h1>My Cart</h1>
            </div>
            {cartItems.length > 0 ? (
              <p className="cart-meta">
                {totalItems} item{totalItems === 1 ? "" : "s"} • {cartItems.length} product
                {cartItems.length === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>

          {cartItems.length === 0 ? (
            <div className="empty-state cart-empty">
              <p aria-label="cart empty" className="brand-mark">
                🛒
              </p>
              <h2>Your cart is empty</h2>
              <p>Browse products and add your favorites to continue.</p>
              <Link to="/products" className="btn btn-primary">
                Browse Products
              </Link>
            </div>
          ) : (
            <div className="cart-layout">
              <div className="cart-items">
                {cartItems.map((item) => (
                  <article key={item._id} className="cart-item">
                    <img src={item.image} alt={item.name} className="cart-item-image" />
                    <div className="cart-item-body">
                      <div>
                        <h3>{item.name}</h3>
                        <p className="cart-item-category">{item.category}</p>
                        <p className="cart-item-price">{formatPrice(item.price)}</p>
                      </div>

                      <div className="cart-item-controls">
                        <div className="quantity-stepper" aria-label={`Quantity controls for ${item.name}`}>
                          <button
                            type="button"
                            className="stepper-button"
                            onClick={() => handleQuantityChange(item._id, item.quantity - 1)}
                            disabled={item.quantity <= 1 || isBusy(item._id)}
                          >
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            className="stepper-button"
                            onClick={() => handleQuantityChange(item._id, item.quantity + 1)}
                            disabled={item.quantity >= item.stock || isBusy(item._id)}
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          className="btn btn-outline remove-cart-button"
                          onClick={() => removeItemFromCart(item._id)}
                          disabled={isBusy(item._id)}
                        >
                          {isBusy(item._id) ? "Updating..." : "Remove"}
                        </button>
                      </div>

                      <p className="cart-line-total">Subtotal: {formatPrice(item.price * item.quantity)}</p>
                    </div>
                  </article>
                ))}
              </div>

              <aside className="cart-summary">
                <h2>Order Summary</h2>
                <div className="summary-row">
                  <span>Items</span>
                  <strong>{totalItems}</strong>
                </div>
                <div className="summary-row">
                  <span>Distinct products</span>
                  <strong>{cartItems.length}</strong>
                </div>
                <div className="summary-row total-row">
                  <span>Subtotal</span>
                  <strong>{formatPrice(subtotal)}</strong>
                </div>
                <button type="button" className="btn btn-primary checkout-button" disabled={cartItems.length === 0}>
                  Proceed to Checkout
                </button>
              </aside>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Cart;
