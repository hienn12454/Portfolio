import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Show, UserButton, useAuth } from "@clerk/react";
import { createApiClient } from "../core/http/apiClient";

const EMPTY_PROFILE = {
  displayName: "",
  dateOfBirth: "",
  phoneNumber: "",
  address: "",
  occupation: ""
};

export function UserProfilePage() {
  const { isSignedIn, getToken } = useAuth();
  const apiClient = useMemo(() => createApiClient(getToken), [getToken]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState(EMPTY_PROFILE);

  useEffect(() => {
    async function loadProfile() {
      if (!isSignedIn) {
        setLoading(false);
        return;
      }

      try {
        const me = await apiClient.getProtected("/api/auth/me");
        setProfile({
          displayName: me?.user?.displayName ?? "",
          dateOfBirth: me?.user?.dateOfBirth ?? "",
          phoneNumber: me?.user?.phoneNumber ?? "",
          address: me?.user?.address ?? "",
          occupation: me?.user?.occupation ?? ""
        });
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [apiClient, isSignedIn]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const payload = {
        displayName: profile.displayName || null,
        dateOfBirth: profile.dateOfBirth || null,
        phoneNumber: profile.phoneNumber || null,
        address: profile.address || null,
        occupation: profile.occupation || null
      };
      await apiClient.putProtected("/api/auth/me/profile", payload);
      setMessage("Profile updated successfully.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="site">
      <header className="topbar">
        <div className="container topbar__content">
          <span className="brand">Portfolio</span>
          <div className="topbar__actions">
            <nav className="nav">
              <Link to="/">Home</Link>
              <Link to="/admin">Admin</Link>
              <Link to="/profile">Profile</Link>
            </nav>
            <Show when="signed-in">
              <UserButton afterSignOutUrl="/" />
            </Show>
          </div>
        </div>
      </header>

      <section className="section container">
        <h2>User Profile</h2>
        <p>Update your public profile details used by the portfolio system.</p>

        {!isSignedIn ? <p className="error">Please sign in to edit your profile.</p> : null}
        {loading ? <p>Loading profile...</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {message ? <p>{message}</p> : null}

        {isSignedIn && !loading ? (
          <article className="contact-form">
            <form onSubmit={handleSubmit}>
              <label>
                Display name
                <input
                  value={profile.displayName}
                  onChange={(event) => setProfile((current) => ({ ...current, displayName: event.target.value }))}
                  maxLength={120}
                />
              </label>
              <label>
                Date of birth
                <input
                  type="date"
                  value={profile.dateOfBirth}
                  onChange={(event) => setProfile((current) => ({ ...current, dateOfBirth: event.target.value }))}
                />
              </label>
              <label>
                Phone number
                <input
                  value={profile.phoneNumber}
                  onChange={(event) => setProfile((current) => ({ ...current, phoneNumber: event.target.value }))}
                  maxLength={30}
                />
              </label>
              <label>
                Address
                <input
                  value={profile.address}
                  onChange={(event) => setProfile((current) => ({ ...current, address: event.target.value }))}
                  maxLength={300}
                />
              </label>
              <label>
                Occupation
                <input
                  value={profile.occupation}
                  onChange={(event) => setProfile((current) => ({ ...current, occupation: event.target.value }))}
                  maxLength={120}
                />
              </label>
              <button type="submit" className="button button--primary" disabled={saving}>
                {saving ? "Saving..." : "Save profile"}
              </button>
            </form>
          </article>
        ) : null}
      </section>
    </main>
  );
}
