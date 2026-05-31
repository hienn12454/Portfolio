import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { createApiClient } from "../core/http/apiClient";
import "./PremiumPage.css";

const content = {
  en: {
    brand: "Premium",
    back: "Back to home",
    title: "Upgrade to Premium",
    subtitle: "Unlock the full Portfolio experience. Cancel anytime.",
    perks: [
      "Unlimited AI Career Advisor & Roadmap Planner",
      "Advanced CV templates & PDF export",
      "Premium badge and a highlighted profile"
    ],
    statusActive: "Your Premium is active",
    statusInactive: "You are on the Free plan",
    plan: "Plan",
    expires: "Expires",
    daysLeft: "days left",
    autoRenewOn: "Auto-renew is on",
    autoRenewOff: "Auto-renew is off (access until expiry)",
    renew: "Renew",
    subscribe: "Upgrade now",
    current: "Current plan",
    cancel: "Cancel subscription",
    cancelConfirm: "Cancel Premium? You keep access until the expiry date.",
    perMonth: "/ month",
    perYear: "/ year",
    bestValue: "Best value · 2 months free",
    mockNote: "Demo checkout — activation is instant, no real payment is charged.",
    signInPrompt: "Please sign in to manage your Premium plan.",
    processing: "Processing...",
    planNames: { monthly: "Monthly", yearly: "Yearly" }
  },
  vi: {
    brand: "Premium",
    back: "Về trang chủ",
    title: "Nâng cấp Premium",
    subtitle: "Mở khóa toàn bộ trải nghiệm Portfolio. Hủy bất cứ lúc nào.",
    perks: [
      "AI tư vấn nghề & Roadmap Planner không giới hạn",
      "Mẫu CV nâng cao & xuất PDF",
      "Huy hiệu Premium và hồ sơ nổi bật"
    ],
    statusActive: "Premium của bạn đang hoạt động",
    statusInactive: "Bạn đang dùng gói Miễn phí",
    plan: "Gói",
    expires: "Hết hạn",
    daysLeft: "ngày còn lại",
    autoRenewOn: "Tự động gia hạn: Bật",
    autoRenewOff: "Tự động gia hạn: Tắt (dùng đến khi hết hạn)",
    renew: "Gia hạn",
    subscribe: "Nâng cấp ngay",
    current: "Gói hiện tại",
    cancel: "Hủy gói",
    cancelConfirm: "Hủy Premium? Bạn vẫn dùng được đến ngày hết hạn.",
    perMonth: "/ tháng",
    perYear: "/ năm",
    bestValue: "Tiết kiệm nhất · tặng 2 tháng",
    mockNote: "Thanh toán demo — kích hoạt tức thì, không thu tiền thật.",
    signInPrompt: "Vui lòng đăng nhập để quản lý gói Premium.",
    processing: "Đang xử lý...",
    planNames: { monthly: "Theo tháng", yearly: "Theo năm" }
  }
};

