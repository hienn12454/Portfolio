import { useCallback, useEffect, useMemo, useState } from "react";

// ── i18n copy for UI chrome (wizard steps, buttons, hints) ──────────
const labelsByLanguage = {
  en: {
    title: "Career Direction Lab",
    subtitle: "Pick skills to improve, choose a target role, and get a real AI-generated roadmap plus course picks.",
    mustLogin: "Sign in to build your personal roadmap plan.",
    stepSkills: "Skills",
    stepCareer: "Career",
    stepRoadmap: "Roadmap",
    stepCourses: "Courses",
    step1Title: "Which skills do you want to improve?",
    step1Hint: "Pick at least one — this also powers the match % on the next step.",
    step2Title: "Choose your target role",
    step2Hint: "Match % is computed from the skills you picked.",
    match: "Match",
    continueBtn: "Continue",
    seeRoadmapBtn: "Generate my roadmap →",
    seeCoursesBtn: "See course picks →",
    generating: "Generating your roadmap…",
    backBtn: "Back",
    restartBtn: "Build a new plan",
    dailyToday: "Today's focus",
    source: "Roadmap source",
    overviewFor: "Overview roadmap for",
    have: "Have",
    gap: "To learn",
    filterAll: "All",
    filterFree: "Free",
    filterPaid: "Paid",
    coursesFor: "Course picks for",
    pick: "+ Pick course",
    picked: "✓ Picked",
    viewHistory: "View plan history",
    hideHistory: "Hide plan history",
    createdAt: "Created",
    noSkillsError: "Pick at least one skill to continue.",
    noCareerError: "Choose a role to continue.",
    genericError: "Unable to generate a roadmap right now. Please try again."
  },
  vi: {
    title: "Phòng Lab Định Hướng Nghề IT",
    subtitle: "Chọn kỹ năng muốn cải thiện, chọn nghề mục tiêu, rồi nhận lộ trình do AI tạo thật kèm gợi ý khoá học.",
    mustLogin: "Hãy đăng nhập để tạo lộ trình học cá nhân của bạn.",
    stepSkills: "Kỹ năng",
    stepCareer: "Nghề nghiệp",
    stepRoadmap: "Roadmap",
    stepCourses: "Khoá học",
    step1Title: "Bạn muốn cải thiện kỹ năng nào?",
    step1Hint: "Chọn ít nhất 1 kỹ năng — dữ liệu này cũng dùng để tính % phù hợp ở bước sau.",
    step2Title: "Chọn nghề bạn muốn hướng tới",
    step2Hint: "% phù hợp được tính từ các kỹ năng bạn vừa chọn.",
    match: "Phù hợp",
    continueBtn: "Tiếp tục",
    seeRoadmapBtn: "Tạo lộ trình của tôi →",
    seeCoursesBtn: "Xem khoá học gợi ý →",
    generating: "Đang tạo lộ trình cho bạn…",
    backBtn: "Quay lại",
    restartBtn: "Tạo lộ trình mới",
    dailyToday: "Trọng tâm hôm nay",
    source: "Nguồn roadmap",
    overviewFor: "Lộ trình tổng quan cho",
    have: "Đã có",
    gap: "Cần học",
    filterAll: "Tất cả",
    filterFree: "Miễn phí",
    filterPaid: "Trả phí",
    coursesFor: "Khoá học gợi ý cho",
    pick: "+ Chọn khoá học",
    picked: "✓ Đã chọn",
    viewHistory: "Xem lịch sử lộ trình",
    hideHistory: "Ẩn lịch sử lộ trình",
    createdAt: "Tạo lúc",
    noSkillsError: "Hãy chọn ít nhất 1 kỹ năng để tiếp tục.",
    noCareerError: "Hãy chọn một nghề để tiếp tục.",
    genericError: "Chưa thể tạo lộ trình lúc này. Vui lòng thử lại."
  }
};

