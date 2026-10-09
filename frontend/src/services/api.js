import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

export const registerCustomer = (data) =>
  api.post("/customers/register", data);

export const loginCustomer = (data) => api.post("/customers/login", data);

export const getCurrentCustomer = () => api.get("/customers/me");

export const getProducts = (query = "") => api.get(`/products${query}`);

export const getProductById = (id) => api.get(`/products/${id}`);

export const getWishlist = () => api.get("/wishlist");

export const addToWishlist = (productId) => api.post(`/wishlist/${productId}`);

export const removeFromWishlist = (productId) => api.delete(`/wishlist/${productId}`);

export const getCart = () => api.get("/cart");

export const addToCart = (productId) => api.post(`/cart/${productId}`);

export const updateCartItemQuantity = (productId, quantity) =>
  api.patch(`/cart/${productId}`, { quantity });

export const removeFromCart = (productId) => api.delete(`/cart/${productId}`);

export const logoutCustomer = () => api.post("/customers/logout");

export const getApiErrorMessage = (error, fallback) => {
  if (!error.response) {
    return "Unable to connect to the server. Please try again.";
  }

  return error.response.data?.message || fallback;
};

export default api;
