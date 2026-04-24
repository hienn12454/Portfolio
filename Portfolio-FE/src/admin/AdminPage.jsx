import { Link } from "react-router-dom";
import { Show, SignInButton } from "@clerk/react";
import { AdminPanel } from "./AdminPanel";

export function AdminPage() {
  return (
    <main className="site">
      <header className="topbar">
        <div className="container topbar__content">
          <span className="brand">Admin</span>
          <nav className="nav">
            <Link to="/">Home</Link>
          </nav>
        </div>
      </header>

      <Show when="signed-out">
        <section className="section container">
          <h2>Admin Access Required</h2>
          <p>Sign in with your Clerk account to continue.</p>
          <SignInButton mode="modal">
            <button type="button" className="button button--primary">
              Sign in
            </button>
          </SignInButton>
        </section>
      </Show>

      <Show when="signed-in">
        <AdminPanel language="en" />
      </Show>
    </main>
  );
}
