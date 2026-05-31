import { useEffect, useMemo } from "react";
import { HomePage } from "./home/HomePage";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthenticateWithRedirectCallback, useAuth } from "@clerk/react";
import { AdminPage } from "./admin/AdminPage";
import { UserProfilePage } from "./profile/UserProfilePage";
import { AuthPage } from "./auth/AuthPage";
import { CVPage } from "./cv/CVPage";
import { CVEditPage } from "./cv/CVEditPage";
import { PremiumPage } from "./premium/PremiumPage";
import { createApiClient } from "./core/http/apiClient";

// Tracks login analytics globally — runs regardless of which page the user lands on
function LoginTracker() {
  const { isSignedIn, getToken } = useAuth();
  const apiClient = useMemo(() => createApiClient(getToken), [getToken]);

  useEffect(() => {
    if (!isSignedIn) return;
    const key = "portfolio-login-tracked";
    if (sessionStorage.getItem(key) === "1") return;
    apiClient.postProtected("/api/analytics/login", {})
      .then(() => sessionStorage.setItem(key, "1"))
      .catch(() => { /* ignore analytics errors */ });
  }, [isSignedIn, apiClient]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <LoginTracker />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/cv" element={<CVPage />} />
        <Route path="/cv/edit" element={<CVEditPage />} />
        <Route path="/premium" element={<PremiumPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/profile" element={<UserProfilePage />} />
        <Route path="/admin/sso_callback" element={<AuthenticateWithRedirectCallback signInForceRedirectUrl="/" />} />
        <Route path="/admin/sso-callback" element={<AuthenticateWithRedirectCallback signInForceRedirectUrl="/" />} />
        <Route path="/sso-callback" element={<AuthenticateWithRedirectCallback signInForceRedirectUrl="/" />} />
        <Route path="/admin/*" element={<AdminPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}
