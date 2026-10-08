import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import {
  getApiErrorMessage,
  getCurrentCustomer,
  getWishlist,
  removeFromWishlist,
} from "../services/api";

function Wishlist() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingProductId, setRemovingProductId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadCustomerAndWishlist = async () => {
      try {
        const customerResponse = await getCurrentCustomer();

        if (!isMounted) {
          return;
        }

        setCustomer(customerResponse.data);

        const wishlistResponse = await getWishlist();

        if (isMounted) {
          setWishlist(wishlistResponse.data.wishlist || []);
        }
      } catch (err) {
        if (err.response?.status === 401) {
          navigate("/login", { replace: true });
          return;
        }

        if (isMounted) {
          setError(getApiErrorMessage(err, "Something went wrong while loading your wishlist."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadCustomerAndWishlist();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleRemove = async (productId) => {
    setRemovingProductId(productId);

    try {
      await removeFromWishlist(productId);
      setWishlist((currentItems) => currentItems.filter((item) => item._id !== productId));
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to remove this product from your wishlist."));
    } finally {
      setRemovingProductId("");
    }
  };

  const formatPrice = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);

  if (isLoading) {
    return (
      <div className="page">
        <Navbar />
        <main className="page-content">
          <p className="loading">Loading your wishlist...</p>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <Navbar />
        <main className="page-content wishlist-page">
          <div className="empty-state">
            <h2>Something went wrong.</h2>
            <p>We couldn't load your wishlist.</p>
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <div className="page">
      <Navbar />
      <main className="page-content">
        <section className="wishlist-page">
          <div className="wishlist-header">
            <p className="brand-mark">Wishlist</p>
            <h1>My Wishlist</h1>
            {wishlist.length > 0 ? (
              <p className="wishlist-meta">{wishlist.length} product{wishlist.length === 1 ? "" : "s"} saved</p>
            ) : null}
          </div>

          {wishlist.length === 0 ? (
            <div className="empty-state">
              <p aria-label="wishlist empty" className="brand-mark">
                ❤️
              </p>
              <h2>Your wishlist is empty</h2>
              <p>Save products you love and find them here later.</p>
              <Link to="/products" className="btn btn-primary">
                Browse Products
              </Link>
            </div>
          ) : (
            <div className="wishlist-grid">
              {wishlist.map((product) => (
                <article key={product._id} className="wishlist-item">
                  <img src={product.image} alt={product.name} />
                  <div className="wishlist-item-body">
                    <h3>{product.name}</h3>
                    <p className="wishlist-item-price">{formatPrice(product.price)}</p>
                    <p>{product.category}</p>
                    <p>{product.stock > 0 ? `${product.stock} left` : "Out of stock"}</p>

                    <div className="wishlist-actions">
                      <Link to={`/products/${product._id}`} className="btn btn-primary">
                        View Details
                      </Link>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => handleRemove(product._id)}
                        disabled={removingProductId === product._id}
                      >
                        {removingProductId === product._id ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Wishlist;
