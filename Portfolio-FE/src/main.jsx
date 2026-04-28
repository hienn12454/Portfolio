import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import App from "./App";
import "./styles.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const APP_ORIGIN = import.meta.env.VITE_APP_ORIGIN ?? window.location.origin;
const DEFAULT_REDIRECT_URL = `${APP_ORIGIN}/`;
const SIGN_IN_FALLBACK_REDIRECT_URL =
  import.meta.env.VITE_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL ?? DEFAULT_REDIRECT_URL;
const SIGN_UP_FALLBACK_REDIRECT_URL =
  import.meta.env.VITE_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL ?? DEFAULT_REDIRECT_URL;

const root = ReactDOM.createRoot(document.getElementById("root"));

if (!PUBLISHABLE_KEY) {
  root.render(
    <React.StrictMode>
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0b0f19",
          color: "#e5e7eb",
          padding: "24px",
          fontFamily: "Inter, Segoe UI, system-ui, sans-serif"
        }}
      >
        <section style={{ maxWidth: "720px", lineHeight: 1.6 }}>
          <h1 style={{ marginBottom: "8px" }}>Missing frontend environment variable</h1>
          <p style={{ margin: 0 }}>
            Please set <code>VITE_CLERK_PUBLISHABLE_KEY</code> in your deploy environment and rebuild.
          </p>
        </section>
      </main>
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <ClerkProvider
        publishableKey={PUBLISHABLE_KEY}
        afterSignOutUrl="/"
        signInForceRedirectUrl={SIGN_IN_FALLBACK_REDIRECT_URL}
        signUpForceRedirectUrl={SIGN_UP_FALLBACK_REDIRECT_URL}
        signInFallbackRedirectUrl={SIGN_IN_FALLBACK_REDIRECT_URL}
        signUpFallbackRedirectUrl={SIGN_UP_FALLBACK_REDIRECT_URL}
      >
        <App />
      </ClerkProvider>
    </React.StrictMode>
  );
}