function formatCurrency(amount, currency, language) {
  try {
    return new Intl.NumberFormat(language === "vi" ? "vi-VN" : "en-US", {
      style: "currency",
      currency: currency || "VND",
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function PremiumPage() {
  const navigate = useNavigate();
  const { isSignedIn, getToken } = useAuth();
  const apiClient = useMemo(() => createApiClient(getToken), [getToken]);
  const publicApiClient = useMemo(() => createApiClient(async () => null), []);

  const [language] = useState(() => {
    try {
      return localStorage.getItem("portfolio-language") === "vi" ? "vi" : "en";
    } catch {
      return "en";
    }
  });
  const t = content[language];

  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState(null);
  const [busyPlan, setBusyPlan] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState("");

  // Keep theme consistent with the rest of the site.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("portfolio-theme");
      document.documentElement.setAttribute("data-theme", saved === "light" ? "light" : "dark");
    } catch {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  useEffect(() => {
    async function loadPlans() {
      try {
        const result = await publicApiClient.getPublic("/api/premium/plans");
        setPlans(Array.isArray(result) ? result : []);
      } catch {
        setPlans([]);
      }
    }
    loadPlans();
  }, [publicApiClient]);

  const refreshStatus = useCallback(async () => {
    if (!isSignedIn) {
      setStatus(null);
      return;
    }
    try {
      const result = await apiClient.getProtected("/api/premium/me");
      setStatus(result ?? null);
    } catch {
      setStatus(null);
    }
  }, [apiClient, isSignedIn]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  async function handleSubscribe(planId) {
    if (!isSignedIn) {
      navigate("/auth?mode=sign-in");
      return;
    }
    setError("");
    setBusyPlan(planId);
    try {
      const result = await apiClient.postProtected("/api/premium/me/subscribe", { plan: planId });
      setStatus(result);
    } catch (err) {
      setError(err?.message ?? "Error");
    } finally {
      setBusyPlan(null);
    }
  }

  async function handleCancel() {
    if (!window.confirm(t.cancelConfirm)) {
      return;
    }
    setError("");
    setIsCancelling(true);
    try {
      const result = await apiClient.postProtected("/api/premium/me/cancel", {});
      setStatus(result);
    } catch (err) {
      setError(err?.message ?? "Error");
    } finally {
      setIsCancelling(false);
    }
  }

  const isPremium = Boolean(status?.isPremium);
  const expiryDate = status?.expiresAtUtc ? new Date(status.expiresAtUtc).toLocaleDateString() : null;

  return (
    <main className="premium-page">
      <header className="premium-topbar">
        <div className="container premium-topbar__inner">
          <Link to="/" className="premium-brand">✨ {t.brand}</Link>
          <Link to="/" className="premium-back">← {t.back}</Link>
        </div>
      </header>

      <section className="container premium-hero">
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
        <ul className="premium-perks">
          {t.perks.map((perk) => (
            <li key={perk}>{perk}</li>
          ))}
        </ul>
      </section>

      {error ? <p className="container premium-error">{error}</p> : null}

      {!isSignedIn ? (
        <p className="container premium-signin">{t.signInPrompt}</p>
      ) : (
        <section className={`container premium-status ${isPremium ? "is-active" : ""}`}>
          <div>
            <strong>{isPremium ? t.statusActive : t.statusInactive}</strong>
            {isPremium ? (
              <p>
                {t.plan}: {t.planNames[status.plan] ?? status.plan} · {t.expires}: {expiryDate} ·{" "}
                {status.daysRemaining} {t.daysLeft}
              </p>
            ) : null}
            {isPremium ? (
              <p className="premium-status__renew">{status.autoRenew ? t.autoRenewOn : t.autoRenewOff}</p>
            ) : null}
          </div>
          {isPremium && status.autoRenew ? (
            <button type="button" className="button button--ghost button--small" onClick={handleCancel} disabled={isCancelling}>
              {isCancelling ? t.processing : t.cancel}
            </button>
          ) : null}
        </section>
      )}

      <section className="container premium-plans">
        {plans.map((plan) => {
          const isCurrent = isPremium && status?.plan === plan.id;
          const busy = busyPlan === plan.id;
          return (
            <article key={plan.id} className={`premium-plan-card ${plan.id === "yearly" ? "is-featured" : ""}`}>
              {plan.id === "yearly" ? <span className="premium-plan-card__ribbon">{t.bestValue}</span> : null}
              <h3>{t.planNames[plan.id] ?? plan.name}</h3>
              <p className="premium-plan-card__price">
                {formatCurrency(plan.price, plan.currency, language)}
                <span>{plan.id === "yearly" ? t.perYear : t.perMonth}</span>
              </p>
              <ul className="premium-plan-card__perks">
                {t.perks.map((perk) => (
                  <li key={perk}>{perk}</li>
                ))}
              </ul>
              <button
                type="button"
                className="button button--primary"
                onClick={() => handleSubscribe(plan.id)}
                disabled={busy}
              >
                {busy ? t.processing : isCurrent ? t.renew : isPremium ? t.renew : t.subscribe}
              </button>
              {isCurrent ? <span className="premium-plan-card__current">{t.current}</span> : null}
            </article>
          );
        })}
      </section>

      <p className="container premium-mock-note">{t.mockNote}</p>
    </main>
  );
}
