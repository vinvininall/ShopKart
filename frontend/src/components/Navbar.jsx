import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CartBadge from "./CartBadge.jsx";
import { getApiErrorMessage, logoutCustomer } from "../services/api";

function Navbar() {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const handleLogout = async () => {
    setError("");
    setIsLoggingOut(true);

    try {
      await logoutCustomer();
      navigate("/login");
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/login");
        return;
      }

      setError(getApiErrorMessage(err, "Unable to log out. Please try again."));
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/home" className="brand">
          ShopKart
        </Link>
        <nav className="navbar-links">
          <Link to="/home">Home</Link>
          <Link to="/products">Products</Link>
          <Link to="/wishlist">Wishlist</Link>
          <CartBadge />
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </nav>
      </div>
      {error ? <p className="navbar-error">{error}</p> : null}
    </header>
  );
}

export default Navbar;
