import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createApiClient } from "../core/http/apiClient";
import "./CVPage.css";

// ── Helpers ──────────────────────────────────────────────
function parseSafe(json) {
  if (!json) return [];
  try { return JSON.parse(json); } catch { return []; }
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ── Sub-components ────────────────────────────────────────
function SkillBar({ level, color }) {
  const pct = Math.min(Math.max(Number(level) || 0, 0), 100);
  return (
    <div className="cv-bar">
      <div
        className="cv-bar__fill"
        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)` }}
      />
    </div>
  );
}

function LangDots({ level, color }) {
  const map = { native: 5, fluent: 4, intermediate: 3, basic: 2, beginner: 1 };
  const filled = typeof level === "string" ? (map[level.toLowerCase()] ?? 3) : Math.round((level / 100) * 5);
  return (
    <div className="cv-dots">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="cv-dot"
          style={
            i <= filled
              ? { background: color, borderColor: color, boxShadow: `0 0 4px ${color}88` }
              : { borderColor: `${color}55`, background: "transparent" }
          }
        />
      ))}
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="cv-main-card">
      <div className="cv-section">
        <h2 className="cv-section__title">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function TimelineEntry({ title, subtitle, period, location, description, bullets }) {
  return (
    <div className="cv-timeline-item">
      <div className="cv-timeline-dot">▸</div>
      <div className="cv-timeline-content">
        <div className="cv-timeline-header">
          <strong className="cv-timeline-title">{title}</strong>
          {period && <span className="cv-timeline-period">{period}</span>}
        </div>
        {(subtitle || location) && (
          <div className="cv-timeline-meta">
            {subtitle && <span className="cv-timeline-subtitle">{subtitle}</span>}
            {location && <span className="cv-timeline-location">📍 {location}</span>}
          </div>
        )}
        {description && <p className="cv-timeline-desc">{description}</p>}
        {Array.isArray(bullets) && bullets.length > 0 && (
          <ul className="cv-timeline-bullets">
            {bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export function CVPage() {
  const apiClient = useMemo(() => createApiClient(async () => null), []);
  const [cv, setCv] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.getPublic("/api/cv")
      .then((data) => { setCv(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [apiClient]);

  if (loading) {
    return (
      <div className="cv-root">
        <div className="cv-loading">
          <div className="cv-loading__spinner" />
          <p>Đang tải CV...</p>
        </div>
      </div>
    );
  }

  if (!cv) {
    return (
      <div className="cv-root">
        <div className="cv-empty">
          <div className="cv-empty__icon">📄</div>
          <h2>CV chưa được thiết lập</h2>
          <p>Trang CV sẽ hiển thị khi được cập nhật từ trang quản trị.</p>
          <Link to="/" className="cv-btn cv-btn--outline">← Về trang chủ</Link>
        </div>
      </div>
    );
  }

  const color = cv.accentColor || "#6366f1";
  const rgb = hexToRgb(color);

  const works = parseSafe(cv.workExperiencesJson);
  const edus = parseSafe(cv.educationsJson);
  const skillGroups = parseSafe(cv.skillGroupsJson);
  const certs = parseSafe(cv.certificationsJson);
  const langs = parseSafe(cv.languagesJson);
  const awards = parseSafe(cv.awardsJson);
  const hobbies = parseSafe(cv.hobbiesJson);

  const cssVars = {
    "--cv-accent": color,
    "--cv-accent-rgb": rgb,
  };

  return (
    <div className="cv-root" style={cssVars}>
      {/* ── Topbar ── */}
      <nav className="cv-topbar">
        <div className="cv-topbar__content">
          <Link to="/" className="cv-topbar__logo">← hiennt.website</Link>
          <div className="cv-topbar__actions">
            <button
              className="cv-btn cv-btn--primary"
              onClick={() => window.print()}
              title="In CV"
            >
              🖨 In CV
            </button>
          </div>
        </div>
      </nav>

      {/* ── CV Document ── */}
      <div className="cv-document" id="cv-print">

        {/* ── LEFT SIDEBAR ── */}
        <aside className="cv-sidebar">
          {/* Avatar card */}
          <div className="cv-avatar-card">
            {cv.avatarUrl ? (
              <img src={cv.avatarUrl} alt={cv.fullName} className="cv-avatar" />
            ) : (
              <div className="cv-avatar cv-avatar--placeholder">
                {(cv.fullName || "H").charAt(0).toUpperCase()}
              </div>
            )}
            <h1 className="cv-name-display">{cv.fullName || "Nguyễn Trung Hiên"}</h1>
            {cv.jobTitle && <div className="cv-title-display">{cv.jobTitle}</div>}
          </div>

          {/* Contact */}
          {(cv.email || cv.phone || cv.address || cv.websiteUrl || cv.githubUrl || cv.linkedInUrl) && (
            <div className="cv-sidebar-card">
              <div className="cv-sidebar-section">
                <h3 className="cv-sidebar-title">Liên hệ</h3>
                {cv.email && (
                  <div className="cv-contact-item">
                    <span className="cv-contact-icon">✉</span>
                    <a href={`mailto:${cv.email}`}>{cv.email}</a>
                  </div>
                )}
                {cv.phone && (
                  <div className="cv-contact-item">
                    <span className="cv-contact-icon">📱</span>
                    <span>{cv.phone}</span>
                  </div>
                )}
                {cv.address && (
                  <div className="cv-contact-item">
                    <span className="cv-contact-icon">📍</span>
                    <span>{cv.address}</span>
                  </div>
                )}
                {cv.websiteUrl && (
                  <div className="cv-contact-item">
                    <span className="cv-contact-icon">🌐</span>
                    <a href={cv.websiteUrl} target="_blank" rel="noopener noreferrer">
                      {cv.websiteUrl.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
                {cv.githubUrl && (
                  <div className="cv-contact-item">
                    <span className="cv-contact-icon">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                      </svg>
                    </span>
                    <a href={cv.githubUrl} target="_blank" rel="noopener noreferrer">GitHub</a>
                  </div>
                )}
                {cv.linkedInUrl && (
                  <div className="cv-contact-item">
                    <span className="cv-contact-icon">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </span>
                    <a href={cv.linkedInUrl} target="_blank" rel="noopener noreferrer">LinkedIn</a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Skills */}
          {skillGroups.length > 0 && (
            <div className="cv-sidebar-card">
              <div className="cv-sidebar-section">
                <h3 className="cv-sidebar-title">Kỹ năng</h3>
                {skillGroups.map((group, gi) => (
                  <div key={gi} className="cv-skill-group">
                    {group.category && <div className="cv-skill-category">{group.category}</div>}
                    {(group.items || []).map((item, ii) => (
                      <div key={ii} className="cv-skill-row">
                        <div className="cv-skill-name">
                          <span>{item.name}</span>
                          {item.level !== undefined && (
                            <span className="cv-skill-pct">{item.level}%</span>
                          )}
                        </div>
                        {item.level !== undefined && <SkillBar level={item.level} color={color} />}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {langs.length > 0 && (
            <div className="cv-sidebar-card">
              <div className="cv-sidebar-section">
                <h3 className="cv-sidebar-title">Ngôn ngữ</h3>
                {langs.map((lang, i) => (
                  <div key={i} className="cv-lang-row">
                    <span className="cv-lang-name">{lang.language}</span>
                    <LangDots level={lang.proficiency} color={color} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {certs.length > 0 && (
            <div className="cv-sidebar-card">
              <div className="cv-sidebar-section">
                <h3 className="cv-sidebar-title">Chứng chỉ</h3>
                {certs.map((cert, i) => (
                  <div key={i} className="cv-cert-item">
                    <div className="cv-cert-name">
                      {cert.credentialUrl
                        ? <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer">{cert.name}</a>
                        : cert.name}
                    </div>
                    {cert.issuer && <div className="cv-cert-issuer">{cert.issuer}</div>}
                    {cert.date && <div className="cv-cert-date">{cert.date}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hobbies */}
          {hobbies.length > 0 && (
            <div className="cv-sidebar-card">
              <div className="cv-sidebar-section">
                <h3 className="cv-sidebar-title">Sở thích</h3>
                <div className="cv-hobbies">
                  {hobbies.map((h, i) => (
                    <span
                      key={i}
                      className="cv-hobby-tag"
                      style={{ borderColor: color, color }}
                    >
                      {h.icon && <span>{h.icon}</span>} {h.name || h}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* ── RIGHT MAIN ── */}
        <main className="cv-main">
          {/* Header */}
          <div className="cv-header-card">
            <h1 className="cv-header__name">{cv.fullName || "Nguyễn Trung Hiên"}</h1>
            {cv.jobTitle && <div className="cv-header__title">{cv.jobTitle}</div>}
            <div className="cv-header__tags">
              {cv.address && <span className="cv-header__tag">📍 {cv.address}</span>}
              {cv.websiteUrl && (
                <span className="cv-header__tag">
                  🌐 {cv.websiteUrl.replace(/^https?:\/\//, "")}
                </span>
              )}
            </div>
          </div>

          {/* Summary */}
          {cv.summary && (
            <SectionCard title="Giới thiệu bản thân">
              <p className="cv-summary">{cv.summary}</p>
            </SectionCard>
          )}

          {/* Work Experience */}
          {works.length > 0 && (
            <SectionCard title="Kinh nghiệm làm việc">
              <div className="cv-timeline">
                {works.map((exp, i) => (
                  <TimelineEntry
                    key={i}
                    title={exp.position || exp.title}
                    subtitle={exp.company}
                    period={
                      exp.startDate
                        ? `${exp.startDate} — ${exp.isCurrent ? "Hiện tại" : exp.endDate || ""}`
                        : exp.period
                    }
                    location={exp.location}
                    description={exp.description}
                    bullets={exp.bullets || exp.achievements}
                  />
                ))}
              </div>
            </SectionCard>
          )}

          {/* Education */}
          {edus.length > 0 && (
            <SectionCard title="Học vấn">
              <div className="cv-timeline">
                {edus.map((edu, i) => (
                  <TimelineEntry
                    key={i}
                    title={edu.degree || edu.title}
                    subtitle={edu.school || edu.institution}
                    period={
                      edu.startDate
                        ? `${edu.startDate} — ${edu.endDate || "Hiện tại"}`
                        : edu.period
                    }
                    location={edu.location}
                    description={
                      [edu.field, edu.gpa ? `GPA: ${edu.gpa}` : null, edu.description]
                        .filter(Boolean).join(" · ") || undefined
                    }
                    bullets={edu.achievements}
                  />
                ))}
              </div>
            </SectionCard>
          )}

          {/* Awards */}
          {awards.length > 0 && (
            <SectionCard title="Giải thưởng & Thành tích">
              <div className="cv-timeline">
                {awards.map((award, i) => (
                  <TimelineEntry
                    key={i}
                    title={award.title || award.name}
                    subtitle={award.issuer || award.organization}
                    period={award.date}
                    description={award.description}
                  />
                ))}
              </div>
            </SectionCard>
          )}
        </main>
      </div>

      {/* ── Footer ── */}
      <footer className="cv-footer">
        <div className="cv-footer__content">
          <span>© {new Date().getFullYear()} {cv.fullName || "hiennt.website"}</span>
          <Link to="/" className="cv-footer__link">← Về trang chủ</Link>
        </div>
      </footer>
    </div>
  );
}
