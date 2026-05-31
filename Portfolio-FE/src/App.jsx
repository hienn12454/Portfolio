import { lazy, Suspense, useEffect, useMemo } from "react";
import { HomePage } from "./home/HomePage";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthenticateWithRedirectCallback, useAuth } from "@clerk/react";
import { createApiClient } from "./core/http/apiClient";

// Code-split heavy / rarely-visited routes so the landing page ships a lean bundle.
// HomePage stays eager because it is the first paint for almost every visit.
const CVPage = lazy(() => import("./cv/CVPage").then((m) => ({ default: m.CVPage })));
const CVEditPage = lazy(() => import("./cv/CVEditPage").then((m) => ({ default: m.CVEditPage })));
const PremiumPage = lazy(() => import("./premium/PremiumPage").then((m) => ({ default: m.PremiumPage })));
const AuthPage = lazy(() => import("./auth/AuthPage").then((m) => ({ default: m.AuthPage })));
const AdminPage = lazy(() => import("./admin/AdminPage").then((m) => ({ default: m.AdminPage })));
const UserProfilePage = lazy(() => import("./profile/UserProfilePage").then((m) => ({ default: m.UserProfilePage })));

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
      <Suspense fallback={<div className="route-loading" aria-busy="true" />}>
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
      </Suspense>
    </BrowserRouter>
  );
}
