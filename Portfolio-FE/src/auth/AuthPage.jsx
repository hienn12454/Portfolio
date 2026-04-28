import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { SignIn, SignUp, useAuth } from "@clerk/react";

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "sign-up" ? "sign-up" : "sign-in";

  const { isSignedIn } = useAuth();
  useEffect(() => {
    if (isSignedIn) {
      navigate("/", { replace: true });
    }
  }, [isSignedIn, navigate]);

  return (
    <main className="site">
      <section className="section container" style={{ display: "grid", justifyItems: "center" }}>
        {mode === "sign-up" ? (
          <SignUp routing="virtual" signInUrl="/auth?mode=sign-in" fallbackRedirectUrl="/" forceRedirectUrl="/" />
        ) : (
          <SignIn routing="virtual" signUpUrl="/auth?mode=sign-up" fallbackRedirectUrl="/" forceRedirectUrl="/" />
        )}
        <p className="auth-back auth-back--center">
          <Link to="/">Back to home</Link>
        </p>
      </section>
    </main>
  );
}