// ── Static content: skills, careers, milestones, courses ────────────
// Skill/career names ship in both languages; roadmap milestones and course
// titles stay Vietnamese-only to keep scope sane (reasonable tradeoff noted
// at handover — the AI-generated plan text itself always matches Vietnamese
// since that's the language the backend prompts it in today).
const SKILL_GROUPS = [
  {
    id: "fund",
    label: { en: "Languages & fundamentals", vi: "Ngôn ngữ & nền tảng" },
    skills: [
      { id: "js", label: { en: "JavaScript", vi: "JavaScript" } },
      { id: "python", label: { en: "Python", vi: "Python" } },
      { id: "sql", label: { en: "SQL & Database", vi: "SQL & Database" } }
    ]
  },
  {
    id: "backend",
    label: { en: "Backend & infrastructure", vi: "Backend & hạ tầng" },
    skills: [
      { id: "api", label: { en: "REST API", vi: "REST API" } },
      { id: "docker", label: { en: "Docker", vi: "Docker" } },
      { id: "cicd", label: { en: "CI/CD", vi: "CI/CD" } },
      { id: "cloud", label: { en: "Cloud (AWS/Azure)", vi: "Cloud (AWS/Azure)" } }
    ]
  },
  {
    id: "frontend",
    label: { en: "Frontend & product", vi: "Frontend & sản phẩm" },
    skills: [
      { id: "react", label: { en: "React", vi: "React" } },
      { id: "uiux", label: { en: "UI/UX", vi: "UI/UX" } },
      { id: "perf", label: { en: "Performance", vi: "Performance" } }
    ]
  },
  {
    id: "soft",
    label: { en: "Soft skills", vi: "Kỹ năng mềm" },
    skills: [
      { id: "comm", label: { en: "Communication", vi: "Giao tiếp" } },
      { id: "time", label: { en: "Time management", vi: "Quản lý thời gian" } }
    ]
  }
];

const CAREER_WEIGHTS = {
  backend: { js: 1, python: 2, sql: 3, api: 3, docker: 2, cicd: 1, cloud: 1, react: 0, uiux: 0, perf: 1, comm: 1, time: 1 },
  frontend: { js: 2, python: 0, sql: 0, api: 1, docker: 0, cicd: 0, cloud: 0, react: 3, uiux: 3, perf: 3, comm: 1, time: 1 },
  devops: { js: 0, python: 1, sql: 1, api: 1, docker: 3, cicd: 3, cloud: 3, react: 0, uiux: 0, perf: 1, comm: 1, time: 2 },
  fullstack: { js: 3, python: 1, sql: 2, api: 2, docker: 1, cicd: 1, cloud: 1, react: 2, uiux: 1, perf: 1, comm: 1, time: 1 }
};

// Specialty text sent to POST /api/roadmap-plans/mine/generate. Must contain
// a keyword UserRoadmapPlanService.ResolveRoadmapSlug recognizes ("backend",
// "frontend", "devops", "full-stack") so the roadmap.sh source resolves correctly.
const CAREERS = [
  { id: "backend", specialty: "Backend Engineer", title: { en: "Backend Engineer", vi: "Backend Engineer" }, blurb: { en: "APIs, databases, architecture, scalability.", vi: "API, database, kiến trúc hệ thống và khả năng mở rộng." } },
  { id: "frontend", specialty: "Frontend Engineer", title: { en: "Frontend Engineer", vi: "Frontend Engineer" }, blurb: { en: "UI/UX, React, performance, accessibility.", vi: "Giao diện, trải nghiệm người dùng và hiệu năng web." } },
  { id: "devops", specialty: "DevOps Engineer", title: { en: "DevOps Engineer", vi: "DevOps Engineer" }, blurb: { en: "Cloud, CI/CD, containers, observability.", vi: "Hạ tầng, CI/CD, container hoá và vận hành cloud." } },
  { id: "fullstack", specialty: "Full-Stack Engineer", title: { en: "Full-Stack Engineer", vi: "Full-Stack Engineer" }, blurb: { en: "End-to-end product delivery.", vi: "Xây dựng sản phẩm end-to-end, từ giao diện tới backend." } }
];

