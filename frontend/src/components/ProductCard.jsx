import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";

function ProductCard({
  product,
  isWishlisted = false,
  isProcessing = false,
  onWishlistToggle,
}) {
  const { addItemToCart, pendingActions } = useCart();
  const price = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(product.price);

  const stockText = product.stock > 0 ? `${product.stock} units left` : "Out of stock";
  const isAddingToCart = Boolean(pendingActions[product._id]);

  const handleWishlistClick = () => {
    if (onWishlistToggle) {
      onWishlistToggle(product._id);
    }
  };

  const handleAddToCart = async () => {
    if (product.stock <= 0) {
      return;
    }

    try {
      await addItemToCart(product._id);
    } catch (error) {
      return;
    }
  };

  return (
    <article className="product-card">
      <img src={product.image} alt={product.name} className="product-image" />
      <div className="product-content">
        <h3>{product.name}</h3>
        <p className="product-category">{product.category}</p>
        <p className="product-price">{price}</p>
        <p className="product-stock">{stockText}</p>

        <div className="product-actions">
          <Link to={`/products/${product._id}`} className="btn btn-primary product-link">
            View Details
          </Link>

          <button
            type="button"
            className="btn btn-primary add-to-cart-button"
            onClick={handleAddToCart}
            disabled={isAddingToCart || product.stock <= 0}
          >
            {isAddingToCart ? "⏳ Adding..." : product.stock > 0 ? "Add to Cart" : "Out of Stock"}
          </button>

          <button
            type="button"
            className="btn btn-outline wishlist-button"
            onClick={handleWishlistClick}
            disabled={isProcessing || isWishlisted}
          >
            {isProcessing ? "⏳ Saving..." : isWishlisted ? "♥ Added to Wishlist" : "♡ Add to Wishlist"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
