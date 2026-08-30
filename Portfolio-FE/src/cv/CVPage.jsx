import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { createApiClient } from "../core/http/apiClient";
import { useThemeSync } from "../core/useThemeSync";
import { TEMPLATES, DEFAULT_SECTION_ORDER } from "./cvShared";
import "./CVPage.css";

// ── Helpers ──────────────────────────────────────────
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

function resolveSectionOrder(sectionOrderJson) {
  if (!sectionOrderJson) return DEFAULT_SECTION_ORDER.map((key) => ({ key, visible: true }));
  const parsed = parseSafe(sectionOrderJson);
  if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_SECTION_ORDER.map((key) => ({ key, visible: true }));
  return parsed;
}

function isSectionVisible(sectionOrder, key) {
  const entry = sectionOrder.find((s) => s.key === key);
  return entry ? entry.visible !== false : true;
}

// ── vCard (.vcf) contact export ────────────────────────
function buildVCard(cv) {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${cv.fullName || ""}`,
    cv.jobTitle    ? `TITLE:${cv.jobTitle}` : null,
    cv.email       ? `EMAIL:${cv.email}` : null,
    cv.phone       ? `TEL:${cv.phone}` : null,
    cv.address     ? `ADR:;;${cv.address};;;;` : null,
    cv.websiteUrl  ? `URL:${cv.websiteUrl}` : null,
    "END:VCARD",
  ].filter(Boolean);
  return lines.join("\n");
}

function downloadVCard(cv) {
  const blob = new Blob([buildVCard(cv)], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(cv.fullName || "cv").trim().replace(/\s+/g, "_")}.vcf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Shared Sub-components ─────────────────────────────
function SkillBar({ level, color }) {
  const pct = Math.min(Math.max(Number(level) || 0, 0), 100);
  return (
    <div className="cv-bar">
      <div className="cv-bar__fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)` }} />
    </div>
  );
}

function LangDots({ level, color }) {
  const map = { native: 5, fluent: 4, intermediate: 3, basic: 2, beginner: 1 };
  const filled = typeof level === "string" ? (map[level.toLowerCase()] ?? 3) : Math.round((level / 100) * 5);
  return (
    <div className="cv-dots">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="cv-dot"
          style={i <= filled
            ? { background: color, borderColor: color, boxShadow: `0 0 4px ${color}88` }
            : { borderColor: `${color}55`, background: "transparent" }} />
      ))}
    </div>
  );
}

