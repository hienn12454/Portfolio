import { useEffect, useState } from "react";

const labelsByLanguage = {
  en: {
    title: "My Roadmap Plan",
    subtitle: "Generate a private learning roadmap from roadmap.sh data + AI planning.",
    track: "Career track",
    specialty: "Specialty",
    trackPlaceholder: "e.g. IT",
    specialtyPlaceholder: "e.g. DevOps",
    generate: "Generate my plan",
    loading: "Generating plan...",
    empty: "No plans yet. Generate your first roadmap plan.",
    daily: "Daily technical",
    source: "Roadmap source",
    today: "Today's plan",
    viewDetails: "View details",
    hideDetails: "Hide details",
    viewAll: "View all plans",
    hideAll: "Hide plan history",
    createdAt: "Created",
    mustLogin: "Sign in to generate and view your private roadmap plans.",
    errorFallback: "Unable to generate roadmap plan right now."
  },
  vi: {
    title: "Plan Roadmap của tôi",
    subtitle: "Tạo lộ trình học cá nhân (private) từ dữ liệu roadmap.sh kết hợp AI.",
    track: "Nghề tổng quát",
    specialty: "Chuyên ngành hẹp",
    trackPlaceholder: "Ví dụ: IT",
    specialtyPlaceholder: "Ví dụ: DevOps",
    generate: "Tạo plan cho tôi",
    loading: "Đang tạo plan...",
    empty: "Bạn chưa có plan nào. Hãy tạo plan đầu tiên.",
    daily: "Technical mỗi ngày",
    source: "Nguồn roadmap",
    today: "Plan hôm nay",
    viewDetails: "Xem chi tiết",
    hideDetails: "Ẩn chi tiết",
    viewAll: "Xem tất cả",
    hideAll: "Ẩn lịch sử plan",
    createdAt: "Tạo lúc",
    mustLogin: "Hãy đăng nhập để tạo và xem plan roadmap riêng của bạn.",
    errorFallback: "Chưa thể tạo roadmap plan lúc này."
  }
};

export function UserRoadmapPlannerSection({ language, isSignedIn, apiClient }) {
  const labels = labelsByLanguage[language];
  const [track, setTrack] = useState("IT");
  const [specialty, setSpecialty] = useState("DevOps");
  const [todayPlan, setTodayPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSignedIn) {
      setPlans([]);
      return;
    }

    async function loadPlans() {
      try {
        const [today, result] = await Promise.all([
          apiClient.getProtected("/api/roadmap-plans/mine/today"),
          apiClient.getProtected("/api/roadmap-plans/mine")
        ]);
        setTodayPlan(today ?? null);
        setExpandedPlanId(today?.id ?? null);
        setPlans(Array.isArray(result) ? result : []);
      } catch {
        setTodayPlan(null);
        setPlans([]);
      }
    }

    void loadPlans();
  }, [apiClient, isSignedIn]);

  async function handleGenerate(event) {
    event.preventDefault();
    if (!isSignedIn || isLoading) {
      return;
    }

    setError("");
    setIsLoading(true);
    try {
      const result = await apiClient.postProtected("/api/roadmap-plans/mine/generate", {
        track,
        specialty
      });
      setTodayPlan(result);
      setExpandedPlanId(result.id);
      setPlans((current) => [result, ...current]);
    } catch (submitError) {
      setError(submitError?.message ?? labels.errorFallback);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="section container roadmap-plan-section">
      <h2>{labels.title}</h2>
      <p>{labels.subtitle}</p>

      {!isSignedIn ? <p className="error">{labels.mustLogin}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {isSignedIn ? (
        <article className="contact-form roadmap-plan-form">
          <form onSubmit={handleGenerate}>
            <label>
              {labels.track}
              <input value={track} onChange={(event) => setTrack(event.target.value)} placeholder={labels.trackPlaceholder} maxLength={50} required />
            </label>
            <label>
              {labels.specialty}
              <input
                value={specialty}
                onChange={(event) => setSpecialty(event.target.value)}
                placeholder={labels.specialtyPlaceholder}
                maxLength={100}
                required
              />
            </label>
            <button type="submit" className="button button--primary" disabled={isLoading}>
              {isLoading ? labels.loading : labels.generate}
            </button>
          </form>
        </article>
      ) : null}

      <div className="roadmap-plan-list">
        {plans.length === 0 ? <p>{labels.empty}</p> : null}
        {todayPlan ? (
          <article className="card roadmap-plan-card roadmap-plan-card--today">
            <p className="eyebrow">{labels.today}</p>
            <h3>
              {todayPlan.track} / {todayPlan.specialty}
            </h3>
            <p>
              <strong>{labels.daily}:</strong> {todayPlan.dailyTechnical}
            </p>
            <p>
              <strong>{labels.source}:</strong> {todayPlan.sourceRoadmapSlug}
            </p>
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => setExpandedPlanId((current) => (current === todayPlan.id ? null : todayPlan.id))}
            >
              {expandedPlanId === todayPlan.id ? labels.hideDetails : labels.viewDetails}
            </button>
            {expandedPlanId === todayPlan.id ? <pre className="roadmap-plan-card__content">{todayPlan.planMarkdown}</pre> : null}
          </article>
        ) : null}

        {plans.length > 1 ? (
          <button type="button" className="button button--ghost button--small" onClick={() => setShowAllPlans((current) => !current)}>
            {showAllPlans ? labels.hideAll : labels.viewAll}
          </button>
        ) : null}

        {showAllPlans
          ? plans
              .filter((plan) => plan.id !== todayPlan?.id)
              .map((plan) => (
                <article key={plan.id} className="card roadmap-plan-card">
                  <p className="eyebrow">
                    {labels.createdAt}: {new Date(plan.createdAtUtc).toLocaleString()}
                  </p>
                  <h3>
                    {plan.track} / {plan.specialty}
                  </h3>
                  <p>
                    <strong>{labels.daily}:</strong> {plan.dailyTechnical}
                  </p>
                  <p>
                    <strong>{labels.source}:</strong> {plan.sourceRoadmapSlug}
                  </p>
                  <button
                    type="button"
                    className="button button--ghost button--small"
                    onClick={() => setExpandedPlanId((current) => (current === plan.id ? null : plan.id))}
                  >
                    {expandedPlanId === plan.id ? labels.hideDetails : labels.viewDetails}
                  </button>
                  {expandedPlanId === plan.id ? <pre className="roadmap-plan-card__content">{plan.planMarkdown}</pre> : null}
                </article>
              ))
          : null}
      </div>
    </section>
  );
}