const MILESTONES = {
  backend: [
    { title: "Nền tảng vững", topics: ["Ngôn ngữ lập trình", "Cấu trúc dữ liệu", "Git & GitHub"] },
    { title: "Xây dựng API", topics: ["Thiết kế REST API", "Database & SQL", "Authentication"] },
    { title: "Mở rộng hệ thống", topics: ["Docker", "CI/CD", "Caching & Message Queue"] },
    { title: "Sẵn sàng đi làm", topics: ["System design cơ bản", "Dự án portfolio", "Luyện phỏng vấn"] }
  ],
  frontend: [
    { title: "Nền tảng vững", topics: ["HTML/CSS/JS", "Responsive design", "Git & GitHub"] },
    { title: "Xây dựng giao diện", topics: ["React fundamentals", "State management", "Gọi API"] },
    { title: "Nâng cao trải nghiệm", topics: ["Performance & a11y", "Testing", "Design system"] },
    { title: "Sẵn sàng đi làm", topics: ["Case study UI", "Dự án portfolio", "Luyện phỏng vấn"] }
  ],
  devops: [
    { title: "Nền tảng vững", topics: ["Linux & Networking", "Bash/Python scripting", "Git & GitHub"] },
    { title: "Container hoá", topics: ["Docker", "CI/CD pipeline", "Infrastructure as Code"] },
    { title: "Vận hành Cloud", topics: ["Kubernetes", "AWS / Azure", "Monitoring & logging"] },
    { title: "Sẵn sàng đi làm", topics: ["Xử lý sự cố thực chiến", "Dự án portfolio", "Luyện phỏng vấn"] }
  ],
  fullstack: [
    { title: "Nền tảng vững", topics: ["JavaScript/TypeScript", "Cấu trúc dữ liệu", "Git & GitHub"] },
    { title: "Xây dựng sản phẩm", topics: ["React + REST API", "Database & SQL", "Authentication"] },
    { title: "Nâng cao chất lượng", topics: ["Docker", "Testing", "Performance"] },
    { title: "Sẵn sàng đi làm", topics: ["Dự án end-to-end", "Portfolio", "Luyện phỏng vấn"] }
  ]
};

const COURSES = {
  backend: [
    { title: "Backend Developer Roadmap", provider: "roadmap.sh", duration: "Tự học", level: "Cơ bản", type: "free" },
    { title: "REST API Design Best Practices", provider: "freeCodeCamp", duration: "6 giờ", level: "Trung cấp", type: "free" },
    { title: "SQL & Database Design", provider: "Coursera", duration: "20 giờ", level: "Cơ bản", type: "paid" },
    { title: "Docker & Container cho Backend", provider: "Udemy", duration: "10 giờ", level: "Trung cấp", type: "paid" },
    { title: "System Design Interview", provider: "YouTube", duration: "Tự học", level: "Nâng cao", type: "free" },
    { title: "Node.js chuyên sâu", provider: "Udemy", duration: "18 giờ", level: "Nâng cao", type: "paid" }
  ],
  frontend: [
    { title: "Frontend Developer Roadmap", provider: "roadmap.sh", duration: "Tự học", level: "Cơ bản", type: "free" },
    { title: "React — từ cơ bản đến nâng cao", provider: "freeCodeCamp", duration: "12 giờ", level: "Trung cấp", type: "free" },
    { title: "UI/UX cho Developer", provider: "Coursera", duration: "15 giờ", level: "Cơ bản", type: "paid" },
    { title: "Web Performance Optimization", provider: "Udemy", duration: "8 giờ", level: "Nâng cao", type: "paid" },
    { title: "Accessibility cơ bản", provider: "YouTube", duration: "Tự học", level: "Cơ bản", type: "free" },
    { title: "Testing React Apps", provider: "Udemy", duration: "9 giờ", level: "Trung cấp", type: "paid" }
  ],
  devops: [
    { title: "DevOps Roadmap", provider: "roadmap.sh", duration: "Tự học", level: "Cơ bản", type: "free" },
    { title: "Docker cho người mới bắt đầu", provider: "freeCodeCamp", duration: "5 giờ", level: "Cơ bản", type: "free" },
    { title: "Kubernetes chuyên sâu", provider: "Udemy", duration: "16 giờ", level: "Nâng cao", type: "paid" },
    { title: "AWS Cloud Practitioner", provider: "Coursera", duration: "25 giờ", level: "Trung cấp", type: "paid" },
    { title: "CI/CD với GitHub Actions", provider: "YouTube", duration: "Tự học", level: "Trung cấp", type: "free" },
    { title: "Monitoring & Logging thực chiến", provider: "Udemy", duration: "7 giờ", level: "Nâng cao", type: "paid" }
  ],
  fullstack: [
    { title: "Full-Stack Developer Roadmap", provider: "roadmap.sh", duration: "Tự học", level: "Cơ bản", type: "free" },
    { title: "The Odin Project — Full Stack", provider: "freeCodeCamp", duration: "Tự học", level: "Trung cấp", type: "free" },
    { title: "React + Node.js toàn tập", provider: "Udemy", duration: "22 giờ", level: "Trung cấp", type: "paid" },
    { title: "Database cho Full-Stack", provider: "Coursera", duration: "14 giờ", level: "Cơ bản", type: "paid" },
    { title: "Xây dựng dự án end-to-end", provider: "YouTube", duration: "Tự học", level: "Nâng cao", type: "free" },
    { title: "Phỏng vấn Full-Stack", provider: "Udemy", duration: "6 giờ", level: "Nâng cao", type: "paid" }
  ]
};

