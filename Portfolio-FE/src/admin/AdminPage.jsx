import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { AdminPanel } from "./AdminPanel";
import { createApiClient } from "../core/http/apiClient";

export function AdminPage() {
  const navigate = useNavigate();
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const apiClient = useMemo(() => createApiClient(getToken), [getToken]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function resolveAdminAccess() {
      if (!isLoaded) {
        return;
      }
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
  }, [apiClient, isLoaded, isSignedIn, navigate]);

  if (isChecking) {
    return (
      <div className="admin-page-shell">
        <header className="page-shell-header">
          <div className="page-shell-header__inner">
            <Link to="/" className="page-shell-header__brand">hiennt.website</Link>
            <Link to="/" className="page-shell-header__back">← Về trang chủ</Link>
          </div>
        </header>
        <div className="dash-loading">
          <div className="dash-loading__spinner" />
          <p>Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-shell">
      <header className="page-shell-header">
        <div className="page-shell-header__inner">
          <Link to="/" className="page-shell-header__brand">hiennt.website</Link>
          <nav style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Link to="/cv" className="page-shell-header__back">Xem CV</Link>
          </nav>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        {isAdmin ? <AdminPanel language="vi" /> : null}
      </main>

      <footer className="page-shell-footer">
        <div className="page-shell-footer__inner">
          <span>© {new Date().getFullYear()} hiennt.website — Admin Dashboard</span>
        </div>
      </footer>
    </div>
  );
}
