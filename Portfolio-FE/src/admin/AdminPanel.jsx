import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/react";
import { createApiClient } from "../core/http/apiClient";

const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";
const EMPTY_CONTACT = { id: EMPTY_GUID, email: "", phone: "", location: "", githubUrl: "", linkedInUrl: "" };
const EMPTY_PAGE = {
  id: EMPTY_GUID,
  heroTitle: "",
  heroDescription: "",
  aboutTitle: "",
  aboutDescription: "",
  heroTitleColor: "",
  heroDescriptionColor: "",
  heroTypingSpeedMs: 28,
  aboutTitleColor: "",
  aboutDescriptionColor: "",
  skillsTitleColor: "",
  skillsDescriptionColor: "",
  projectsTitleColor: "",
  projectsDescriptionColor: "",
  contactTitleColor: "",
  contactDescriptionColor: ""
};
const EMPTY_ARTICLE = { id: EMPTY_GUID, title: "", slug: "", summary: "", content: "", isPublished: false };
const EMPTY_SKILL = { id: EMPTY_GUID, name: "", description: "", displayOrder: 0, isVisible: true };
const EMPTY_PROJECT = {
  id: EMPTY_GUID,
  title: "",
  slug: "",
  category: "fullstack",
  role: "",
  summary: "",
  stack: "",
  caseStudy: "",
  impact: "",
  demoUrl: "",
  repositoryUrl: "",
  isFeatured: false
};

function buildSmoothPath(points) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
  }
  return d;
}

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

