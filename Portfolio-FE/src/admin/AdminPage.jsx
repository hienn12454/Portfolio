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
      <div className="dash-loading">
        <div className="dash-loading__spinner" />
        <p>Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  return (
    <div className="dash-root">
      {isAdmin ? <AdminPanel language="vi" /> : null}
    </div>
  );
}