function computeMatch(careerId, selectedSkills) {
  const weights = CAREER_WEIGHTS[careerId];
  let total = 0;
  let got = 0;
  for (const key in weights) {
    total += weights[key];
    if (selectedSkills[key]) got += weights[key];
  }
  return total === 0 ? 0 : Math.round((got / total) * 100);
}

function careerIdFromSpecialty(specialty) {
  const normalized = (specialty || "").toLowerCase();
  const match = CAREERS.find((c) => normalized.includes(c.id) || normalized.includes(c.specialty.toLowerCase()));
  return match ? match.id : null;
}

// Minimal, dependency-free rendering of the AI plan's markdown-ish text:
// turns "## Heading" into a subheading and "- item" lines into a bullet list,
// everything else into paragraphs. Good enough for the plan shape the backend
// actually produces (see UserRoadmapPlanService's prompt) without pulling in
// a full markdown parser for one text block.
function PlanMarkdown({ text }) {
  const lines = (text || "").split("\n");
  const blocks = [];
  let currentList = null;

  lines.forEach((rawLine, i) => {
    const line = rawLine.trim();
    if (!line) { currentList = null; return; }
    if (line.startsWith("### ") || line.startsWith("## ") || line.startsWith("# ")) {
      currentList = null;
      blocks.push({ type: "heading", text: line.replace(/^#{1,3}\s*/, ""), key: `h-${i}` });
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const item = line.slice(2);
      if (!currentList) {
        currentList = { type: "list", items: [], key: `l-${i}` };
        blocks.push(currentList);
      }
      currentList.items.push(item);
    } else {
      currentList = null;
      blocks.push({ type: "p", text: line, key: `p-${i}` });
    }
  });

  return (
    <div className="cdl-plan-markdown">
      {blocks.map((b) => {
        if (b.type === "heading") return <h4 key={b.key}>{b.text}</h4>;
        if (b.type === "list") return <ul key={b.key}>{b.items.map((it, idx) => <li key={idx}>{it}</li>)}</ul>;
        return <p key={b.key}>{b.text}</p>;
      })}
    </div>
  );
}

export function CareerDirectionLab({ language, isSignedIn, apiClient }) {
  const t = labelsByLanguage[language] ?? labelsByLanguage.vi;

  const [step, setStep] = useState(1);
  const [selectedSkills, setSelectedSkills] = useState({});
  const [careerId, setCareerId] = useState(null);
  const [selectedCourses, setSelectedCourses] = useState({});
  const [courseFilter, setCourseFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);

  const [todayPlan, setTodayPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSignedIn) {
      setTodayPlan(null);
      setPlans([]);
      return;
    }

    // Deliberately NOT calling GET /api/roadmap-plans/mine/today here: that endpoint
    // auto-generates a default ("IT"/"DevOps") plan on first call, which would skip
    // straight past the skill/career wizard for every brand-new visitor. The plain
    // list endpoint has no such side effect, so a true first-timer lands on Step 1.
    let active = true;
    setLoadingInitial(true);
    apiClient.getProtected("/api/roadmap-plans/mine")
      .then((result) => {
        if (!active) return;
        const list = Array.isArray(result) ? result : [];
        setPlans(list);
        const latest = list[0] ?? null;
        setTodayPlan(latest);
        if (latest) {
          const resolvedCareerId = careerIdFromSpecialty(latest.specialty) ?? "fullstack";
          setCareerId(resolvedCareerId);
          setStep(3);
        }
      })
      .catch(() => {
        if (!active) return;
        setTodayPlan(null);
        setPlans([]);
      })
      .finally(() => { if (active) setLoadingInitial(false); });

    return () => { active = false; };
  }, [apiClient, isSignedIn]);

  const toggleSkill = useCallback((id) => {
    setSelectedSkills((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const selectedSkillCount = useMemo(
    () => Object.values(selectedSkills).filter(Boolean).length,
    [selectedSkills]
  );

  const careerMatches = useMemo(
    () => CAREERS.map((c) => ({ ...c, pct: computeMatch(c.id, selectedSkills) })),
    [selectedSkills]
  );

  const selectedCareer = useMemo(() => CAREERS.find((c) => c.id === careerId) ?? null, [careerId]);

  async function handleGenerate() {
    if (!selectedCareer || generating) return;
    setError("");
    setGenerating(true);
    setStep(3); // move to the roadmap step immediately so the "generating…" state is visible
    try {
      const result = await apiClient.postProtected(
        "/api/roadmap-plans/mine/generate",
        { track: "IT", specialty: selectedCareer.specialty },
        { timeoutMs: 180_000 }
      );
      setTodayPlan(result);
      setPlans((current) => [result, ...current]);
    } catch (submitError) {
      setError(submitError?.message ?? t.genericError);
      setStep(2); // generation failed — send the user back to retry instead of showing an empty roadmap step
    } finally {
      setGenerating(false);
    }
  }

  function handleCareerPick(id) {
    setCareerId((prev) => {
      if (prev !== id) setSelectedCourses({});
      return id;
    });
  }

  function handleNext() {
    if (step === 1) {
      if (selectedSkillCount === 0) { setError(t.noSkillsError); return; }
      setError("");
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!careerId) { setError(t.noCareerError); return; }
      setError("");
      void handleGenerate();
      return;
    }
    if (step === 3) {
      setStep(4);
    }
  }

  function handleRestart() {
    setStep(1);
    setCareerId(null);
    setSelectedSkills({});
    setSelectedCourses({});
    setError("");
  }

  function toggleCourse(key) {
    setSelectedCourses((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const milestones = careerId ? MILESTONES[careerId] : [];
  // Keep each course's original index as a stable id — filtering by type must not
  // shift which key a "picked" selection maps to.
  const courses = careerId ? COURSES[careerId].map((c, idx) => ({ ...c, idx })) : [];
  const visibleCourses = courses.filter((c) => courseFilter === "all" || c.type === courseFilter);
  const haveTags = careerId
    ? Object.keys(CAREER_WEIGHTS[careerId]).filter((k) => CAREER_WEIGHTS[careerId][k] >= 2 && selectedSkills[k])
    : [];
  const gapTags = careerId
    ? Object.keys(CAREER_WEIGHTS[careerId])
        .filter((k) => CAREER_WEIGHTS[careerId][k] >= 2 && !selectedSkills[k])
        .sort((a, b) => CAREER_WEIGHTS[careerId][b] - CAREER_WEIGHTS[careerId][a])
        .slice(0, 3)
    : [];
  const skillLabel = (id) => {
    for (const grp of SKILL_GROUPS) {
      const found = grp.skills.find((s) => s.id === id);
      if (found) return found.label[language] ?? found.label.vi;
    }
    return id;
  };

  const steps = [
    { id: 1, label: t.stepSkills },
    { id: 2, label: t.stepCareer },
    { id: 3, label: t.stepRoadmap },
    { id: 4, label: t.stepCourses }
  ];

  return (
    <section className="section container cdl-section">
      <div className="cdl-head">
        <h2>{t.title}</h2>
        <p>{t.subtitle}</p>
      </div>

      {!isSignedIn ? <p className="error">{t.mustLogin}</p> : null}

      {isSignedIn ? (
        <div className="cdl-shell">
          <div className="cdl-stepper">
            {steps.map((s, i) => (
              <div key={s.id} className="cdl-stepper__item">
                <div className="cdl-stepper__row">
                  <span className={`cdl-stepper__circle${step === s.id ? " is-active" : ""}${step > s.id ? " is-done" : ""}`}>
                    {step > s.id ? "✓" : s.id}
                  </span>
                  <span className="cdl-stepper__label">{s.label}</span>
                </div>
                {i < steps.length - 1 ? <span className={`cdl-stepper__line${step > s.id ? " is-done" : ""}`} /> : null}
              </div>
            ))}
          </div>

          {error ? <p className="error">{error}</p> : null}

          <div className="cdl-body">
            {loadingInitial ? <p>…</p> : null}

            {!loadingInitial && step === 1 ? (
              <div className="cdl-step">
                <h3>{t.step1Title}</h3>
                <p className="cdl-hint">{t.step1Hint}</p>
                {SKILL_GROUPS.map((grp) => (
                  <div key={grp.id} className="cdl-skill-group">
                    <div className="cdl-skill-group__label">{grp.label[language] ?? grp.label.vi}</div>
                    <div className="cdl-chip-row">
                      {grp.skills.map((sk) => (
                        <button
                          type="button"
                          key={sk.id}
                          className={`filter-chip${selectedSkills[sk.id] ? " is-active" : ""}`}
                          onClick={() => toggleSkill(sk.id)}
                        >
                          {selectedSkills[sk.id] ? "✓ " : ""}{sk.label[language] ?? sk.label.vi}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {!loadingInitial && step === 2 ? (
              <div className="cdl-step">
                <h3>{t.step2Title}</h3>
                <p className="cdl-hint">{t.step2Hint}</p>
                <div className="cdl-career-grid">
                  {careerMatches.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      className={`cdl-career-card${careerId === c.id ? " is-selected" : ""}`}
                      onClick={() => handleCareerPick(c.id)}
                    >
                      <div className="cdl-career-card__match">
                        <b>{c.pct}%</b>
                        <span>{t.match}</span>
                      </div>
                      <h4>{c.title[language] ?? c.title.vi}</h4>
                      <p>{c.blurb[language] ?? c.blurb.vi}</p>
                      <div className="cdl-career-card__bar">
                        <div className="cdl-career-card__bar-fill" style={{ width: `${c.pct}%` }} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {!loadingInitial && step === 3 ? (
              <div className="cdl-step">
                {generating ? (
                  <p className="cdl-generating">{t.generating}</p>
                ) : todayPlan ? (
                  <>
                    <div className="card cdl-plan-card">
                      <p className="eyebrow">{t.dailyToday}</p>
                      <p className="cdl-plan-daily">{todayPlan.dailyTechnical}</p>
                      <PlanMarkdown text={todayPlan.planMarkdown} />
                      <p className="cdl-plan-source">{t.source}: {todayPlan.sourceRoadmapSlug}</p>
                    </div>

                    {careerId ? (
                      <div className="cdl-roadmap-overview">
                        <h4>{t.overviewFor} {selectedCareer?.title[language] ?? selectedCareer?.title.vi}</h4>
                        {(haveTags.length > 0 || gapTags.length > 0) ? (
                          <div className="cdl-tag-row">
                            {haveTags.map((k) => <span key={k} className="cdl-tag cdl-tag--have">✓ {t.have}: {skillLabel(k)}</span>)}
                            {gapTags.map((k) => <span key={k} className="cdl-tag cdl-tag--gap">{t.gap}: {skillLabel(k)}</span>)}
                          </div>
                        ) : null}
                        <div className="cdl-milestones">
                          {milestones.map((ms, i) => (
                            <div key={ms.title} className="cdl-milestone">
                              <span className="cdl-milestone__num">{i + 1}</span>
                              <div>
                                <b>{ms.title}</b>
                                <div className="cdl-chip-row">
                                  {ms.topics.map((topic) => <span key={topic} className="cdl-topic">{topic}</span>)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}

            {!loadingInitial && step === 4 ? (
              <div className="cdl-step">
                <div className="cdl-course-toolbar">
                  <span className="cdl-hint">{t.coursesFor} {selectedCareer?.title[language] ?? selectedCareer?.title.vi}</span>
                  <div className="cdl-dd">
                    <button type="button" className="button button--ghost button--small" onClick={() => setFilterOpen((v) => !v)}>
                      {courseFilter === "free" ? t.filterFree : courseFilter === "paid" ? t.filterPaid : t.filterAll} ▾
                    </button>
                    {filterOpen ? (
                      <div className="cdl-dd__menu">
                        <button type="button" onClick={() => { setCourseFilter("all"); setFilterOpen(false); }}>{t.filterAll}</button>
                        <button type="button" onClick={() => { setCourseFilter("free"); setFilterOpen(false); }}>{t.filterFree}</button>
                        <button type="button" onClick={() => { setCourseFilter("paid"); setFilterOpen(false); }}>{t.filterPaid}</button>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="cdl-course-grid">
                  {visibleCourses.map((c) => {
                    const key = `${careerId}-${c.idx}`;
                    const picked = !!selectedCourses[key];
                    return (
                      <div key={key} className="cdl-course-card">
                        <b>{c.title}</b>
                        <span className="cdl-course-meta">{c.provider} · {c.duration}</span>
                        <div className="cdl-chip-row">
                          <span className={`cdl-tag ${c.type === "free" ? "cdl-tag--have" : "cdl-tag--paid"}`}>
                            {c.type === "free" ? t.filterFree : t.filterPaid}
                          </span>
                          <span className="cdl-tag">{c.level}</span>
                        </div>
                        <button
                          type="button"
                          className={`button button--small${picked ? " button--primary" : " button--ghost"}`}
                          onClick={() => toggleCourse(key)}
                        >
                          {picked ? t.picked : t.pick}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="cdl-foot">
            {step > 1 ? (
              <button type="button" className="button button--ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={generating}>
                ← {t.backBtn}
              </button>
            ) : <span />}
            {step < 3 ? (
              <button type="button" className="button button--primary" onClick={handleNext} disabled={generating}>
                {step === 2 ? t.seeRoadmapBtn : t.continueBtn}
              </button>
            ) : step === 3 ? (
              <button type="button" className="button button--primary" onClick={handleNext} disabled={generating || !todayPlan}>
                {t.seeCoursesBtn}
              </button>
            ) : (
              <button type="button" className="button button--primary" onClick={handleRestart}>
                {t.restartBtn}
              </button>
            )}
          </div>
        </div>
      ) : null}

      {isSignedIn && plans.length > 1 ? (
        <div className="cdl-history">
          <button type="button" className="button button--ghost button--small" onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? t.hideHistory : t.viewHistory}
          </button>
          {showHistory
            ? plans
                .filter((p) => p.id !== todayPlan?.id)
                .map((plan) => (
                  <article key={plan.id} className="card cdl-history-card">
                    <p className="eyebrow">{t.createdAt}: {new Date(plan.createdAtUtc).toLocaleString()}</p>
                    <h4>{plan.track} / {plan.specialty}</h4>
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      onClick={() => setExpandedPlanId((cur) => (cur === plan.id ? null : plan.id))}
                    >
                      {expandedPlanId === plan.id ? "▲" : "▼"}
                    </button>
                    {expandedPlanId === plan.id ? <PlanMarkdown text={plan.planMarkdown} /> : null}
                  </article>
                ))
            : null}
        </div>
      ) : null}
    </section>
  );
}
