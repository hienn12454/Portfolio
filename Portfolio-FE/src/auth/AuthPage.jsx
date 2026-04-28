import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, useSignIn, useSignUp } from "@clerk/react";

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "sign-up" ? "sign-up" : "sign-in";
  const [mode, setMode] = useState(initialMode);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [form, setForm] = useState({
    identifier: "",
    password: "",
    emailAddress: "",
    username: ""
  });

  const { isSignedIn } = useAuth();
  const { signIn, setActive: setActiveSignIn, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: isSignUpLoaded } = useSignUp();
  const isLoaded = isSignInLoaded && isSignUpLoaded;

  useMemo(() => {
    if (isSignedIn) {
      navigate("/", { replace: true });
    }
  }, [isSignedIn, navigate]);

  async function handleGoogleAuth() {
    if (!isLoaded || !signIn || !signUp) {
      return;
    }

    setError("");
    const payload = {
      strategy: "oauth_google",
      redirectUrl: "/sso-callback",
      redirectUrlComplete: "/"
    };

    if (mode === "sign-in") {
      await signIn.authenticateWithRedirect(payload);
      return;
    }

    await signUp.authenticateWithRedirect(payload);
  }

  async function handleSignInSubmit(event) {
    event.preventDefault();
    if (!isLoaded || !signIn) {
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const result = await signIn.create({
        identifier: form.identifier.trim(),
        password: form.password
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActiveSignIn({ session: result.createdSessionId });
        navigate("/", { replace: true });
      }
    } catch (signInError) {
      setError(signInError?.errors?.[0]?.longMessage ?? "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignUpSubmit(event) {
    event.preventDefault();
    if (!isLoaded || !signUp) {
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const result = await signUp.create({
        emailAddress: form.emailAddress.trim(),
        username: form.username.trim() || undefined,
        password: form.password
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActiveSignUp({ session: result.createdSessionId });
        navigate("/", { replace: true });
        return;
      }

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setVerificationPending(true);
    } catch (signUpError) {
      setError(signUpError?.errors?.[0]?.longMessage ?? "Unable to sign up.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerificationSubmit(event) {
    event.preventDefault();
    if (!signUp) {
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: verificationCode.trim() });
      if (result.status === "complete" && result.createdSessionId) {
        await setActiveSignUp({ session: result.createdSessionId });
        navigate("/", { replace: true });
      }
    } catch (verifyError) {
      setError(verifyError?.errors?.[0]?.longMessage ?? "Invalid verification code.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="site auth-page">
      <section className="section container">
        <div className="auth-shell">
          <div className="auth-header">
            <p className="eyebrow">Account Access</p>
            <h1>{mode === "sign-in" ? "Welcome back" : "Create your account"}</h1>
            <p>Sign in or sign up to manage your profile and access dashboard features.</p>
            <div className="auth-tabs">
              <button
                type="button"
                className={mode === "sign-in" ? "filter-chip is-active" : "filter-chip"}
                onClick={() => {
                  setMode("sign-in");
                  setVerificationPending(false);
                  setError("");
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                className={mode === "sign-up" ? "filter-chip is-active" : "filter-chip"}
                onClick={() => {
                  setMode("sign-up");
                  setVerificationPending(false);
                  setError("");
                }}
              >
                Sign up
              </button>
            </div>
          </div>

          <article className="contact-form auth-card">
            <button type="button" className="button button--primary auth-google" onClick={handleGoogleAuth} disabled={!isLoaded}>
              Continue with Google
            </button>

            <div className="auth-divider">
              <span>or use email</span>
            </div>

            {mode === "sign-in" ? (
              <form onSubmit={handleSignInSubmit}>
                <label>
                  Email or username
                  <input
                    value={form.identifier}
                    onChange={(event) => setForm((current) => ({ ...current, identifier: event.target.value }))}
                    autoComplete="username"
                    required
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    autoComplete="current-password"
                    required
                  />
                </label>
                <button type="submit" className="button button--primary" disabled={isSubmitting || !isLoaded}>
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </button>
              </form>
            ) : null}

            {mode === "sign-up" && !verificationPending ? (
              <form onSubmit={handleSignUpSubmit}>
                <label>
                  Username
                  <input
                    value={form.username}
                    onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                    autoComplete="username"
                    required
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={form.emailAddress}
                    onChange={(event) => setForm((current) => ({ ...current, emailAddress: event.target.value }))}
                    autoComplete="email"
                    required
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    autoComplete="new-password"
                    required
                  />
                </label>
                <button type="submit" className="button button--primary" disabled={isSubmitting || !isLoaded}>
                  {isSubmitting ? "Creating account..." : "Create account"}
                </button>
              </form>
            ) : null}

            {mode === "sign-up" && verificationPending ? (
              <form onSubmit={handleVerificationSubmit}>
                <label>
                  Verification code
                  <input
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value)}
                    required
                  />
                </label>
                <button type="submit" className="button button--primary" disabled={isSubmitting}>
                  {isSubmitting ? "Verifying..." : "Verify email"}
                </button>
              </form>
            ) : null}

            {error ? <p className="error">{error}</p> : null}
            <p className="auth-back">
              <Link to="/">Back to home</Link>
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
