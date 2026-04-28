import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth, useClerk } from "@clerk/react";
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
  const { signOut } = useClerk();
  const apiClient = useMemo(() => createApiClient(getToken), [getToken]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

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
        setIsAdminUser(me?.user?.role === "Admin");
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [apiClient, isSignedIn]);

  useEffect(() => {
    if (!isUserMenuOpen) {
      return undefined;
    }

    function handleOutsideClick(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isUserMenuOpen]);

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
          <Link to="/" className="brand" aria-label="Go to homepage">
            Portfolio
          </Link>
          <div className="topbar__actions">
            <nav className="nav">
              <Link to="/">Home</Link>
              <Link to="/profile">Profile</Link>
            </nav>
            {isSignedIn ? (
              <div className="user-menu" ref={userMenuRef}>
                <button
                  type="button"
                  className="button button--ghost button--small user-menu__trigger"
                  onClick={() => setIsUserMenuOpen((current) => !current)}
                  aria-haspopup="menu"
                  aria-expanded={isUserMenuOpen}
                >
                  Profile
                </button>
                {isUserMenuOpen ? (
                  <div className="user-menu__dropdown" role="menu">
                    {isAdminUser ? (
                      <Link to="/admin" role="menuitem" onClick={() => setIsUserMenuOpen(false)}>
                        Dashboard
                      </Link>
                    ) : null}
                    <Link to="/profile" role="menuitem" onClick={() => setIsUserMenuOpen(false)}>
                      Hồ sơ
                    </Link>
                    <button
                      type="button"
                      className="user-menu__signout"
                      role="menuitem"
                      onClick={async () => {
                        setIsUserMenuOpen(false);
                        await signOut({ redirectUrl: "/" });
                      }}
                    >
                      Đăng xuất
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
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