function offsetDate(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function AdminLineChart({ apiClient, language }) {
  const today = useMemo(() => new Date(), []);
  const [range, setRange] = useState("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const [chartKey, setChartKey] = useState(0); // increments on new data → triggers CSS fade-in
  const svgRef = useRef(null);

  const getDateRange = () => {
    const end = toDateStr(today);
    if (range === "7d")  return { startDate: toDateStr(offsetDate(today, -6)),  endDate: end };
    if (range === "30d") return { startDate: toDateStr(offsetDate(today, -29)), endDate: end };
    if (range === "3m")  return { startDate: toDateStr(offsetDate(today, -89)), endDate: end };
    if (range === "custom" && customStart && customEnd) return { startDate: customStart, endDate: customEnd };
    return { startDate: toDateStr(offsetDate(today, -6)), endDate: end };
  };

  useEffect(() => {
    const { startDate, endDate } = getDateRange();
    if (!startDate || !endDate) return;
    setLoading(true);
    setTooltip(null);
    apiClient.getProtected(`/api/analytics/chart-data?startDate=${startDate}&endDate=${endDate}`)
      .then((data) => { setChartData(Array.isArray(data) ? data : []); setChartKey((k) => k + 1); })
      .catch(() => setChartData([]))
      .finally(() => setLoading(false));
  }, [range, customStart, customEnd, apiClient]);

  // ── SVG dimensions — taller canvas for better resolution ──
  const W = 720, H = 240;
  const PAD = { top: 24, right: 32, bottom: 40, left: 50 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;

  const pvData = chartData.map((d) => d.pageViews ?? 0);
  const lgData = chartData.map((d) => d.logins    ?? 0);
  const nuData = chartData.map((d) => d.newUsers   ?? 0);
  const n = chartData.length;

  // Nice round max so grid lines land on clean numbers
  const rawMax = Math.max(...pvData, ...lgData, ...nuData, 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const maxVal = Math.ceil(rawMax / magnitude) * magnitude || 1;

  const xs = (i) => n < 2 ? PAD.left + cw / 2 : PAD.left + (i / (n - 1)) * cw;
  const ys = (v) => PAD.top + ch - (v / maxVal) * ch;

  const pvPts = pvData.map((v, i) => ({ x: xs(i), y: ys(v) }));
  const lgPts = lgData.map((v, i) => ({ x: xs(i), y: ys(v) }));
  const nuPts = nuData.map((v, i) => ({ x: xs(i), y: ys(v) }));

  const areaPath = (pts) => {
    if (pts.length < 2) return "";
    const line = buildSmoothPath(pts);
    const bot = PAD.top + ch;
    return `${line} L ${pts[pts.length - 1].x},${bot} L ${pts[0].x},${bot} Z`;
  };

  // 5 evenly-spaced grid lines with clean labels
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: PAD.top + ch * (1 - f),
    label: Math.round(maxVal * f),
  }));

  // X-axis ticks: max ~8 ticks regardless of range
  const xLabels = (() => {
    if (n === 0) return [];
    const maxTicks = range === "7d" ? 7 : 8;
    const step = Math.max(1, Math.ceil(n / maxTicks));
    const indices = [];
    for (let i = 0; i < n; i += step) indices.push(i);
    if (indices[indices.length - 1] !== n - 1) indices.push(n - 1);
    return indices.map((i) => {
      const d = new Date(chartData[i].date + "T00:00:00");
      const label = range === "3m"
        ? `${d.getDate()}/${d.getMonth() + 1}`
        : `${d.getDate()}/${d.getMonth() + 1}`;
      return { x: xs(i), label };
    });
  })();

  // Only render dots when data is sparse (≤ 30 points) — avoids clutter
  const showDots = n <= 30;

  const handleMouseMove = (e) => {
    if (!svgRef.current || n === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const relX = svgX - PAD.left;
    const idx = Math.round((relX / cw) * (n - 1));
    const clamped = Math.max(0, Math.min(n - 1, idx));
    const d = chartData[clamped];
    setTooltip({ idx: clamped, x: xs(clamped), date: d.date, pv: d.pageViews, lg: d.logins, nu: d.newUsers });
  };

  const presets = [
    { id: "7d",     label: language === "vi" ? "7 ngày"   : "7 days"   },
    { id: "30d",    label: language === "vi" ? "30 ngày"  : "30 days"  },
    { id: "3m",     label: language === "vi" ? "3 tháng"  : "3 months" },
    { id: "custom", label: language === "vi" ? "Tùy chỉnh": "Custom"   },
  ];

  // Theme-aware SVG text colors via CSS custom properties
  const tickStyle  = { fill: "var(--text-soft)",  fontFamily: "Calibri, DM Sans, system-ui, sans-serif", fontVariantNumeric: "tabular-nums" };
  const gridStyle  = { stroke: "var(--surface-border)" };

  return (
    <div className="adm-chart-wrap">
      {/* ── Filter row ── */}
      <div className="adm-chart-header">
        <div className="adm-chart-filters">
          {presets.map((p) => (
            <button key={p.id} type="button"
              className={`adm-chart-filter-btn${range === p.id ? " is-active" : ""}`}
              onClick={() => setRange(p.id)}>
              {p.label}
            </button>
          ))}
          {range === "custom" && (
            <div className="adm-chart-datepicker">
              <input type="date" value={customStart}
                min={toDateStr(offsetDate(today, -365))} max={customEnd || toDateStr(today)}
                onChange={(e) => { setCustomStart(e.target.value); if (customEnd && e.target.value > customEnd) setCustomEnd(e.target.value); }}
                className="adm-chart-date-input" />
              <span>→</span>
              <input type="date" value={customEnd}
                min={customStart || toDateStr(offsetDate(today, -365))} max={toDateStr(today)}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="adm-chart-date-input" />
            </div>
          )}
        </div>

        {/* ── Legend ── */}
        <div className="adm-chart-legend">
          <span className="adm-legend-item"><span className="adm-legend-dot" style={{ background: "#8b5cf6" }} />{language === "vi" ? "Lượt truy cập" : "Page views"}</span>
          <span className="adm-legend-item"><span className="adm-legend-dot" style={{ background: "#38bdf8" }} />{language === "vi" ? "Đăng nhập" : "Logins"}</span>
          <span className="adm-legend-item"><span className="adm-legend-dot" style={{ background: "#fb923c" }} />{language === "vi" ? "User mới" : "New users"}</span>
        </div>
      </div>

      {/* ── Chart SVG ── */}
      <div className="adm-chart-svg-wrap">
        {loading && (
          <div className="adm-chart-loading">
            <div className="adm-chart-loading__spinner" />
            <span>{language === "vi" ? "Đang tải dữ liệu..." : "Loading..."}</span>
          </div>
        )}
        <svg
          key={chartKey}
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className={`adm-chart-svg${!loading && n > 0 ? " is-ready" : ""}`}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        >
          <defs>
            <linearGradient id="grad-pv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#8b5cf6" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.00" />
            </linearGradient>
            <linearGradient id="grad-lg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#38bdf8" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.00" />
            </linearGradient>
            <linearGradient id="grad-nu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#fb923c" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#fb923c" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* ── Y-axis baseline ── */}
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + ch}
            stroke="var(--surface-border)" strokeWidth="1" />

          {/* ── Grid lines + Y labels ── */}
          {gridLines.map((g) => (
            <g key={g.y}>
              <line x1={PAD.left} y1={g.y} x2={W - PAD.right} y2={g.y}
                style={gridStyle} strokeWidth={g.label === 0 ? "1.5" : "1"} strokeDasharray={g.label === 0 ? "0" : "5,5"} />
              <text x={PAD.left - 8} y={g.y + 4} textAnchor="end" fontSize="11" style={tickStyle}>{g.label}</text>
            </g>
          ))}

          {/* ── X labels ── */}
          {xLabels.map((t) => (
            <text key={t.label + t.x} x={t.x} y={H - 8} textAnchor="middle" fontSize="11" style={tickStyle}>{t.label}</text>
          ))}

          {/* ── Area fills ── */}
          {n > 1 && <>
            <path d={areaPath(pvPts)} fill="url(#grad-pv)" />
            <path d={areaPath(lgPts)} fill="url(#grad-lg)" />
            <path d={areaPath(nuPts)} fill="url(#grad-nu)" />
          </>}

          {/* ── Lines ── */}
          {n > 1 && <>
            <path d={buildSmoothPath(pvPts)} fill="none" stroke="#8b5cf6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d={buildSmoothPath(lgPts)} fill="none" stroke="#38bdf8" strokeWidth="2"   strokeLinecap="round" strokeLinejoin="round" />
            <path d={buildSmoothPath(nuPts)} fill="none" stroke="#fb923c" strokeWidth="2"   strokeLinecap="round" strokeLinejoin="round" />
          </>}

          {/* ── Dots — only when sparse ── */}
          {showDots && pvPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#8b5cf6" stroke="var(--bg-elevated,var(--bg))" strokeWidth="2" />)}
          {showDots && lgPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3"   fill="#38bdf8" stroke="var(--bg-elevated,var(--bg))" strokeWidth="2" />)}
          {showDots && nuPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3"   fill="#fb923c" stroke="var(--bg-elevated,var(--bg))" strokeWidth="2" />)}

          {/* ── Hover crosshair ── */}
          {tooltip && (
            <>
              <line x1={tooltip.x} y1={PAD.top} x2={tooltip.x} y2={PAD.top + ch}
                stroke="var(--accent)" strokeWidth="1" strokeDasharray="4,3" opacity="0.5" />
              {/* active dot highlights */}
              <circle cx={tooltip.x} cy={pvPts[tooltip.idx]?.y ?? 0} r="5" fill="#8b5cf6" stroke="var(--bg-elevated,var(--bg))" strokeWidth="2.5" />
              <circle cx={tooltip.x} cy={lgPts[tooltip.idx]?.y ?? 0} r="4.5" fill="#38bdf8" stroke="var(--bg-elevated,var(--bg))" strokeWidth="2.5" />
              <circle cx={tooltip.x} cy={nuPts[tooltip.idx]?.y ?? 0} r="4.5" fill="#fb923c" stroke="var(--bg-elevated,var(--bg))" strokeWidth="2.5" />
            </>
          )}
        </svg>

        {/* ── Tooltip ── */}
        {tooltip && (() => {
          const svgEl = svgRef.current;
          const svgW = svgEl ? svgEl.clientWidth : 720;
          const tipX = (tooltip.x / W) * svgW;
          const isRight = tipX < svgW * 0.62;
          const d = new Date(tooltip.date + "T00:00:00");
          const dateStr = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "short", year: "numeric" });
          return (
            <div className="adm-chart-tooltip" style={{ left: isRight ? tipX + 14 : "auto", right: isRight ? "auto" : svgW - tipX + 14 }}>
              <div className="adm-chart-tooltip__date">{dateStr}</div>
              <div className="adm-chart-tooltip__row">
                <span className="adm-legend-dot" style={{ background: "#8b5cf6" }} />
                <span>{language === "vi" ? "Truy cập" : "Views"}</span>
                <strong>{(tooltip.pv ?? 0).toLocaleString()}</strong>
              </div>
              <div className="adm-chart-tooltip__row">
                <span className="adm-legend-dot" style={{ background: "#38bdf8" }} />
                <span>{language === "vi" ? "Đăng nhập" : "Logins"}</span>
                <strong>{(tooltip.lg ?? 0).toLocaleString()}</strong>
              </div>
              <div className="adm-chart-tooltip__row">
                <span className="adm-legend-dot" style={{ background: "#fb923c" }} />
                <span>{language === "vi" ? "User mới" : "New users"}</span>
                <strong>{(tooltip.nu ?? 0).toLocaleString()}</strong>
              </div>
            </div>
          );
        })()}
      </div>

      {n === 0 && !loading && (
        <p className="adm-chart-empty">{language === "vi" ? "Chưa có dữ liệu trong khoảng thời gian này." : "No data in this date range."}</p>
      )}
    </div>
  );
}

export function AdminPanel({ language = "en" }) {
  const { isSignedIn, getToken } = useAuth();
  const apiClient = useMemo(() => createApiClient(getToken), [getToken]);
  const [me, setMe] = useState(null);
  const [adminStatus, setAdminStatus] = useState("unknown");
  const [error, setError] = useState("");
  const [contact, setContact] = useState(EMPTY_CONTACT);
  const [page, setPage] = useState(EMPTY_PAGE);
  const [articles, setArticles] = useState([]);
  const [draftArticle, setDraftArticle] = useState(EMPTY_ARTICLE);
  const [skills, setSkills] = useState([]);
  const [draftSkill, setDraftSkill] = useState(EMPTY_SKILL);
  const [projects, setProjects] = useState([]);
  const [draftProject, setDraftProject] = useState(EMPTY_PROJECT);
  const [analytics, setAnalytics] = useState({ totalPageViews: 0, totalLogins: 0, totalUsers: 0 });
  const [usersActivity, setUsersActivity] = useState([]);
  const [pageOrigins, setPageOrigins] = useState({ pathSummary: [], referrerSummary: [], recentViews: [] });
  const [saveState, setSaveState] = useState("");
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    if (!isSignedIn) {
      setMe(null);
      setAdminStatus("unknown");
      setError("");
      return;
    }

    async function load() {
      setError("");
      try {
        const meData = await apiClient.getProtected("/api/auth/me");
        setMe(meData);
      } catch (meError) {
        setError(meError.message);
      }

      try {
        await apiClient.getProtected("/api/auth/admin-check");
        setAdminStatus("admin");
      } catch {
        setAdminStatus("user");
      }
    }

    load();
  }, [apiClient, isSignedIn]);

  useEffect(() => {
    if (adminStatus !== "admin") {
      return;
    }

    async function loadContent() {
      try {
        const [contactData, pageData, articleData, skillData, projectData, analyticsData, usersData, originsData] = await Promise.all([
          apiClient.getPublic("/api/content/contact"),
          apiClient.getPublic("/api/content/page"),
          apiClient.getProtected("/api/articles/admin"),
          apiClient.getProtected("/api/skills/admin"),
          apiClient.getPublic("/api/projects"),
          apiClient.getProtected("/api/analytics/summary"),
          apiClient.getProtected("/api/analytics/users-activity"),
          apiClient.getProtected("/api/analytics/page-origins"),
        ]);

        setContact((current) => ({ ...current, ...(contactData ?? {}) }));
        setPage((current) => ({ ...current, ...(pageData ?? {}) }));
        setArticles(Array.isArray(articleData) ? articleData : []);
        setSkills(Array.isArray(skillData) ? skillData : []);
        setProjects(Array.isArray(projectData) ? projectData : []);
        setAnalytics({
          totalPageViews: analyticsData?.totalPageViews ?? 0,
          totalLogins: analyticsData?.totalLogins ?? 0,
          totalUsers: analyticsData?.totalUsers ?? 0,
        });
        setUsersActivity(Array.isArray(usersData) ? usersData : []);
        setPageOrigins({
          pathSummary: originsData?.pathSummary ?? [],
          referrerSummary: originsData?.referrerSummary ?? [],
          recentViews: originsData?.recentViews ?? [],
        });
      } catch (loadError) {
        setError(loadError.message);
      }
    }

    loadContent();
  }, [adminStatus, apiClient]);

  const labels =
    language === "vi"
      ? {
          title: "Bảng điều khiển quản trị",
          signInHint: "Đăng nhập để kiểm tra quyền và chỉnh sửa nội dung.",
          role: "Vai trò",
          mapped: "Đồng bộ DB",
          yes: "Có",
          no: "Không",
          adminWarning: "Tài khoản hiện tại không có quyền Admin.",
          analyticsTitle: "Tổng quan",
          aboutTitle: "About Me / Hero",
          skillTitle: "Kỹ năng",
          projectTitle: "Dự án",
          articleTitle: "Bài viết kỹ thuật",
          contactTitle: "Liên hệ",
          cvTitle: "CV / Resume",
          createSkill: "Thêm kỹ năng",
          updateSkill: "Cập nhật kỹ năng",
          deleteSkill: "Xóa kỹ năng",
          clearSkillForm: "Xóa form",
          createProject: "Thêm dự án",
          updateProject: "Cập nhật dự án",
          deleteProject: "Xóa dự án",
          clearProjectForm: "Xóa form dự án",
          createArticle: "Tạo bài viết",
          updateArticle: "Cập nhật",
          deleteArticle: "Xóa",
          save: "Lưu thay đổi",
          saved: "Đã lưu thành công."
        }
      : {
          title: "Admin Dashboard",
          signInHint: "Sign in to validate role and edit content.",
          role: "Role",
          mapped: "DB mapped",
          yes: "Yes",
          no: "No",
          adminWarning: "Current account does not have Admin permissions.",
          analyticsTitle: "Overview",
          aboutTitle: "About Me / Hero",
          skillTitle: "Skills",
          projectTitle: "Projects",
          articleTitle: "Technical Writing",
          contactTitle: "Contact",
          cvTitle: "CV / Resume",
          createSkill: "Add skill",
          updateSkill: "Update skill",
          deleteSkill: "Delete skill",
          clearSkillForm: "Clear form",
          createProject: "Add project",
          updateProject: "Update project",
          deleteProject: "Delete project",
          clearProjectForm: "Clear project form",
          createArticle: "Create article",
          updateArticle: "Update",
          deleteArticle: "Delete",
          save: "Save changes",
          saved: "Saved successfully."
        };

  const sections = [
    { id: "overview", label: labels.analyticsTitle },
    { id: "about", label: labels.aboutTitle },
    { id: "skills", label: labels.skillTitle },
    { id: "projects", label: labels.projectTitle },
    { id: "articles", label: labels.articleTitle },
    { id: "contact", label: labels.contactTitle },
    { id: "cv", label: labels.cvTitle }
  ];

  const latestTechnical = useMemo(() => {
    const articleItems = articles
      .slice(0, 3)
      .map((article) => ({ key: `article-${article.id}`, title: article.title, type: "Article" }));
    const skillItems = skills
      .slice(0, 3)
      .map((skill) => ({ key: `skill-${skill.id}`, title: skill.name, type: "Skill" }));
    return [...articleItems, ...skillItems].slice(0, 6);
  }, [articles, skills]);

  async function saveContact() {
    setSaveState("");
    setError("");
    try {
      await apiClient.putProtected("/api/content/contact", contact);
      setSaveState(labels.saved);
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function savePage() {
    setSaveState("");
    setError("");
    try {
      await apiClient.putProtected("/api/content/page", page);
      setSaveState(labels.saved);
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function saveArticle() {
    setSaveState("");
    setError("");
    try {
      if (draftArticle.id) {
        const updated = await apiClient.putProtected(`/api/articles/${draftArticle.id}`, draftArticle);
        setArticles((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await apiClient.postProtected("/api/articles", draftArticle);
        setArticles((current) => [created, ...current]);
      }
      setDraftArticle(EMPTY_ARTICLE);
      setSaveState(labels.saved);
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function deleteArticle(id) {
    setSaveState("");
    setError("");
    try {
      await apiClient.deleteProtected(`/api/articles/${id}`);
      setArticles((current) => current.filter((item) => item.id !== id));
      setSaveState(labels.saved);
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function saveSkill() {
    setSaveState("");
    setError("");
    try {
      if (draftSkill.id) {
        const updated = await apiClient.putProtected(`/api/skills/${draftSkill.id}`, draftSkill);
        setSkills((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await apiClient.postProtected("/api/skills", draftSkill);
        setSkills((current) => [created, ...current].sort((a, b) => a.displayOrder - b.displayOrder));
      }
      setDraftSkill(EMPTY_SKILL);
      setSaveState(labels.saved);
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function deleteSkill(id) {
    setSaveState("");
    setError("");
    try {
      await apiClient.deleteProtected(`/api/skills/${id}`);
      setSkills((current) => current.filter((item) => item.id !== id));
      setSaveState(labels.saved);
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function saveProject() {
    setSaveState("");
    setError("");
    try {
      if (draftProject.id) {
        const updated = await apiClient.putProtected(`/api/projects/${draftProject.id}`, draftProject);
        setProjects((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await apiClient.postProtected("/api/projects", draftProject);
        setProjects((current) => [created, ...current]);
      }
      setDraftProject(EMPTY_PROJECT);
      setSaveState(labels.saved);
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function deleteProject(id) {
    setSaveState("");
    setError("");
    try {
      await apiClient.deleteProtected(`/api/projects/${id}`);
      setProjects((current) => current.filter((item) => item.id !== id));
      setSaveState(labels.saved);
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  function renderOverview() {
    const statCards = [
      { label: language === "vi" ? "Lượt truy cập" : "Page views", value: analytics.totalPageViews, icon: "👁", color: "var(--accent)" },
      { label: language === "vi" ? "Đăng nhập" : "Logins", value: analytics.totalLogins, icon: "🔐", color: "#38bdf8" },
      { label: language === "vi" ? "Người dùng" : "Users", value: analytics.totalUsers, icon: "👤", color: "#fb923c" },
    ];
    return (
      <div className="adm-overview">
        {/* Stat cards */}
        <div className="adm-stat-row">
          {statCards.map((s) => (
            <div key={s.label} className="adm-stat-card" style={{ "--stat-color": s.color }}>
              <div className="adm-stat-card__icon">{s.icon}</div>
              <div className="adm-stat-card__body">
                <span className="adm-stat-card__label">{s.label}</span>
                <span className="adm-stat-card__value">{s.value.toLocaleString()}</span>
              </div>
              <div className="adm-stat-card__bar" />
            </div>
          ))}
        </div>

        {/* Line chart */}
        <div className="adm-chart-card card">
          <div className="adm-chart-card__header">
            <h4>{language === "vi" ? "Xu hướng truy cập theo ngày" : "Daily traffic trend"}</h4>
          </div>
          <AdminLineChart apiClient={apiClient} language={language} />
        </div>

        {/* Two-column section: Users Activity + Page Origins */}
        <div className="adm-two-col">
          {/* User login activity table */}
          <div className="adm-table-card card">
            <div className="adm-table-card__header">
              <h4>{language === "vi" ? "👤 Hoạt động người dùng" : "👤 User Activity"}</h4>
              <span className="adm-chart-note">{usersActivity.length} {language === "vi" ? "người dùng" : "users"}</span>
            </div>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>{language === "vi" ? "Tên" : "Name"}</th>
                    <th>{language === "vi" ? "Email" : "Email"}</th>
                    <th>{language === "vi" ? "Vai trò" : "Role"}</th>
                    <th>{language === "vi" ? "Đăng nhập" : "Logins"}</th>
                    <th>{language === "vi" ? "Lần cuối" : "Last login"}</th>
                  </tr>
                </thead>
                <tbody>
                  {usersActivity.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--text-soft)", padding: "1.5rem" }}>
                      {language === "vi" ? "Chưa có dữ liệu" : "No data yet"}
                    </td></tr>
                  ) : usersActivity.map((u) => (
                    <tr key={u.id}>
                      <td className="adm-table__name">{u.name}</td>
                      <td className="adm-table__muted">{u.email}</td>
                      <td>
                        <span className={`adm-role-badge ${u.role === "Admin" ? "adm-role-badge--admin" : ""}`}>{u.role}</span>
                      </td>
                      <td className="adm-table__count">{u.loginCount}</td>
                      <td className="adm-table__muted adm-table__time">
                        {u.lastLoginAtUtc ? new Date(u.lastLoginAtUtc).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Page origins */}
          <div className="adm-origins-card card">
            <div className="adm-table-card__header">
              <h4>{language === "vi" ? "🌐 Nguồn truy cập" : "🌐 Traffic sources"}</h4>
              <span className="adm-chart-note">{pageOrigins.recentViews.length} {language === "vi" ? "lượt gần nhất" : "recent views"}</span>
            </div>

            {/* Path breakdown */}
            <p className="adm-origins-label">{language === "vi" ? "Trang được xem nhiều" : "Top pages"}</p>
            <div className="adm-bar-list">
              {pageOrigins.pathSummary.length === 0 ? (
                <p style={{ color: "var(--text-soft)", fontSize: "0.85rem" }}>{language === "vi" ? "Chưa có dữ liệu" : "No data yet"}</p>
              ) : pageOrigins.pathSummary.map((p, i) => {
                const max = pageOrigins.pathSummary[0]?.count ?? 1;
                const pct = Math.round((p.count / max) * 100);
                return (
                  <div key={i} className="adm-bar-row">
                    <span className="adm-bar-row__label" title={p.path}>{p.path}</span>
                    <div className="adm-bar-row__track">
                      <div className="adm-bar-row__fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="adm-bar-row__count">{p.count}</span>
                  </div>
                );
              })}
            </div>

            {/* Referrer breakdown */}
            <p className="adm-origins-label" style={{ marginTop: "1rem" }}>{language === "vi" ? "Nguồn đến" : "Traffic sources"}</p>
            <div className="adm-bar-list">
              {pageOrigins.referrerSummary.length === 0 ? (
                <p style={{ color: "var(--text-soft)", fontSize: "0.85rem" }}>{language === "vi" ? "Chưa có dữ liệu" : "No data yet"}</p>
              ) : pageOrigins.referrerSummary.map((r, i) => {
                const max = pageOrigins.referrerSummary[0]?.count ?? 1;
                const pct = Math.round((r.count / max) * 100);
                return (
                  <div key={i} className="adm-bar-row">
                    <span className="adm-bar-row__label" title={r.source}>{r.source}</span>
                    <div className="adm-bar-row__track">
                      <div className="adm-bar-row__fill adm-bar-row__fill--teal" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="adm-bar-row__count">{r.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderAboutSection() {
    return (
      <article className="contact-form">
        <h3>{labels.aboutTitle}</h3>
        <form>
          <label>
            Hero title
            <input value={page.heroTitle ?? ""} onChange={(event) => setPage((current) => ({ ...current, heroTitle: event.target.value }))} />
          </label>
          <label>
            Hero description
            <textarea rows={3} value={page.heroDescription ?? ""} onChange={(event) => setPage((current) => ({ ...current, heroDescription: event.target.value }))} />
          </label>
          <label>
            About title
            <input value={page.aboutTitle ?? ""} onChange={(event) => setPage((current) => ({ ...current, aboutTitle: event.target.value }))} />
          </label>
          <label>
            About description
            <textarea rows={4} value={page.aboutDescription ?? ""} onChange={(event) => setPage((current) => ({ ...current, aboutDescription: event.target.value }))} />
          </label>
          <label>
            Hero title color
            <input type="color" value={page.heroTitleColor || "#e2e8f0"} onChange={(event) => setPage((current) => ({ ...current, heroTitleColor: event.target.value }))} />
          </label>
          <label>
            Hero description color
            <input
              type="color"
              value={page.heroDescriptionColor || "#cbd5e1"}
              onChange={(event) => setPage((current) => ({ ...current, heroDescriptionColor: event.target.value }))}
            />
          </label>
          <label>
            Hero typing speed (ms per character)
            <input
              type="number"
              min={10}
              max={120}
              value={page.heroTypingSpeedMs ?? 28}
              onChange={(event) => setPage((current) => ({ ...current, heroTypingSpeedMs: Number(event.target.value || 28) }))}
            />
          </label>
          <label>
            About title color
            <input type="color" value={page.aboutTitleColor || "#e2e8f0"} onChange={(event) => setPage((current) => ({ ...current, aboutTitleColor: event.target.value }))} />
          </label>
          <label>
            About description color
            <input
              type="color"
              value={page.aboutDescriptionColor || "#cbd5e1"}
              onChange={(event) => setPage((current) => ({ ...current, aboutDescriptionColor: event.target.value }))}
            />
          </label>
          <label>
            Skills title color
            <input type="color" value={page.skillsTitleColor || "#e2e8f0"} onChange={(event) => setPage((current) => ({ ...current, skillsTitleColor: event.target.value }))} />
          </label>
          <label>
            Skills description color
            <input
              type="color"
              value={page.skillsDescriptionColor || "#cbd5e1"}
              onChange={(event) => setPage((current) => ({ ...current, skillsDescriptionColor: event.target.value }))}
            />
          </label>
          <label>
            Projects title color
            <input type="color" value={page.projectsTitleColor || "#e2e8f0"} onChange={(event) => setPage((current) => ({ ...current, projectsTitleColor: event.target.value }))} />
          </label>
          <label>
            Projects description color
            <input
              type="color"
              value={page.projectsDescriptionColor || "#cbd5e1"}
              onChange={(event) => setPage((current) => ({ ...current, projectsDescriptionColor: event.target.value }))}
            />
          </label>
          <label>
            Contact title color
            <input type="color" value={page.contactTitleColor || "#e2e8f0"} onChange={(event) => setPage((current) => ({ ...current, contactTitleColor: event.target.value }))} />
          </label>
          <label>
            Contact description color
            <input
              type="color"
              value={page.contactDescriptionColor || "#cbd5e1"}
              onChange={(event) => setPage((current) => ({ ...current, contactDescriptionColor: event.target.value }))}
            />
          </label>
          <button type="button" className="button button--primary" onClick={savePage}>
            {labels.save}
          </button>
        </form>
      </article>
    );
  }

  function renderSkillsSection() {
    return (
      <article className="contact-form">
        <h3>{labels.skillTitle}</h3>
        <form>
          <label>
            Skill name
            <input value={draftSkill.name} onChange={(event) => setDraftSkill((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label>
            Description
            <textarea rows={3} value={draftSkill.description} onChange={(event) => setDraftSkill((current) => ({ ...current, description: event.target.value }))} />
          </label>
          <label>
            Display order
            <input type="number" value={draftSkill.displayOrder} onChange={(event) => setDraftSkill((current) => ({ ...current, displayOrder: Number(event.target.value || 0) }))} />
          </label>
          <label>
            <input type="checkbox" checked={draftSkill.isVisible} onChange={(event) => setDraftSkill((current) => ({ ...current, isVisible: event.target.checked }))} />
            Visible on homepage
          </label>
          <div className="form-actions">
            <button type="button" className="button button--primary" onClick={saveSkill}>
              {draftSkill.id ? labels.updateSkill : labels.createSkill}
            </button>
            <button type="button" className="button button--ghost" onClick={() => setDraftSkill(EMPTY_SKILL)}>
              {labels.clearSkillForm}
            </button>
          </div>
        </form>
        <div className="admin-skill-list">
          {skills.map((skill) => (
            <article key={skill.id} className="card">
              <h4>{skill.name}</h4>
              <p>{skill.description}</p>
              <div className="card__links">
                <button type="button" className="button button--ghost button--small" onClick={() => setDraftSkill(skill)}>
                  {labels.updateSkill}
                </button>
                <button type="button" className="button button--ghost button--small" onClick={() => deleteSkill(skill.id)}>
                  {labels.deleteSkill}
                </button>
              </div>
            </article>
          ))}
        </div>
      </article>
    );
  }

  function renderProjectsSection() {
    return (
      <article className="contact-form">
        <h3>{labels.projectTitle}</h3>
        <form>
          <label>
            Title
            <input value={draftProject.title} onChange={(event) => setDraftProject((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label>
            Slug
            <input value={draftProject.slug} onChange={(event) => setDraftProject((current) => ({ ...current, slug: event.target.value }))} />
          </label>
          <label>
            Category
            <select value={draftProject.category} onChange={(event) => setDraftProject((current) => ({ ...current, category: event.target.value }))}>
              <option value="frontend">Frontend</option>
              <option value="backend">Backend</option>
              <option value="fullstack">Full-Stack</option>
            </select>
          </label>
          <label>
            Role
            <input value={draftProject.role} onChange={(event) => setDraftProject((current) => ({ ...current, role: event.target.value }))} />
          </label>
          <label>
            Summary
            <textarea rows={2} value={draftProject.summary} onChange={(event) => setDraftProject((current) => ({ ...current, summary: event.target.value }))} />
          </label>
          <label>
            Stack
            <input value={draftProject.stack} onChange={(event) => setDraftProject((current) => ({ ...current, stack: event.target.value }))} />
          </label>
          <label>
            Case study
            <textarea rows={3} value={draftProject.caseStudy} onChange={(event) => setDraftProject((current) => ({ ...current, caseStudy: event.target.value }))} />
          </label>
          <label>
            Impact
            <textarea rows={2} value={draftProject.impact} onChange={(event) => setDraftProject((current) => ({ ...current, impact: event.target.value }))} />
          </label>
          <label>
            Live demo URL
            <input value={draftProject.demoUrl} onChange={(event) => setDraftProject((current) => ({ ...current, demoUrl: event.target.value }))} />
          </label>
          <label>
            Source code URL
            <input value={draftProject.repositoryUrl} onChange={(event) => setDraftProject((current) => ({ ...current, repositoryUrl: event.target.value }))} />
          </label>
          <label>
            <input type="checkbox" checked={draftProject.isFeatured} onChange={(event) => setDraftProject((current) => ({ ...current, isFeatured: event.target.checked }))} />
            Featured
          </label>
          <div className="form-actions">
            <button type="button" className="button button--primary" onClick={saveProject}>
              {draftProject.id ? labels.updateProject : labels.createProject}
            </button>
            <button type="button" className="button button--ghost" onClick={() => setDraftProject(EMPTY_PROJECT)}>
              {labels.clearProjectForm}
            </button>
          </div>
        </form>
        <div className="admin-article-list">
          {projects.map((project) => (
            <article key={project.id} className="card">
              <h4>{project.title}</h4>
              <p>{project.slug}</p>
              <div className="card__links">
                <button type="button" className="button button--ghost button--small" onClick={() => setDraftProject({ ...EMPTY_PROJECT, ...project })}>
                  {labels.updateProject}
                </button>
                <button type="button" className="button button--ghost button--small" onClick={() => deleteProject(project.id)}>
                  {labels.deleteProject}
                </button>
              </div>
            </article>
          ))}
        </div>
      </article>
    );
  }

  function renderArticlesSection() {
    return (
      <article className="contact-form">
        <h3>{labels.articleTitle}</h3>
        <form>
          <label>
            Title
            <input value={draftArticle.title} onChange={(event) => setDraftArticle((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label>
            Slug
            <input value={draftArticle.slug} onChange={(event) => setDraftArticle((current) => ({ ...current, slug: event.target.value }))} />
          </label>
          <label>
            Summary
            <textarea rows={2} value={draftArticle.summary} onChange={(event) => setDraftArticle((current) => ({ ...current, summary: event.target.value }))} />
          </label>
          <label>
            Content
            <textarea rows={4} value={draftArticle.content} onChange={(event) => setDraftArticle((current) => ({ ...current, content: event.target.value }))} />
          </label>
          <label>
            <input type="checkbox" checked={draftArticle.isPublished} onChange={(event) => setDraftArticle((current) => ({ ...current, isPublished: event.target.checked }))} />
            Published
          </label>
          <button type="button" className="button button--primary" onClick={saveArticle}>
            {draftArticle.id ? labels.updateArticle : labels.createArticle}
          </button>
        </form>
        <div className="admin-article-list">
          {articles.map((article) => (
            <article key={article.id} className="card">
              <h4>{article.title}</h4>
              <p>{article.slug}</p>
              <div className="card__links">
                <button type="button" className="button button--ghost button--small" onClick={() => setDraftArticle(article)}>
                  {labels.updateArticle}
                </button>
                <button type="button" className="button button--ghost button--small" onClick={() => deleteArticle(article.id)}>
                  {labels.deleteArticle}
                </button>
              </div>
            </article>
          ))}
        </div>
      </article>
    );
  }

  function renderContactSection() {
    return (
      <article className="contact-form">
        <h3>{labels.contactTitle}</h3>
        <form>
          <label>
            Email
            <input value={contact.email ?? ""} onChange={(event) => setContact((current) => ({ ...current, email: event.target.value }))} />
          </label>
          <label>
            Phone
            <input value={contact.phone ?? ""} onChange={(event) => setContact((current) => ({ ...current, phone: event.target.value }))} />
          </label>
          <label>
            Location
            <input value={contact.location ?? ""} onChange={(event) => setContact((current) => ({ ...current, location: event.target.value }))} />
          </label>
          <label>
            Github URL
            <input value={contact.githubUrl ?? ""} onChange={(event) => setContact((current) => ({ ...current, githubUrl: event.target.value }))} />
          </label>
          <label>
            LinkedIn URL
            <input value={contact.linkedInUrl ?? ""} onChange={(event) => setContact((current) => ({ ...current, linkedInUrl: event.target.value }))} />
          </label>
          <button type="button" className="button button--primary" onClick={saveContact}>
            {labels.save}
          </button>
        </form>
      </article>
    );
  }

  function renderCvSection() {
    return (
      <article className="contact-form">
        <h3>{labels.cvTitle}</h3>
        <p style={{ marginBottom: "1.2rem", color: "var(--text-muted)" }}>
          {language === "vi"
            ? "Thiết kế và quản lý CV chuyên nghiệp hiển thị tại /cv. Dùng trình chỉnh sửa đầy đủ để cập nhật kinh nghiệm, kỹ năng, chứng chỉ và thông tin cá nhân."
            : "Design and manage your professional CV displayed at /cv. Use the full editor to update experience, skills, certifications and personal info."}
        </p>
        <div className="admin-cv-actions">
          <a href="/cv/edit" className="button button--primary admin-cv-edit-btn">
            {language === "vi" ? "✏️ Mở trình chỉnh sửa CV" : "✏️ Open CV Editor"}
          </a>
          <a href="/cv" target="_blank" rel="noopener noreferrer" className="button button--ghost">
            {language === "vi" ? "👁 Xem CV công khai" : "👁 View public CV"}
          </a>
        </div>
        <div className="admin-cv-info-grid">
          <div className="card">
            <p className="project-role">{language === "vi" ? "Thông tin cá nhân" : "Personal Info"}</p>
            <p>{language === "vi" ? "Họ tên, chức danh, email, SĐT, địa chỉ, avatar" : "Name, job title, email, phone, address, avatar"}</p>
          </div>
          <div className="card">
            <p className="project-role">{language === "vi" ? "Kinh nghiệm & Học vấn" : "Experience & Education"}</p>
            <p>{language === "vi" ? "Timeline công việc, bằng cấp, mô tả" : "Work timeline, degrees, descriptions"}</p>
          </div>
          <div className="card">
            <p className="project-role">{language === "vi" ? "Kỹ năng & Ngôn ngữ" : "Skills & Languages"}</p>
            <p>{language === "vi" ? "Nhóm kỹ năng với mức độ, ngôn ngữ, chứng chỉ" : "Skill groups with levels, languages, certifications"}</p>
          </div>
          <div className="card">
            <p className="project-role">{language === "vi" ? "Cài đặt" : "Settings"}</p>
            <p>{language === "vi" ? "Màu accent, chế độ public/private" : "Accent color, public/private mode"}</p>
          </div>
        </div>
      </article>
    );
  }

  function renderActiveSection() {
    switch (activeSection) {
      case "overview":
        return renderOverview();
      case "about":
        return renderAboutSection();
      case "skills":
        return renderSkillsSection();
      case "projects":
        return renderProjectsSection();
      case "articles":
        return renderArticlesSection();
      case "contact":
        return renderContactSection();
      case "cv":
        return renderCvSection();
      default:
        return renderOverview();
    }
  }

  return (
    <section className="section container admin-shell" id="admin-panel">
      <div className="admin-shell__header">
        <div>
          <p className="project-role">Portfolio control center</p>
          <h2>{labels.title}</h2>
          {!isSignedIn ? <p>{labels.signInHint}</p> : null}
        </div>
        {me ? (
          <div className="admin-status">
            <p>
              {labels.role}: <strong>{me.user?.role ?? "User"}</strong>
            </p>
            <p>
              {labels.mapped}: <strong>{me.isMapped ? labels.yes : labels.no}</strong>
            </p>
          </div>
        ) : null}
      </div>
      {error ? <p className="error">{error}</p> : null}
      {saveState ? <p className="admin-save-state">{saveState}</p> : null}

      {adminStatus === "admin" ? (
        <div className="admin-layout">
          <aside className="admin-sidebar">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={activeSection === section.id ? "filter-chip is-active admin-sidebar__item" : "filter-chip admin-sidebar__item"}
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </aside>
          <div className="admin-content">{renderActiveSection()}</div>
        </div>
      ) : null}

      {isSignedIn && adminStatus === "user" ? <p>{labels.adminWarning}</p> : null}
    </section>
  );
}
