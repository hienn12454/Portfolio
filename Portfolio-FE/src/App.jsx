import { HomePage } from "./home/HomePage";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthenticateWithRedirectCallback } from "@clerk/react";
import { AdminPage } from "./admin/AdminPage";
import { UserProfilePage } from "./profile/UserProfilePage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/profile" element={<UserProfilePage />} />
        <Route path="/admin/sso_callback" element={<AuthenticateWithRedirectCallback signInForceRedirectUrl="/" />} />
        <Route path="/sso-callback" element={<AuthenticateWithRedirectCallback signInForceRedirectUrl="/" />} />
        <Route path="/admin/*" element={<AdminPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}
