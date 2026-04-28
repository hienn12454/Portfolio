import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { AdminPanel } from "./AdminPanel";
import { createApiClient } from "../core/http/apiClient";

export function AdminPage() {
  const navigate = useNavigate();
  const { isSignedIn, getToken } = useAuth();
  const apiClient = useMemo(() => createApiClient(getToken), [getToken]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function resolveAdminAccess() {
      if (!isSignedIn) {
        navigate("/", { replace: true });
        return;
      }

      try {
        const me = await apiClient.getProtected("/api/auth/me");
        const hasAdminRole = me?.user?.role === "Admin";
        setIsAdmin(hasAdminRole);
        if (!hasAdminRole) {
          navigate("/", { replace: true });
          return;
        }
      } catch {
        navigate("/", { replace: true });
        return;
      } finally {
        setIsChecking(false);
      }
    }

    resolveAdminAccess();
  }, [apiClient, isSignedIn, navigate]);

  if (isChecking) {
    return (
      <main className="site">
        <section className="section container">
          <h2>Checking admin access...</h2>
        </section>
      </main>
    );
  }

  return (
    <main className="site">
      <header className="topbar">
        <div className="container topbar__content">
          <Link to="/" className="brand" aria-label="Go to homepage">
            Dashboard
          </Link>
          <nav className="nav">
            <Link to="/">Home</Link>
          </nav>
        </div>
      </header>

      {isAdmin ? <AdminPanel language="en" /> : null}
    </main>
  );
}
