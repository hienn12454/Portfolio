import { HomePage } from "./home/HomePage";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthenticateWithRedirectCallback } from "@clerk/react";
import { AdminPage } from "./admin/AdminPage";
import { UserProfilePage } from "./profile/UserProfilePage";
import { AuthPage } from "./auth/AuthPage";
import { CVPage } from "./cv/CVPage";
import { CVEditPage } from "./cv/CVEditPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/cv" element={<CVPage />} />
        <Route path="/cv/edit" element={<CVEditPage />} />
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