function TimelineEntry({ title, subtitle, period, location, description, bullets, secColor }) {
  return (
    <div className="cv-timeline-item">
      <div className="cv-timeline-dot" style={secColor ? { background: secColor, boxShadow: `0 0 0 3px ${secColor}28` } : undefined}>▸</div>
      <div className="cv-timeline-content">
        <div className="cv-timeline-header">
          <strong className="cv-timeline-title">{title}</strong>
          {period && <span className="cv-timeline-period" style={secColor ? { color: secColor, background: `${secColor}12`, borderColor: `${secColor}28` } : undefined}>{period}</span>}
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

// ── Template: Classic (sidebar + main) ───────────────
function CVTemplateClassic({ cv, color, works, edus, skillGroups, certs, langs, awards, hobbies, sectionOrder }) {
  return (
    <div className="cv-document" id="cv-print">
      {/* LEFT SIDEBAR */}
      <aside className="cv-sidebar">
        <div className="cv-avatar-card">
          {cv.avatarUrl
            ? <img src={cv.avatarUrl} alt={cv.fullName} className="cv-avatar" />
            : <div className="cv-avatar cv-avatar--placeholder">{(cv.fullName || "H").charAt(0).toUpperCase()}</div>}
          <h1 className="cv-name-display">{cv.fullName || ""}</h1>
          {cv.jobTitle && <div className="cv-title-display">{cv.jobTitle}</div>}
        </div>

        {(cv.email || cv.phone || cv.address || cv.websiteUrl || cv.githubUrl || cv.linkedInUrl) && (
          <div className="cv-sidebar-card">
            <div className="cv-sidebar-section">
              <h3 className="cv-sidebar-title">Liên hệ</h3>
              {cv.email && <div className="cv-contact-item"><span className="cv-contact-icon">✉</span><a href={`mailto:${cv.email}`}>{cv.email}</a></div>}
              {cv.phone && <div className="cv-contact-item"><span className="cv-contact-icon">📱</span><span>{cv.phone}</span></div>}
              {cv.address && <div className="cv-contact-item"><span className="cv-contact-icon">📍</span><span>{cv.address}</span></div>}
              {cv.websiteUrl && <div className="cv-contact-item"><span className="cv-contact-icon">🌐</span><a href={cv.websiteUrl} target="_blank" rel="noopener noreferrer">{cv.websiteUrl.replace(/^https?:\/\//, "")}</a></div>}
              {cv.githubUrl && (
                <div className="cv-contact-item">
                  <span className="cv-contact-icon">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" /></svg>
                  </span>
                  <a href={cv.githubUrl} target="_blank" rel="noopener noreferrer">GitHub</a>
                </div>
              )}
              {cv.linkedInUrl && (
                <div className="cv-contact-item">
                  <span className="cv-contact-icon">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                  </span>
                  <a href={cv.linkedInUrl} target="_blank" rel="noopener noreferrer">LinkedIn</a>
                </div>
              )}
            </div>
          </div>
        )}

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
                        {item.level !== undefined && <span className="cv-skill-pct">{item.level}%</span>}
                      </div>
                      {item.level !== undefined && <SkillBar level={item.level} color={color} />}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

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

        {certs.length > 0 && (
          <div className="cv-sidebar-card">
            <div className="cv-sidebar-section">
              <h3 className="cv-sidebar-title">Chứng chỉ</h3>
              {certs.map((cert, i) => (
                <div key={i} className="cv-cert-item">
                  <div className="cv-cert-name">
                    {cert.credentialUrl ? <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer">{cert.name}</a> : cert.name}
                  </div>
                  {cert.issuer && <div className="cv-cert-issuer">{cert.issuer}</div>}
                  {cert.date && <div className="cv-cert-date">{cert.date}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {hobbies.length > 0 && (
          <div className="cv-sidebar-card">
            <div className="cv-sidebar-section">
              <h3 className="cv-sidebar-title">Sở thích</h3>
              <div className="cv-hobbies">
                {hobbies.map((h, i) => (
                  <span key={i} className="cv-hobby-tag" style={{ borderColor: color, color }}>
                    {h.icon && <span>{h.icon}</span>} {h.name || h}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* RIGHT MAIN */}
      <main className="cv-main">
        <div className="cv-header-card">
          <h1 className="cv-header__name">{cv.fullName || ""}</h1>
          {cv.jobTitle && <div className="cv-header__title">{cv.jobTitle}</div>}
          <div className="cv-header__tags">
            {cv.address && <span className="cv-header__tag">📍 {cv.address}</span>}
            {cv.websiteUrl && <span className="cv-header__tag">🌐 {cv.websiteUrl.replace(/^https?:\/\//, "")}</span>}
          </div>
        </div>

        {cv.summary && (
          <div className="cv-main-card cv-main-card--blue">
            <div className="cv-section">
              <h2 className="cv-section__title">Giới thiệu bản thân</h2>
              <p className="cv-summary">{cv.summary}</p>
            </div>
          </div>
        )}

        {sectionOrder.filter((s) => s.visible !== false).map((s) => {
          if (s.key === "work" && works.length > 0) return (
            <div className="cv-main-card cv-main-card--teal" key="work">
              <div className="cv-section">
                <h2 className="cv-section__title">Kinh nghiệm làm việc</h2>
                <div className="cv-timeline">
                  {works.map((exp, i) => (
                    <TimelineEntry key={i}
                      title={exp.position || exp.title} subtitle={exp.company}
                      period={exp.startDate ? `${exp.startDate} — ${exp.isCurrent ? "Hiện tại" : exp.endDate || ""}` : exp.period}
                      location={exp.location} description={exp.description}
                      bullets={exp.bullets || exp.achievements} />
                  ))}
                </div>
              </div>
            </div>
          );
          if (s.key === "education" && edus.length > 0) return (
            <div className="cv-main-card cv-main-card--violet" key="education">
              <div className="cv-section">
                <h2 className="cv-section__title">Học vấn</h2>
                <div className="cv-timeline">
                  {edus.map((edu, i) => (
                    <TimelineEntry key={i}
                      title={edu.degree || edu.title} subtitle={edu.school || edu.institution}
                      period={edu.startDate ? `${edu.startDate} — ${edu.endDate || "Hiện tại"}` : edu.period}
                      description={[edu.field, edu.gpa ? `GPA: ${edu.gpa}` : null, edu.description].filter(Boolean).join(" · ") || undefined}
                      bullets={edu.achievements} />
                  ))}
                </div>
              </div>
            </div>
          );
          if (s.key === "awards" && awards.length > 0) return (
            <div className="cv-main-card cv-main-card--green" key="awards">
              <div className="cv-section">
                <h2 className="cv-section__title">Giải thưởng & Thành tích</h2>
                <div className="cv-timeline">
                  {awards.map((award, i) => (
                    <TimelineEntry key={i}
                      title={award.title || award.name} subtitle={award.issuer || award.organization}
                      period={award.date} description={award.description} />
                  ))}
                </div>
              </div>
            </div>
          );
          return null;
        })}
      </main>
    </div>
  );
}

// ── Template: Modern (full-width hero + card grid) ────
function CVTemplateModern({ cv, color, works, edus, skillGroups, certs, langs, awards, hobbies, sectionOrder }) {
  const showWork      = isSectionVisible(sectionOrder, "work");
  const showEducation = isSectionVisible(sectionOrder, "education");
  const showAwards    = isSectionVisible(sectionOrder, "awards");
  return (
    <div className="cv-tpl-modern" id="cv-print">
      {/* Hero banner */}
      <div className="cvm-hero" style={{ "--cvm-accent": color }}>
        <div className="cvm-hero__inner">
          <div className="cvm-hero__avatar-wrap">
            {cv.avatarUrl
              ? <img src={cv.avatarUrl} alt={cv.fullName} className="cvm-hero__avatar" />
              : <div className="cvm-hero__avatar cvm-hero__avatar--placeholder">{(cv.fullName || "H").charAt(0).toUpperCase()}</div>}
          </div>
          <div className="cvm-hero__info">
            <h1 className="cvm-hero__name">{cv.fullName}</h1>
            {cv.jobTitle && <div className="cvm-hero__title">{cv.jobTitle}</div>}
            <div className="cvm-hero__contacts">
              {cv.email    && <a href={`mailto:${cv.email}`} className="cvm-chip">✉ {cv.email}</a>}
              {cv.phone    && <span className="cvm-chip">📱 {cv.phone}</span>}
              {cv.address  && <span className="cvm-chip">📍 {cv.address}</span>}
              {cv.websiteUrl && <a href={cv.websiteUrl} target="_blank" rel="noopener noreferrer" className="cvm-chip">🌐 {cv.websiteUrl.replace(/^https?:\/\//, "")}</a>}
              {cv.githubUrl  && <a href={cv.githubUrl}  target="_blank" rel="noopener noreferrer" className="cvm-chip">GitHub</a>}
              {cv.linkedInUrl && <a href={cv.linkedInUrl} target="_blank" rel="noopener noreferrer" className="cvm-chip">LinkedIn</a>}
            </div>
          </div>
        </div>
      </div>

      {/* Top card grid: summary + skills + languages */}
      {(cv.summary || skillGroups.length > 0 || langs.length > 0) && (
        <div className="cvm-top-grid">
          {cv.summary && (
            <div className="cvm-card cvm-card--wide">
              <h2 className="cvm-section-title" style={{ color }}>Giới thiệu bản thân</h2>
              <p className="cvm-summary">{cv.summary}</p>
            </div>
          )}
          {skillGroups.length > 0 && (
            <div className="cvm-card">
              <h2 className="cvm-section-title" style={{ color }}>Kỹ năng</h2>
              {skillGroups.map((group, gi) => (
                <div key={gi} className="cvms-group">
                  {group.category && <div className="cvms-cat">{group.category}</div>}
                  <div className="cvms-chips">
                    {(group.items || []).map((item, ii) => (
                      <span key={ii} className="cvms-chip" style={{ borderColor: `${color}40`, color, background: `${color}0d` }}>
                        {item.name}{item.level !== undefined && <sup> {item.level}%</sup>}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {(langs.length > 0 || certs.length > 0 || hobbies.length > 0) && (
            <div className="cvm-card">
              {langs.length > 0 && (
                <>
                  <h2 className="cvm-section-title" style={{ color }}>Ngôn ngữ</h2>
                  {langs.map((lang, i) => (
                    <div key={i} className="cvml-row">
                      <span className="cvml-name">{lang.language}</span>
                      <LangDots level={lang.proficiency} color={color} />
                    </div>
                  ))}
                </>
              )}
              {certs.length > 0 && (
                <>
                  <h2 className="cvm-section-title" style={{ color, marginTop: langs.length ? "1rem" : 0 }}>Chứng chỉ</h2>
                  {certs.map((cert, i) => (
                    <div key={i} className="cvm-cert-row">
                      <strong>{cert.credentialUrl ? <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer">{cert.name}</a> : cert.name}</strong>
                      {cert.issuer && <span className="cvm-cert-org"> — {cert.issuer}</span>}
                      {cert.date   && <span className="cvm-cert-year"> ({cert.date})</span>}
                    </div>
                  ))}
                </>
              )}
              {hobbies.length > 0 && (
                <>
                  <h2 className="cvm-section-title" style={{ color, marginTop: "1rem" }}>Sở thích</h2>
                  <div className="cvms-chips">
                    {hobbies.map((h, i) => (
                      <span key={i} className="cvms-chip" style={{ borderColor: `${color}40`, color }}>{h.icon} {h.name || h}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Work experience */}
      {showWork && works.length > 0 && (
        <div className="cvm-section-wrap">
          <h2 className="cvm-full-title" style={{ "--cvm-t-color": color }}>Kinh nghiệm làm việc</h2>
          <div className="cvm-timeline-grid">
            {works.map((exp, i) => (
              <TimelineEntry key={i}
                title={exp.position || exp.title} subtitle={exp.company}
                period={exp.startDate ? `${exp.startDate} — ${exp.isCurrent ? "Hiện tại" : exp.endDate || ""}` : exp.period}
                location={exp.location} description={exp.description}
                bullets={exp.bullets || exp.achievements} secColor={color} />
            ))}
          </div>
        </div>
      )}

      {/* Education + Awards side by side */}
      {((showEducation && edus.length > 0) || (showAwards && awards.length > 0)) && (
        <div className="cvm-two-col-wrap">
          {showEducation && edus.length > 0 && (
            <div className="cvm-section-wrap cvm-section-wrap--half">
              <h2 className="cvm-full-title" style={{ "--cvm-t-color": "#6248b0" }}>Học vấn</h2>
              {edus.map((edu, i) => (
                <TimelineEntry key={i}
                  title={edu.degree || edu.title} subtitle={edu.school || edu.institution}
                  period={edu.startDate ? `${edu.startDate} — ${edu.endDate || "Hiện tại"}` : edu.period}
                  description={[edu.field, edu.gpa ? `GPA: ${edu.gpa}` : null, edu.description].filter(Boolean).join(" · ") || undefined}
                  bullets={edu.achievements} secColor="#6248b0" />
              ))}
            </div>
          )}
          {showAwards && awards.length > 0 && (
            <div className="cvm-section-wrap cvm-section-wrap--half">
              <h2 className="cvm-full-title" style={{ "--cvm-t-color": "#2b7a4b" }}>Giải thưởng & Thành tích</h2>
              {awards.map((award, i) => (
                <TimelineEntry key={i}
                  title={award.title || award.name} subtitle={award.issuer || award.organization}
                  period={award.date} description={award.description} secColor="#2b7a4b" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Template: Compact (single-column, ATS-friendly) ───
function CVTemplateCompact({ cv, color, works, edus, skillGroups, certs, langs, awards, sectionOrder }) {
  const showWork      = isSectionVisible(sectionOrder, "work");
  const showEducation = isSectionVisible(sectionOrder, "education");
  const showAwards    = isSectionVisible(sectionOrder, "awards");
  return (
    <div className="cv-tpl-compact" id="cv-print">
      {/* Header */}
      <div className="cvc-header" style={{ "--cvc-accent": color }}>
        <div className="cvc-header__top">
          {cv.avatarUrl && <img src={cv.avatarUrl} alt={cv.fullName} className="cvc-avatar" />}
          <div className="cvc-header__text">
            <h1 className="cvc-name">{cv.fullName}</h1>
            {cv.jobTitle && <div className="cvc-title">{cv.jobTitle}</div>}
          </div>
        </div>
        <div className="cvc-contacts">
          {cv.email     && <a href={`mailto:${cv.email}`} className="cvc-contact-chip">✉ {cv.email}</a>}
          {cv.phone     && <span className="cvc-contact-chip">📱 {cv.phone}</span>}
          {cv.address   && <span className="cvc-contact-chip">📍 {cv.address}</span>}
          {cv.websiteUrl  && <a href={cv.websiteUrl}  target="_blank" rel="noopener noreferrer" className="cvc-contact-chip">🌐 {cv.websiteUrl.replace(/^https?:\/\//, "")}</a>}
          {cv.githubUrl   && <a href={cv.githubUrl}   target="_blank" rel="noopener noreferrer" className="cvc-contact-chip">GitHub</a>}
          {cv.linkedInUrl && <a href={cv.linkedInUrl} target="_blank" rel="noopener noreferrer" className="cvc-contact-chip">LinkedIn</a>}
        </div>
      </div>

      <div className="cvc-accent-bar" style={{ background: color }} />

      <div className="cvc-body">
        {/* Summary */}
        {cv.summary && (
          <section className="cvc-section">
            <h2 className="cvc-section-title" style={{ "--cvc-color": color }}>Giới thiệu bản thân</h2>
            <p className="cvc-summary">{cv.summary}</p>
          </section>
        )}

        {/* Skills */}
        {skillGroups.length > 0 && (
          <section className="cvc-section">
            <h2 className="cvc-section-title" style={{ "--cvc-color": color }}>Kỹ năng</h2>
            <div className="cvc-skills">
              {skillGroups.map((group, gi) => (
                <div key={gi} className="cvc-skill-group">
                  {group.category && <span className="cvc-skill-cat">{group.category}:</span>}
                  {(group.items || []).map((item, ii) => (
                    <span key={ii} className="cvc-skill-tag" style={{ background: `${color}12`, color, borderColor: `${color}30` }}>
                      {item.name}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Two-column: Work + Education */}
        <div className="cvc-two-col">
          {showWork && works.length > 0 && (
            <section className="cvc-section">
              <h2 className="cvc-section-title" style={{ "--cvc-color": color }}>Kinh nghiệm làm việc</h2>
              {works.map((exp, i) => (
                <div key={i} className="cvc-entry">
                  <div className="cvc-entry-header">
                    <strong className="cvc-entry-title">{exp.position || exp.title}</strong>
                    <span className="cvc-entry-period" style={{ color }}>
                      {exp.startDate ? `${exp.startDate} — ${exp.isCurrent ? "Nay" : exp.endDate || ""}` : exp.period}
                    </span>
                  </div>
                  {exp.company && <div className="cvc-entry-sub">{exp.company}{exp.location ? ` · ${exp.location}` : ""}</div>}
                  {exp.description && <p className="cvc-entry-desc">{exp.description}</p>}
                  {Array.isArray(exp.bullets) && exp.bullets.length > 0 && (
                    <ul className="cvc-bullets">{exp.bullets.map((b, bi) => <li key={bi}>{b}</li>)}</ul>
                  )}
                </div>
              ))}
            </section>
          )}
          {showEducation && edus.length > 0 && (
            <section className="cvc-section">
              <h2 className="cvc-section-title" style={{ "--cvc-color": "#6248b0" }}>Học vấn</h2>
              {edus.map((edu, i) => (
                <div key={i} className="cvc-entry">
                  <div className="cvc-entry-header">
                    <strong className="cvc-entry-title">{edu.degree || edu.title}</strong>
                    <span className="cvc-entry-period" style={{ color: "#6248b0" }}>
                      {edu.startDate ? `${edu.startDate} — ${edu.endDate || "Nay"}` : edu.period}
                    </span>
                  </div>
                  {(edu.school || edu.institution) && <div className="cvc-entry-sub">{edu.school || edu.institution}</div>}
                  {edu.field && <p className="cvc-entry-desc">{edu.field}{edu.gpa ? ` · GPA: ${edu.gpa}` : ""}</p>}
                  {Array.isArray(edu.achievements) && edu.achievements.length > 0 && (
                    <ul className="cvc-bullets">{edu.achievements.map((a, ai) => <li key={ai}>{a}</li>)}</ul>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>

        {/* Bottom row: langs + certs + awards */}
        {(langs.length > 0 || certs.length > 0 || (showAwards && awards.length > 0)) && (
          <div className="cvc-bottom-row">
            {langs.length > 0 && (
              <section className="cvc-section">
                <h2 className="cvc-section-title" style={{ "--cvc-color": "#1b7a72" }}>Ngôn ngữ</h2>
                {langs.map((lang, i) => (
                  <div key={i} className="cvc-lang-row">
                    <span className="cvc-lang-name">{lang.language}</span>
                    <span className="cvc-lang-level">{lang.proficiency}</span>
                  </div>
                ))}
              </section>
            )}
            {certs.length > 0 && (
              <section className="cvc-section">
                <h2 className="cvc-section-title" style={{ "--cvc-color": "#1b7a72" }}>Chứng chỉ</h2>
                {certs.map((cert, i) => (
                  <div key={i} className="cvc-cert-entry">
                    <strong>{cert.credentialUrl ? <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer">{cert.name}</a> : cert.name}</strong>
                    {cert.issuer && <span className="cvc-cert-org"> — {cert.issuer}</span>}
                    {cert.date   && <span className="cvc-cert-year"> ({cert.date})</span>}
                  </div>
                ))}
              </section>
            )}
            {showAwards && awards.length > 0 && (
              <section className="cvc-section">
                <h2 className="cvc-section-title" style={{ "--cvc-color": "#2b7a4b" }}>Giải thưởng</h2>
                {awards.map((award, i) => (
                  <div key={i} className="cvc-cert-entry">
                    <strong>{award.title || award.name}</strong>
                    {award.issuer && <span className="cvc-cert-org"> — {award.issuer}</span>}
                    {award.date   && <span className="cvc-cert-year"> ({award.date})</span>}
                    {award.description && <p className="cvc-entry-desc">{award.description}</p>}
                  </div>
                ))}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────
export function CVPage() {
  useThemeSync();
  const apiClient  = useMemo(() => createApiClient(async () => null), []);
  const { isSignedIn, getToken } = useAuth();
  const authedApi = useMemo(() => createApiClient(getToken), [getToken]);
  const [isPremium, setIsPremium] = useState(false);
  const [cv, setCv]           = useState(null);
  const [loading, setLoading] = useState(true);
  // `template` is an explicit visitor override (persisted to localStorage). When null, the
  // page falls back to the CV owner's server-saved `cv.template` — see `activeTemplate` below.
  const [template, setTemplate] = useState(() => {
    try { return localStorage.getItem("cv-template") || null; } catch { return null; }
  });
  const [templateKey, setTemplateKey] = useState(0);
  const [scrollPct, setScrollPct]     = useState(0);
  const [copied, setCopied]           = useState(false);
  const [localColor, setLocalColor]   = useState(() => {
    try { return localStorage.getItem("cv-local-color") || null; } catch { return null; }
  });
  const [showColorHint, setShowColorHint]         = useState(false);
  const [showScorePanel, setShowScorePanel]       = useState(false);
  const [showShareModal, setShowShareModal]       = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const colorPickerRef = useRef(null);

  // ── Persist choices ──
  useEffect(() => {
    if (!template) return;
    try { localStorage.setItem("cv-template", template); } catch { /* ignore */ }
  }, [template]);
  useEffect(() => {
    try {
      if (localColor) localStorage.setItem("cv-local-color", localColor);
      else localStorage.removeItem("cv-local-color");
    } catch { /* ignore */ }
  }, [localColor]);

  // ── Fetch CV ──
  useEffect(() => {
    apiClient.getPublic("/api/cv")
      .then((data) => { setCv(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [apiClient]);

  // ── Track public page views (once per browser session) ──
  useEffect(() => {
    if (!cv) return;
    const key = "portfolio-cv-viewed";
    if (sessionStorage.getItem(key) === "1") return;
    apiClient.postPublic("/api/cv/view", {})
      .then(() => sessionStorage.setItem(key, "1"))
      .catch(() => { /* view tracking is best-effort */ });
  }, [cv, apiClient]);

  // ── Premium status (gates PDF export) ──
  useEffect(() => {
    if (!isSignedIn) { setIsPremium(false); return; }
    let active = true;
    authedApi.getProtected("/api/premium/me")
      .then((status) => { if (active) setIsPremium(Boolean(status?.isPremium)); })
      .catch(() => { if (active) setIsPremium(false); });
    return () => { active = false; };
  }, [authedApi, isSignedIn]);

  // ── Scroll progress ──
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setScrollPct(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Switch template (keyed animation) ──
  const switchTemplate = useCallback((id) => {
    setShowTemplateGallery(false);
    setTemplate((current) => {
      if (id === current) return current;
      setTemplateKey((k) => k + 1);
      return id;
    });
  }, []);

  // ── Share ──
  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Link CV của bạn:", window.location.href);
    }
  }, []);

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

  const baseColor = cv.accentColor || "#3a6faa";
  const color     = localColor || baseColor;
  const rgb       = hexToRgb(color);

  const works       = parseSafe(cv.workExperiencesJson);
  const edus        = parseSafe(cv.educationsJson);
  const skillGroups = parseSafe(cv.skillGroupsJson);
  const certs       = parseSafe(cv.certificationsJson);
  const langs       = parseSafe(cv.languagesJson);
  const awards      = parseSafe(cv.awardsJson);
  const hobbies     = parseSafe(cv.hobbiesJson);

  // ── CV Completeness / Score ──
  const scoreItems = [
    { label: "Họ và tên",                       ok: !!cv.fullName?.trim(),  anchor: "personal" },
    { label: "Chức danh / vị trí",               ok: !!cv.jobTitle?.trim(),  anchor: "personal" },
    { label: "Email hoặc số điện thoại",         ok: !!(cv.email?.trim() || cv.phone?.trim()), anchor: "personal" },
    { label: "Giới thiệu bản thân",              ok: !!cv.summary?.trim(),   anchor: "summary" },
    { label: "Địa chỉ / liên kết mạng xã hội",   ok: !!(cv.address || cv.websiteUrl || cv.githubUrl || cv.linkedInUrl), anchor: "personal" },
    { label: "Kinh nghiệm làm việc",             ok: works.length > 0,       anchor: "work" },
    { label: "Học vấn",                          ok: edus.length > 0,        anchor: "education" },
    { label: "Kỹ năng",                          ok: skillGroups.length > 0, anchor: "skills" },
    { label: "Ngôn ngữ",                         ok: langs.length > 0,       anchor: "languages" },
    { label: "Chứng chỉ",                        ok: certs.length > 0,       anchor: "certs" },
  ];
  const completeness      = Math.round((scoreItems.filter((s) => s.ok).length / scoreItems.length) * 100);
  const completenessColor = completeness >= 80 ? "#22c55e" : completeness >= 50 ? "#f59e0b" : "#ef4444";
  const ringR             = 11;
  const ringC             = 2 * Math.PI * ringR;  // ~69.1
  const ringDash          = (completeness / 100) * ringC;

  // Visitor override (localStorage) wins over the CV owner's server-saved default template.
  const activeTemplate = template || cv.template || "classic";
  const sectionOrder   = resolveSectionOrder(cv.sectionOrderJson);
  const shareUrl        = typeof window !== "undefined" ? window.location.href : "";
  const qrUrl            = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(shareUrl)}`;

  const sharedProps = { cv, color, rgb, works, edus, skillGroups, certs, langs, awards, hobbies, sectionOrder };

  return (
    <div className="cv-root" style={{ "--cv-accent": color, "--cv-accent-rgb": rgb }}>

      {/* ── Scroll Progress Bar ── */}
      <div
        className="cv-scroll-bar"
        style={{ transform: `scaleX(${scrollPct / 100})`, background: color }}
        aria-hidden
      />

      {/* ── Topbar ── */}
      <nav className="cv-topbar">
        <div className="cv-topbar__content">

          {/* Left: brand */}
          <div className="cv-topbar__left">
            <Link to="/" className="cv-topbar__brand">◆ hiennt.website</Link>
          </div>

          {/* Center: template switcher */}
          <div className="cv-tpl-switcher" aria-label="Chọn mẫu template">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`cv-tpl-btn${activeTemplate === t.id ? " is-active" : ""}`}
                onClick={() => switchTemplate(t.id)}
                title={t.label}
                style={activeTemplate === t.id ? { "--tpl-active-color": color } : undefined}
              >
                <span className="cv-tpl-btn__icon">{t.icon}</span>
                <span className="cv-tpl-btn__label">{t.label}</span>
              </button>
            ))}
            <button
              type="button"
              className="cv-tpl-gallery-btn"
              onClick={() => setShowTemplateGallery(true)}
              title="Xem thư viện mẫu CV"
            >
              🖼
            </button>
          </div>

          {/* Right: actions */}
          <div className="cv-topbar__actions">

            {/* CV Score — click to open detail checklist */}
            <div className="cv-score-wrap">
              <button
                type="button"
                className="cv-completeness"
                onClick={() => setShowScorePanel((v) => !v)}
                title={`CV hoàn thiện ${completeness}% — bấm để xem chi tiết`}
              >
                <svg viewBox="0 0 26 26" className="cv-completeness__svg" aria-hidden>
                  <circle cx="13" cy="13" r={ringR} fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
                  <circle
                    cx="13" cy="13" r={ringR}
                    fill="none"
                    stroke={completenessColor}
                    strokeWidth="2.5"
                    strokeDasharray={`${ringDash} ${ringC}`}
                    strokeLinecap="round"
                    style={{ transformOrigin: "center", transform: "rotate(-90deg)" }}
                  />
                </svg>
                <span className="cv-completeness__pct" style={{ color: completenessColor }}>
                  {completeness}%
                </span>
              </button>

              {showScorePanel && (
                <>
                  <div className="cv-score-backdrop" onClick={() => setShowScorePanel(false)} />
                  <div className="cv-score-panel">
                    <div className="cv-score-panel__head">
                      <strong>Độ mạnh CV</strong>
                      <span style={{ color: completenessColor }}>{completeness}%</span>
                    </div>
                    <ul className="cv-score-list">
                      {scoreItems.map((item, i) => (
                        <li key={i} className={item.ok ? "is-ok" : "is-missing"}>
                          <span className="cv-score-list__icon">{item.ok ? "✓" : "○"}</span>
                          <span className="cv-score-list__label">{item.label}</span>
                          {!item.ok && (
                            <Link to={`/cv/edit#${item.anchor}`} className="cv-score-list__fix">Bổ sung →</Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>

            {/* Color picker */}
            <div
              className="cv-color-picker-wrap"
              onMouseEnter={() => setShowColorHint(true)}
              onMouseLeave={() => setShowColorHint(false)}
            >
              <button
                type="button"
                className="cv-color-btn"
                onClick={() => localColor ? setLocalColor(null) : colorPickerRef.current?.click()}
                title={localColor ? `Màu đã thay đổi — click để khôi phục gốc (${baseColor})` : "Đổi màu accent (chỉ cho bạn xem)"}
              >
                <span className="cv-color-dot" style={{ background: color }} />
                {localColor && <span className="cv-color-reset">↺</span>}
              </button>
              <input
                ref={colorPickerRef}
                type="color"
                value={color}
                onChange={(e) => setLocalColor(e.target.value)}
                className="cv-color-input"
                aria-hidden
                tabIndex={-1}
              />
              {showColorHint && (
                <div className="cv-color-tooltip">
                  {localColor ? `🎨 Màu cá nhân — click ↺ để reset` : "🎨 Cá nhân hoá màu accent"}
                </div>
              )}
            </div>

            {/* Share */}
            <button
              type="button"
              className="cv-btn cv-btn--outline"
              onClick={() => setShowShareModal(true)}
              title="Chia sẻ CV"
            >
              🔗 Chia sẻ
            </button>

            {/* Download / Print — gated behind Premium */}
            {isPremium ? (
              <button
                type="button"
                className="cv-btn cv-btn--primary"
                onClick={() => window.print()}
                title="In hoặc lưu PDF"
              >
                ⬇ Download PDF
              </button>
            ) : (
              <Link
                to="/premium"
                className="cv-btn cv-btn--primary"
                title="Xuất PDF là tính năng Premium"
              >
                ✨ Download PDF (Premium)
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── Rendered template (keyed for enter animation) ── */}
      <div className="cv-template-wrap cv-tpl-enter" key={templateKey}>
        {activeTemplate === "classic" && <CVTemplateClassic {...sharedProps} />}
        {activeTemplate === "modern"  && <CVTemplateModern  {...sharedProps} />}
        {activeTemplate === "compact" && <CVTemplateCompact {...sharedProps} />}
      </div>

      {/* ── Footer ── */}
      <footer className="cv-footer">
        <div className="cv-footer__content">
          <span>© {new Date().getFullYear()} {cv.fullName || "hiennt.website"}</span>
          <span className="cv-footer__note">hiennt.website</span>
        </div>
      </footer>

      {/* ── Share modal: link + QR + vCard ── */}
      {showShareModal && (
        <div className="cv-modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cv-modal__head">
              <h3>🔗 Chia sẻ CV</h3>
              <button type="button" className="cv-modal__close" onClick={() => setShowShareModal(false)}>✕</button>
            </div>
            <div className="cv-modal__body cv-share-modal">
              <img src={qrUrl} alt="QR code liên kết CV" className="cv-share-qr" width={160} height={160} />
              <div className="cv-share-link-row">
                <input readOnly className="cv-share-link-input" value={shareUrl} onFocus={(e) => e.target.select()} />
                <button
                  type="button"
                  className={`cv-btn${copied ? " cv-btn--success" : " cv-btn--primary"}`}
                  onClick={handleShare}
                >
                  {copied ? "✓ Đã copy" : "Copy link"}
                </button>
              </div>
              <button type="button" className="cv-btn cv-btn--outline cv-share-vcard" onClick={() => downloadVCard(cv)}>
                📇 Tải danh thiếp (.vcf)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Template gallery modal ── */}
      {showTemplateGallery && (
        <div className="cv-modal-overlay" onClick={() => setShowTemplateGallery(false)}>
          <div className="cv-modal cv-modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="cv-modal__head">
              <h3>🖼 Thư viện mẫu CV</h3>
              <button type="button" className="cv-modal__close" onClick={() => setShowTemplateGallery(false)}>✕</button>
            </div>
            <div className="cv-modal__body cv-tpl-gallery">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`cv-tpl-gallery-card${activeTemplate === t.id ? " is-active" : ""}`}
                  onClick={() => switchTemplate(t.id)}
                >
                  <span className={`cv-tpl-gallery-preview cv-tpl-gallery-preview--${t.id}`} style={{ "--tpl-color": color }} aria-hidden>
                    <span className="cv-tpl-gallery-preview__block" />
                    <span className="cv-tpl-gallery-preview__block" />
                    <span className="cv-tpl-gallery-preview__block" />
                  </span>
                  <span className="cv-tpl-gallery-card__label">{t.icon} {t.label}</span>
                  <span className="cv-tpl-gallery-card__desc">{t.desc}</span>
                  {activeTemplate === t.id && <span className="cv-tpl-gallery-card__badge">Đang dùng</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
