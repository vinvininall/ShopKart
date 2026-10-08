import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import {
  addToWishlist,
  getApiErrorMessage,
  getCurrentCustomer,
  getProductById,
  getWishlist,
  removeFromWishlist,
} from "../services/api";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [savedProductIds, setSavedProductIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingWishlist, setIsUpdatingWishlist] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadCustomer = async () => {
      try {
        await getCurrentCustomer();
      } catch (err) {
        if (err.response?.status === 401) {
          navigate("/login", { replace: true });
          return;
        }

        if (isMounted) {
          setError(getApiErrorMessage(err, "Unable to load your account."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadCustomer();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (!id) {
      return;
    }

    let isMounted = true;

    const loadProduct = async () => {
      setIsLoading(true);
      setError("");

      try {
        const [productResponse, wishlistResponse] = await Promise.all([
          getProductById(id),
          getWishlist(),
        ]);

        if (isMounted) {
          setProduct(productResponse.data.product);
          setSavedProductIds((wishlistResponse.data.wishlist || []).map((item) => item._id));
        }
      } catch (err) {
        if (isMounted) {
          const status = err.response?.status;

          if (status === 400) {
            setError("Invalid product ID.");
          } else if (status === 404) {
            setError("Product not found.");
          } else {
            setError("Something went wrong while loading the product.");
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleWishlistToggle = async () => {
    if (!product) {
      return;
    }

    setIsUpdatingWishlist(true);

    try {
      const isSaved = savedProductIds.includes(product._id);

      if (isSaved) {
        await removeFromWishlist(product._id);
        setSavedProductIds((currentIds) => currentIds.filter((itemId) => itemId !== product._id));
      } else {
        await addToWishlist(product._id);
        setSavedProductIds((currentIds) => [...currentIds, product._id]);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to update your wishlist."));
    } finally {
      setIsUpdatingWishlist(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page">
        <Navbar />
        <main className="page-content">
          <p className="loading">Loading product...</p>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <Navbar />
        <main className="page-content detail-page">
          <div className="detail-card error-state">
            <p className="alert alert-error">{error}</p>
            <Link to="/products" className="btn btn-outline">
              Back to products
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const price = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(product.price);

  return (
    <div className="page">
      <Navbar />
      <main className="page-content detail-page">
        <div className="detail-card">
          <img src={product.image} alt={product.name} className="detail-image" />

          <div className="detail-info">
            <div className="detail-header">
              <p className="detail-category">{product.category}</p>
              <h1>{product.name}</h1>
            </div>

            <p className="detail-price">{price}</p>
            <p className="detail-description">{product.description}</p>

            <dl className="detail-list">
              <div>
                <dt>Stock</dt>
                <dd>{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</dd>
              </div>
            </dl>

            <div className="detail-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleWishlistToggle}
                disabled={isUpdatingWishlist}
              >
                {isUpdatingWishlist
                  ? "⏳ Saving..."
                  : savedProductIds.includes(product._id)
                    ? "♥ Added to Wishlist"
                    : "♡ Add to Wishlist"}
              </button>
              <Link to="/products" className="btn btn-outline">
                Back to products
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ProductDetails;
