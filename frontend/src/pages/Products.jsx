import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import ProductCard from "../components/ProductCard.jsx";
import SearchBar from "../components/SearchBar.jsx";
import {
  addToWishlist,
  getApiErrorMessage,
  getCurrentCustomer,
  getProducts,
  getWishlist,
  removeFromWishlist,
} from "../services/api";

const categories = ["All Categories", "Electronics", "Fashion", "Books", "Home"];

function Products() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [products, setProducts] = useState([]);
  const [savedProductIds, setSavedProductIds] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [isLoading, setIsLoading] = useState(true);
  const [wishlistLoading, setWishlistLoading] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadCustomer = async () => {
      try {
        const response = await getCurrentCustomer();
        if (isMounted) {
          setCustomer(response.data);
        }
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
    if (!customer) {
      return;
    }

    let isMounted = true;

    const fetchProducts = async () => {
      setIsLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();

        if (search.trim()) {
          params.set("search", search.trim());
        }

        if (category !== "All Categories") {
          params.set("category", category);
        }

        const queryString = params.toString();
        const productResponse = await getProducts(queryString ? `?${queryString}` : "");
        const wishlistResponse = await getWishlist();

        if (isMounted) {
          setProducts(productResponse.data.products || []);
          setSavedProductIds((wishlistResponse.data.wishlist || []).map((product) => product._id));
        }
      } catch (err) {
        if (isMounted) {
          setError("Something went wrong while loading products.");
          setProducts([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setWishlistLoading("");
        }
      }
    };

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [customer, search, category]);

  const handleWishlistToggle = async (productId) => {
    const isSaved = savedProductIds.includes(productId);
    setWishlistLoading(productId);

    try {
      if (isSaved) {
        await removeFromWishlist(productId);
        setSavedProductIds((currentIds) => currentIds.filter((id) => id !== productId));
      } else {
        await addToWishlist(productId);
        setSavedProductIds((currentIds) => [...currentIds, productId]);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to update your wishlist."));
    } finally {
      setWishlistLoading("");
    }
  };

  const pageHeading = customer ? `${customer.fullName.split(" ")[0]}'s catalog` : "Catalog";

  return (
    <div className="page">
      <Navbar />
      <main className="page-content products-page">
        <section className="catalog-shell">
          <div className="catalog-header">
            <div>
              <p className="brand-mark catalog-brand">Catalog</p>
              <h1>{pageHeading}</h1>
            </div>
          </div>

          <SearchBar
            search={search}
            setSearch={setSearch}
            category={category}
            setCategory={setCategory}
            categories={categories}
          />

          {error ? <p className="alert alert-error">{error}</p> : null}

          {isLoading ? (
            <p className="loading">Loading products...</p>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <h2>No products found.</h2>
            </div>
          ) : (
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  isWishlisted={savedProductIds.includes(product._id)}
                  isProcessing={wishlistLoading === product._id}
                  onWishlistToggle={handleWishlistToggle}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Products;
