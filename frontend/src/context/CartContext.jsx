import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { addToCart, getCart, removeFromCart, updateCartItemQuantity } from "../services/api";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingActions, setPendingActions] = useState({});

  const refreshCart = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getCart();
      setCartItems(response.data.cart || []);
    } catch (err) {
      if (err.response?.status === 401) {
        setCartItems([]);
        return;
      }

      setCartItems([]);
      setError(err.response?.data?.message || "Unable to load your cart.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const setCartFromResponse = useCallback((responseCart) => {
    setCartItems(responseCart || []);
    setError("");
  }, []);

  const addItemToCart = useCallback(async (productId) => {
    setPendingActions((current) => ({ ...current, [productId]: "add" }));

    try {
      const response = await addToCart(productId);
      setCartFromResponse(response.data.cart || []);
      return response.data.cart || [];
    } catch (err) {
      setError(err.response?.data?.message || "Unable to add this product to your cart.");
      throw err;
    } finally {
      setPendingActions((current) => {
        const next = { ...current };
        delete next[productId];
        return next;
      });
    }
  }, [setCartFromResponse]);

  const updateItemQuantity = useCallback(async (productId, quantity) => {
    setPendingActions((current) => ({ ...current, [productId]: "update" }));

    try {
      const response = await updateCartItemQuantity(productId, quantity);
      setCartFromResponse(response.data.cart || []);
      return response.data.cart || [];
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update this cart item.");
      throw err;
    } finally {
      setPendingActions((current) => {
        const next = { ...current };
        delete next[productId];
        return next;
      });
    }
  }, [setCartFromResponse]);

  const removeItemFromCart = useCallback(async (productId) => {
    setPendingActions((current) => ({ ...current, [productId]: "remove" }));

    try {
      const response = await removeFromCart(productId);
      setCartFromResponse(response.data.cart || []);
      return response.data.cart || [];
    } catch (err) {
      setError(err.response?.data?.message || "Unable to remove this product from your cart.");
      throw err;
    } finally {
      setPendingActions((current) => {
        const next = { ...current };
        delete next[productId];
        return next;
      });
    }
  }, [setCartFromResponse]);

  const value = useMemo(() => ({
    cartItems,
    loading,
    error,
    pendingActions,
    totalItems: cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
    refreshCart,
    addItemToCart,
    updateItemQuantity,
    removeItemFromCart,
  }), [cartItems, loading, error, pendingActions, refreshCart, addItemToCart, updateItemQuantity, removeItemFromCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside a CartProvider");
  }

  return context;
}
