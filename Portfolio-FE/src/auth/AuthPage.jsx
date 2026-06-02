import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { SignIn, SignUp, useAuth } from "@clerk/react";
import "./AuthPage.css";

// ── Clerk appearance — transparent card that blends into our custom shell ──
function buildClerkAppearance(isDark) {
  const accent   = isDark ? "#8b5cf6" : "#047857";
  const accent2  = isDark ? "#6d28d9" : "#065f46";
  const inputBg  = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const textMain = isDark ? "#f1f5f9" : "#07251a";
  const textSub  = isDark ? "#a0aec0" : "#1a4a34";
  const border   = isDark ? "rgba(139,92,246,0.28)" : "rgba(4,120,87,0.30)";
  const danger   = isDark ? "#f87171" : "#dc2626";

  return {
    variables: {
      colorPrimary: accent,
      colorBackground: "transparent",
      colorInputBackground: inputBg,
      colorInputText: textMain,
      colorText: textMain,
      colorTextSecondary: textSub,
      colorDanger: danger,
      fontFamily: "'DM Sans', 'Manrope', system-ui, sans-serif",
      fontSize: "0.95rem",
      borderRadius: "10px",
      spacingUnit: "0.95rem",
    },
    elements: {
      card: {
        background: "transparent",
        boxShadow: "none",
        padding: "0",
        border: "none",
        width: "100%",
        maxWidth: "440px",
      },
      headerTitle: {
        display: "none",           // we render our own heading
      },
      headerSubtitle: {
        display: "none",
      },
      header: {
        display: "none",
      },
      socialButtonsBlockButton: {
        background: inputBg,
        border: `1px solid ${border}`,
        color: textMain,
        fontWeight: "500",
        transition: "all 0.18s ease",
      },
      socialButtonsBlockButtonText: {
        color: textMain,
      },
      dividerLine: {
        background: border,
      },
      dividerText: {
        color: textSub,
        fontSize: "0.8rem",
      },
      formFieldLabel: {
        color: textSub,
        fontSize: "0.82rem",
        fontWeight: "500",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      },
      formFieldInput: {
        background: inputBg,
        border: `1px solid ${border}`,
        color: textMain,
        transition: "border-color 0.18s ease, box-shadow 0.18s ease",
      },
      formButtonPrimary: {
        background: `linear-gradient(135deg, ${accent} 0%, ${accent2} 100%)`,
        boxShadow: isDark
          ? "0 8px 28px rgba(139,92,246,0.40)"
          : "0 8px 24px rgba(4,120,87,0.35)",
        fontWeight: "600",
        letterSpacing: "0.04em",
        transition: "transform 0.15s ease, box-shadow 0.18s ease",
      },
      footerActionLink: {
        color: accent,
        fontWeight: "500",
      },
      footerActionText: {
        color: textSub,
      },
      identityPreviewEditButton: {
        color: accent,
      },
      otpCodeFieldInput: {
        background: inputBg,
        border: `1px solid ${border}`,
        color: textMain,
      },
      alternativeMethodsBlockButton: {
        background: inputBg,
        border: `1px solid ${border}`,
        color: textMain,
      },
    },
  };
}

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "sign-up" ? "sign-up" : "sign-in";
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn) navigate("/", { replace: true });
  }, [isSignedIn, navigate]);

  // Sync with stored theme
  const savedTheme =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("theme") || "dark"
      : "dark";
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, [savedTheme]);

  const isDark = savedTheme !== "light";
  const appearance = buildClerkAppearance(isDark);

  return (
    <div className="auth-root" data-mode={mode}>
      {/* ── Decorative background ── */}
      <div className="auth-bg" aria-hidden="true">
        <div className="auth-bg__orb auth-bg__orb--a" />
        <div className="auth-bg__orb auth-bg__orb--b" />
        <div className="auth-bg__orb auth-bg__orb--c" />
        <div className="auth-bg__grid" />
      </div>

      {/* ── Left — branding panel ── */}
      <aside className="auth-left">
        <Link to="/" className="auth-left__brand">
          <span className="auth-left__brand-dot" />
          <span className="auth-left__brand-name">hiennt.website</span>
        </Link>

        <div className="auth-left__body">
          <p className="auth-left__eyebrow">Portfolio cá nhân</p>
          <h1 className="auth-left__headline">
            {mode === "sign-up" ? (
              <>Tạo tài khoản<br /><em>miễn phí</em></>
            ) : (
              <>Chào mừng<br /><em>trở lại</em></>
            )}
          </h1>
          <p className="auth-left__sub">
            Đăng nhập để truy cập lộ trình học tập, trợ lý nghề nghiệp AI và bảng
            điều khiển hồ sơ cá nhân của bạn.
          </p>

          <ul className="auth-left__features">
            {[
              ["🗺", "Lộ trình học IT cá nhân hóa"],
              ["🤖", "Trợ lý nghề nghiệp AI"],
              ["📄", "CV builder & import từ ảnh"],
              ["⭐", "Premium không giới hạn AI"],
            ].map(([icon, text]) => (
              <li key={text} className="auth-left__feature">
                <span className="auth-left__feature-icon">{icon}</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Floating glass card */}
        <div className="auth-left__card" aria-hidden="true">
          <div className="auth-left__card-row">
            <span className="auth-left__card-dot" style={{ background: "#8b5cf6" }} />
            <span className="auth-left__card-label">Roadmap Planner</span>
            <span className="auth-left__card-badge">Active</span>
          </div>
          <div className="auth-left__card-row">
            <span className="auth-left__card-dot" style={{ background: "#38bdf8" }} />
            <span className="auth-left__card-label">Career Advisor AI</span>
            <span className="auth-left__card-badge">Online</span>
          </div>
          <div className="auth-left__card-row">
            <span className="auth-left__card-dot" style={{ background: "#34d399" }} />
            <span className="auth-left__card-label">CV Builder</span>
            <span className="auth-left__card-badge">Ready</span>
          </div>
        </div>
      </aside>

      {/* ── Right — form panel ── */}
      <main className="auth-right">
        <div className="auth-right__inner">
          {/* Mode heading */}
          <div className="auth-form-header">
            <h2 className="auth-form-header__title">
              {mode === "sign-up" ? "Tạo tài khoản" : "Đăng nhập"}
            </h2>
            <p className="auth-form-header__sub">
              {mode === "sign-up"
                ? "Điền thông tin để bắt đầu hành trình"
                : "Tiếp tục với tài khoản của bạn"}
            </p>
          </div>

          {/* Clerk widget */}
          <div className="auth-clerk-wrap">
            {mode === "sign-up" ? (
              <SignUp
                routing="virtual"
                signInUrl="/auth?mode=sign-in"
                fallbackRedirectUrl="/"
                forceRedirectUrl="/"
                appearance={appearance}
              />
            ) : (
              <SignIn
                routing="virtual"
                signUpUrl="/auth?mode=sign-up"
                fallbackRedirectUrl="/"
                forceRedirectUrl="/"
                appearance={appearance}
              />
            )}
          </div>

          <p className="auth-back-link">
            <Link to="/">← Về trang chủ</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
