import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";

function CartBadge() {
  const navigate = useNavigate();
  const { totalItems } = useCart();

  return (
    <button type="button" className="nav-cart-button" onClick={() => navigate("/cart")}>
      <span>Cart</span>
      <span className="nav-cart-count">{totalItems}</span>
    </button>
  );
}

export default CartBadge;
