import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getCurrentCustomer } from "../services/api";

function ProtectedRoute() {
  const location = useLocation();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;

    getCurrentCustomer()
      .then(() => {
        if (active) setStatus("authenticated");
      })
      .catch((error) => {
        if (active) setStatus(error.response?.status === 401 ? "unauthenticated" : "error");
      });

    return () => {
      active = false;
    };
  }, []);

  if (status === "loading") {
    return <main className="page-content"><p className="loading">Checking your account...</p></main>;
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (status === "error") {
    return (
      <main className="page-content">
        <p className="alert alert-error">Unable to verify your account. Please try again.</p>
      </main>
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;
