import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { getApiErrorMessage, getCurrentCustomer } from "../services/api";

function Home() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) {
    return (
      <div className="page">
        <Navbar />
        <main className="page-content">
          <p className="loading">Loading your account...</p>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <Navbar />
        <main className="page-content">
          <p className="alert alert-error">{error}</p>
        </main>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  const firstName = customer.fullName.split(" ")[0];

  return (
    <div className="page">
      <Navbar />
      <main className="page-content">
        <section className="dashboard-card">
          <h1>Welcome back, {firstName}!</h1>
          <p className="subtitle">Customer Information</p>

          <dl className="info-list">
            <div>
              <dt>Name</dt>
              <dd>{customer.fullName}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{customer.email}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{customer.phone}</dd>
            </div>
          </dl>

          <div className="home-actions">
            <Link to="/products" className="btn btn-primary">
              Browse Products
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Home;
