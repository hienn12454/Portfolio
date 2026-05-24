import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { createApiClient } from "../core/http/apiClient";
import { useThemeSync } from "../core/useThemeSync";
import "./CVEditPage.css";

// ── helpers ──────────────────────────────────────────────
function parseSafe(json, fallback = []) {
  if (!json) return fallback;
  try { return JSON.parse(json); } catch { return fallback; }
}

function newId() { return crypto.randomUUID(); }

// ── reusable subcomponents ────────────────────────────────
function FieldRow({ label, children, hint }) {
  return (
    <div className="cve-field">
      <label className="cve-label">{label}</label>
      {children}
      {hint && <span className="cve-hint">{hint}</span>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      className="cve-input"
      type={type}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      className="cve-textarea"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
    />
  );
}

// ── Work experience card ──────────────────────────────────
function WorkCard({ item, onChange, onRemove }) {
  function field(key) { return (v) => onChange({ ...item, [key]: v }); }
  return (
    <div className="cve-card">
      <button className="cve-card-remove" onClick={onRemove} title="Xóa">✕</button>
      <div className="cve-card-grid">
        <FieldRow label="Vị trí / Chức danh *">
          <TextInput value={item.position} onChange={field("position")} placeholder="Fullstack Developer" />
        </FieldRow>
        <FieldRow label="Công ty *">
          <TextInput value={item.company} onChange={field("company")} placeholder="FPT Software" />
        </FieldRow>
        <FieldRow label="Thời gian bắt đầu">
          <TextInput value={item.startDate} onChange={field("startDate")} placeholder="01/2022" />
        </FieldRow>
        <FieldRow label="Thời gian kết thúc">
          <TextInput value={item.endDate} onChange={field("endDate")} placeholder="12/2023 (để trống nếu hiện tại)" />
        </FieldRow>
        <FieldRow label="Địa điểm">
          <TextInput value={item.location} onChange={field("location")} placeholder="Hà Nội" />
        </FieldRow>
        <FieldRow label="Đang làm việc tại đây">
          <label className="cve-toggle">
            <input type="checkbox" checked={!!item.isCurrent} onChange={(e) => field("isCurrent")(e.target.checked)} />
            <span className="cve-toggle-slider" />
            Hiện tại
          </label>
        </FieldRow>
      </div>
      <FieldRow label="Mô tả">
        <TextArea value={item.description} onChange={field("description")} placeholder="Mô tả công việc, trách nhiệm..." rows={3} />
      </FieldRow>
      <FieldRow label="Thành tích (mỗi dòng 1 mục)" hint="Mỗi dòng là một bullet point">
        <TextArea
          value={(item.bullets || []).join("\n")}
          onChange={(v) => field("bullets")(v.split("\n").filter((l) => l.trim()))}
          placeholder="- Tăng hiệu năng hệ thống 40%&#10;- Dẫn đầu nhóm 5 developer"
          rows={3}
        />
      </FieldRow>
    </div>
  );
}

// ── Education card ────────────────────────────────────────
function EduCard({ item, onChange, onRemove }) {
  function field(key) { return (v) => onChange({ ...item, [key]: v }); }
  return (
    <div className="cve-card">
      <button className="cve-card-remove" onClick={onRemove} title="Xóa">✕</button>
      <div className="cve-card-grid">
        <FieldRow label="Bằng cấp / Chương trình *">
          <TextInput value={item.degree} onChange={field("degree")} placeholder="Kỹ sư Công nghệ Thông tin" />
        </FieldRow>
        <FieldRow label="Trường *">
          <TextInput value={item.school} onChange={field("school")} placeholder="Đại học Bách Khoa Hà Nội" />
        </FieldRow>
        <FieldRow label="Chuyên ngành">
          <TextInput value={item.field} onChange={field("field")} placeholder="Khoa học Máy tính" />
        </FieldRow>
        <FieldRow label="GPA">
          <TextInput value={item.gpa} onChange={field("gpa")} placeholder="3.8 / 4.0" />
        </FieldRow>
        <FieldRow label="Thời gian bắt đầu">
          <TextInput value={item.startDate} onChange={field("startDate")} placeholder="09/2018" />
        </FieldRow>
        <FieldRow label="Thời gian kết thúc">
          <TextInput value={item.endDate} onChange={field("endDate")} placeholder="06/2022" />
        </FieldRow>
      </div>
      <FieldRow label="Thành tích nổi bật (mỗi dòng 1 mục)">
        <TextArea
          value={(item.achievements || []).join("\n")}
          onChange={(v) => field("achievements")(v.split("\n").filter((l) => l.trim()))}
          placeholder="- Học bổng toàn phần&#10;- Top 5% sinh viên xuất sắc"
          rows={3}
        />
      </FieldRow>
    </div>
  );
}

// ── Skill group card ──────────────────────────────────────
function SkillGroupCard({ group, onChange, onRemove }) {
  function updateItem(idx, item) {
    const items = [...(group.items || [])];
    items[idx] = item;
    onChange({ ...group, items });
  }
  function addItem() {
    onChange({ ...group, items: [...(group.items || []), { id: newId(), name: "", level: 80 }] });
  }
  function removeItem(idx) {
    const items = [...(group.items || [])];
    items.splice(idx, 1);
    onChange({ ...group, items });
  }

  return (
    <div className="cve-card">
      <button className="cve-card-remove" onClick={onRemove} title="Xóa nhóm">✕</button>
      <FieldRow label="Tên nhóm kỹ năng">
        <TextInput
          value={group.category}
          onChange={(v) => onChange({ ...group, category: v })}
          placeholder="Frontend / Backend / DevOps..."
        />
      </FieldRow>
      <div className="cve-skill-items">
        {(group.items || []).map((item, idx) => (
          <div key={item.id || idx} className="cve-skill-item">
            <TextInput
              value={item.name}
              onChange={(v) => updateItem(idx, { ...item, name: v })}
              placeholder="React, Node.js..."
            />
            <div className="cve-skill-level">
              <input
                type="range"
                min={0}
                max={100}
                value={item.level ?? 80}
                onChange={(e) => updateItem(idx, { ...item, level: Number(e.target.value) })}
                className="cve-range"
              />
              <span className="cve-range-val">{item.level ?? 80}%</span>
            </div>
            <button className="cve-icon-btn cve-icon-btn--danger" onClick={() => removeItem(idx)} title="Xóa">✕</button>
          </div>
        ))}
        <button className="cve-add-btn" onClick={addItem}>+ Thêm kỹ năng</button>
      </div>
    </div>
  );
}

// ── Certification card ────────────────────────────────────
function CertCard({ item, onChange, onRemove }) {
  function field(key) { return (v) => onChange({ ...item, [key]: v }); }
  return (
    <div className="cve-card">
      <button className="cve-card-remove" onClick={onRemove} title="Xóa">✕</button>
      <div className="cve-card-grid">
        <FieldRow label="Tên chứng chỉ *">
          <TextInput value={item.name} onChange={field("name")} placeholder="AWS Certified Developer" />
        </FieldRow>
        <FieldRow label="Tổ chức cấp">
          <TextInput value={item.issuer} onChange={field("issuer")} placeholder="Amazon Web Services" />
        </FieldRow>
        <FieldRow label="Ngày cấp">
          <TextInput value={item.date} onChange={field("date")} placeholder="03/2023" />
        </FieldRow>
        <FieldRow label="Ngày hết hạn">
          <TextInput value={item.expiryDate} onChange={field("expiryDate")} placeholder="03/2026" />
        </FieldRow>
      </div>
      <FieldRow label="Link chứng chỉ">
        <TextInput value={item.credentialUrl} onChange={field("credentialUrl")} placeholder="https://..." type="url" />
      </FieldRow>
    </div>
  );
}

// ── Language card ─────────────────────────────────────────
function LangCard({ item, onChange, onRemove }) {
  const levels = ["native", "fluent", "intermediate", "basic", "beginner"];
  return (
    <div className="cve-card cve-card--compact">
      <button className="cve-card-remove" onClick={onRemove} title="Xóa">✕</button>
      <div className="cve-card-grid">
        <FieldRow label="Ngôn ngữ *">
          <TextInput value={item.language} onChange={(v) => onChange({ ...item, language: v })} placeholder="Tiếng Anh" />
        </FieldRow>
        <FieldRow label="Trình độ">
          <select
            className="cve-select"
            value={item.proficiency || "intermediate"}
            onChange={(e) => onChange({ ...item, proficiency: e.target.value })}
          >
            {levels.map((l) => (
              <option key={l} value={l}>
                {l === "native" ? "Ngôn ngữ mẹ đẻ" :
                 l === "fluent" ? "Thành thạo" :
                 l === "intermediate" ? "Trung cấp" :
                 l === "basic" ? "Cơ bản" : "Mới bắt đầu"}
              </option>
            ))}
          </select>
        </FieldRow>
      </div>
    </div>
  );
}

// ── Award card ────────────────────────────────────────────
function AwardCard({ item, onChange, onRemove }) {
  function field(key) { return (v) => onChange({ ...item, [key]: v }); }
  return (
    <div className="cve-card">
      <button className="cve-card-remove" onClick={onRemove} title="Xóa">✕</button>
      <div className="cve-card-grid">
        <FieldRow label="Tên giải thưởng *">
          <TextInput value={item.title} onChange={field("title")} placeholder="Giải nhất Hackathon..." />
        </FieldRow>
        <FieldRow label="Tổ chức / Đơn vị">
          <TextInput value={item.issuer} onChange={field("issuer")} placeholder="VNG Corporation" />
        </FieldRow>
        <FieldRow label="Thời gian">
          <TextInput value={item.date} onChange={field("date")} placeholder="10/2023" />
        </FieldRow>
      </div>
      <FieldRow label="Mô tả">
        <TextArea value={item.description} onChange={field("description")} placeholder="Chi tiết về giải thưởng..." rows={2} />
      </FieldRow>
    </div>
  );
}

// ── CollapsiblePanel ──────────────────────────────────────
function Panel({ title, children, badge, id }) {
  const [open, setOpen] = useState(true);
  return (
    <div id={id} className={`cve-panel ${open ? "cve-panel--open" : ""}`}>
      <button className="cve-panel-header" onClick={() => setOpen((o) => !o)}>
        <span className="cve-panel-title">{title}</span>
        {badge !== undefined && <span className="cve-panel-badge">{badge}</span>}
        <span className="cve-panel-chevron">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="cve-panel-body">{children}</div>}
    </div>
  );
}

// ── Main Editor Page ──────────────────────────────────────
export function CVEditPage() {
  useThemeSync();
  const { getToken } = useAuth();
  const apiClient = useMemo(() => createApiClient(getToken), [getToken]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  // Personal info
  const [info, setInfo] = useState({
    fullName: "", jobTitle: "", email: "", phone: "",
    address: "", avatarUrl: "", websiteUrl: "", githubUrl: "",
    linkedInUrl: "", summary: "", accentColor: "#2563eb", isPublic: true,
  });

  // Sections
  const [works, setWorks] = useState([]);
  const [edus, setEdus] = useState([]);
  const [skillGroups, setSkillGroups] = useState([]);
  const [certs, setCerts] = useState([]);
  const [langs, setLangs] = useState([]);
  const [awards, setAwards] = useState([]);
  const [hobbies, setHobbies] = useState([]);

  useEffect(() => {
    apiClient.getProtected("/api/cv/admin").then((data) => {
      if (!data) return;
      setInfo({
        fullName: data.fullName || "",
        jobTitle: data.jobTitle || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        avatarUrl: data.avatarUrl || "",
        websiteUrl: data.websiteUrl || "",
        githubUrl: data.githubUrl || "",
        linkedInUrl: data.linkedInUrl || "",
        summary: data.summary || "",
        accentColor: data.accentColor || "#2563eb",
        isPublic: data.isPublic !== false,
      });
      setWorks(parseSafe(data.workExperiencesJson));
      setEdus(parseSafe(data.educationsJson));
      setSkillGroups(parseSafe(data.skillGroupsJson));
      setCerts(parseSafe(data.certificationsJson));
      setLangs(parseSafe(data.languagesJson));
      setAwards(parseSafe(data.awardsJson));
      setHobbies(parseSafe(data.hobbiesJson, []));
    }).catch(() => {});
  }, [apiClient]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await apiClient.putProtected("/api/cv", {
        ...info,
        workExperiencesJson: JSON.stringify(works),
        educationsJson: JSON.stringify(edus),
        skillGroupsJson: JSON.stringify(skillGroups),
        certificationsJson: JSON.stringify(certs),
        languagesJson: JSON.stringify(langs),
        awardsJson: JSON.stringify(awards),
        hobbiesJson: JSON.stringify(hobbies),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError("Lưu thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  function addWork() { setWorks((w) => [...w, { id: newId(), position: "", company: "", isCurrent: false }]); }
  function addEdu() { setEdus((e) => [...e, { id: newId(), degree: "", school: "" }]); }
  function addSkillGroup() { setSkillGroups((g) => [...g, { id: newId(), category: "", items: [] }]); }
  function addCert() { setCerts((c) => [...c, { id: newId(), name: "" }]); }
  function addLang() { setLangs((l) => [...l, { id: newId(), language: "", proficiency: "intermediate" }]); }
  function addAward() { setAwards((a) => [...a, { id: newId(), title: "" }]); }

  return (
    <div className="cve-root site">
      {/* Header */}
      <div className="cve-header">
        <div className="cve-header__toprow">
          <Link to="/" className="cve-back-link">← Trang chủ</Link>
          <Link to="/admin" className="cve-back-link">Admin Dashboard</Link>
        </div>
        <div className="cve-header__content">
          <div>
            <h1 className="cve-header__title">Chỉnh sửa CV</h1>
            <p className="cve-header__sub">Thiết kế CV của bạn — sẽ hiển thị tại <strong>hiennt.website/cv</strong></p>
          </div>
          <div className="cve-header__actions">
            <Link to="/cv" target="_blank" className="cve-btn cve-btn--outline">👁 Xem CV</Link>
            <button
              className={`cve-btn cve-btn--primary ${saving ? "cve-btn--loading" : ""}`}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Đang lưu..." : saved ? "✓ Đã lưu!" : "💾 Lưu CV"}
            </button>
          </div>
        </div>
        {error && <div className="cve-error">{error}</div>}
        {saved && <div className="cve-success">CV đã được lưu thành công! 🎉</div>}
      </div>

      <div className="cve-layout">
        {/* Sidebar nav */}
        <aside className="cve-nav">
          {[
            { id: "personal", label: "👤 Thông tin cá nhân" },
            { id: "summary", label: "📝 Giới thiệu" },
            { id: "work", label: "💼 Kinh nghiệm" },
            { id: "education", label: "🎓 Học vấn" },
            { id: "skills", label: "⚡ Kỹ năng" },
            { id: "certs", label: "🏅 Chứng chỉ" },
            { id: "languages", label: "🌐 Ngôn ngữ" },
            { id: "awards", label: "🏆 Giải thưởng" },
            { id: "hobbies", label: "🎯 Sở thích" },
            { id: "settings", label: "⚙️ Cài đặt" },
          ].map(({ id, label }) => (
            <a key={id} className="cve-nav-item" href={`#${id}`}>{label}</a>
          ))}
        </aside>

        {/* Main content */}
        <div className="cve-content">
          {/* Personal Info */}
          <Panel title="👤 Thông tin cá nhân" id="personal">
            <div className="cve-grid-2">
              <FieldRow label="Họ và tên *">
                <TextInput value={info.fullName} onChange={(v) => setInfo((i) => ({ ...i, fullName: v }))} placeholder="Nguyễn Trung Hiên" />
              </FieldRow>
              <FieldRow label="Chức danh / Vị trí">
                <TextInput value={info.jobTitle} onChange={(v) => setInfo((i) => ({ ...i, jobTitle: v }))} placeholder="Fullstack Developer" />
              </FieldRow>
              <FieldRow label="Email">
                <TextInput value={info.email} onChange={(v) => setInfo((i) => ({ ...i, email: v }))} placeholder="hiennt@example.com" type="email" />
              </FieldRow>
              <FieldRow label="Số điện thoại">
                <TextInput value={info.phone} onChange={(v) => setInfo((i) => ({ ...i, phone: v }))} placeholder="+84 903 xxx xxx" />
              </FieldRow>
              <FieldRow label="Địa chỉ">
                <TextInput value={info.address} onChange={(v) => setInfo((i) => ({ ...i, address: v }))} placeholder="Hà Nội, Việt Nam" />
              </FieldRow>
              <FieldRow label="Ảnh đại diện (URL)">
                <TextInput value={info.avatarUrl} onChange={(v) => setInfo((i) => ({ ...i, avatarUrl: v }))} placeholder="https://..." type="url" />
              </FieldRow>
              <FieldRow label="Website">
                <TextInput value={info.websiteUrl} onChange={(v) => setInfo((i) => ({ ...i, websiteUrl: v }))} placeholder="https://hiennt.website" type="url" />
              </FieldRow>
              <FieldRow label="GitHub">
                <TextInput value={info.githubUrl} onChange={(v) => setInfo((i) => ({ ...i, githubUrl: v }))} placeholder="https://github.com/..." type="url" />
              </FieldRow>
              <FieldRow label="LinkedIn">
                <TextInput value={info.linkedInUrl} onChange={(v) => setInfo((i) => ({ ...i, linkedInUrl: v }))} placeholder="https://linkedin.com/in/..." type="url" />
              </FieldRow>
            </div>
          </Panel>

          {/* Summary */}
          <Panel title="📝 Giới thiệu bản thân" id="summary">
            <FieldRow label="Tóm tắt chuyên nghiệp" hint="2-4 câu giới thiệu bản thân, điểm mạnh và mục tiêu">
              <TextArea
                value={info.summary}
                onChange={(v) => setInfo((i) => ({ ...i, summary: v }))}
                placeholder="Kỹ sư phần mềm với 3+ năm kinh nghiệm xây dựng các ứng dụng web hiện đại. Đam mê clean code và UX tốt..."
                rows={5}
              />
            </FieldRow>
          </Panel>

          {/* Work Experience */}
          <Panel title="💼 Kinh nghiệm làm việc" badge={works.length} id="work">
            {works.map((w, i) => (
              <WorkCard
                key={w.id || i}
                item={w}
                onChange={(updated) => setWorks((arr) => arr.map((x, idx) => idx === i ? updated : x))}
                onRemove={() => setWorks((arr) => arr.filter((_, idx) => idx !== i))}
              />
            ))}
            <button className="cve-add-section-btn" onClick={addWork}>+ Thêm kinh nghiệm làm việc</button>
          </Panel>

          {/* Education */}
          <Panel title="🎓 Học vấn" badge={edus.length} id="education">
            {edus.map((e, i) => (
              <EduCard
                key={e.id || i}
                item={e}
                onChange={(updated) => setEdus((arr) => arr.map((x, idx) => idx === i ? updated : x))}
                onRemove={() => setEdus((arr) => arr.filter((_, idx) => idx !== i))}
              />
            ))}
            <button className="cve-add-section-btn" onClick={addEdu}>+ Thêm học vấn</button>
          </Panel>

          {/* Skills */}
          <Panel title="⚡ Kỹ năng" badge={skillGroups.length} id="skills">
            {skillGroups.map((g, i) => (
              <SkillGroupCard
                key={g.id || i}
                group={g}
                onChange={(updated) => setSkillGroups((arr) => arr.map((x, idx) => idx === i ? updated : x))}
                onRemove={() => setSkillGroups((arr) => arr.filter((_, idx) => idx !== i))}
              />
            ))}
            <button className="cve-add-section-btn" onClick={addSkillGroup}>+ Thêm nhóm kỹ năng</button>
          </Panel>

          {/* Certifications */}
          <Panel title="🏅 Chứng chỉ" badge={certs.length} id="certs">
            {certs.map((c, i) => (
              <CertCard
                key={c.id || i}
                item={c}
                onChange={(updated) => setCerts((arr) => arr.map((x, idx) => idx === i ? updated : x))}
                onRemove={() => setCerts((arr) => arr.filter((_, idx) => idx !== i))}
              />
            ))}
            <button className="cve-add-section-btn" onClick={addCert}>+ Thêm chứng chỉ</button>
          </Panel>

          {/* Languages */}
          <Panel title="🌐 Ngôn ngữ" badge={langs.length} id="languages">
            {langs.map((l, i) => (
              <LangCard
                key={l.id || i}
                item={l}
                onChange={(updated) => setLangs((arr) => arr.map((x, idx) => idx === i ? updated : x))}
                onRemove={() => setLangs((arr) => arr.filter((_, idx) => idx !== i))}
              />
            ))}
            <button className="cve-add-section-btn" onClick={addLang}>+ Thêm ngôn ngữ</button>
          </Panel>

          {/* Awards */}
          <Panel title="🏆 Giải thưởng & Thành tích" badge={awards.length} id="awards">
            {awards.map((a, i) => (
              <AwardCard
                key={a.id || i}
                item={a}
                onChange={(updated) => setAwards((arr) => arr.map((x, idx) => idx === i ? updated : x))}
                onRemove={() => setAwards((arr) => arr.filter((_, idx) => idx !== i))}
              />
            ))}
            <button className="cve-add-section-btn" onClick={addAward}>+ Thêm giải thưởng</button>
          </Panel>

          {/* Hobbies */}
          <Panel title="🎯 Sở thích" id="hobbies">
            <FieldRow label="Sở thích (mỗi dòng 1 sở thích)" hint="Có thể thêm emoji: 📚 Đọc sách">
              <TextArea
                value={hobbies.map((h) => (typeof h === "string" ? h : `${h.icon || ""} ${h.name || h}`).trim()).join("\n")}
                onChange={(v) =>
                  setHobbies(
                    v.split("\n")
                      .map((l) => l.trim())
                      .filter(Boolean)
                      .map((l) => {
                        const emojiMatch = l.match(/^([\p{Emoji_Presentation}\p{Extended_Pictographic}]+)\s*(.+)$/u);
                        if (emojiMatch) return { icon: emojiMatch[1].trim(), name: emojiMatch[2].trim() };
                        return { name: l };
                      })
                  )
                }
                placeholder={"📚 Đọc sách\n🎮 Gaming\n🏃 Chạy bộ\n🎵 Nghe nhạc"}
                rows={5}
              />
            </FieldRow>
          </Panel>

          {/* Settings */}
          <Panel title="⚙️ Cài đặt" id="settings">
            <div className="cve-grid-2">
              <FieldRow label="Màu chủ đạo" hint="Màu accent hiển thị trên CV">
                <div className="cve-color-picker">
                  <input
                    type="color"
                    value={info.accentColor}
                    onChange={(e) => setInfo((i) => ({ ...i, accentColor: e.target.value }))}
                    className="cve-color-swatch"
                  />
                  <TextInput
                    value={info.accentColor}
                    onChange={(v) => setInfo((i) => ({ ...i, accentColor: v }))}
                    placeholder="#2563eb"
                  />
                </div>
              </FieldRow>
              <FieldRow label="Hiển thị công khai">
                <label className="cve-toggle">
                  <input
                    type="checkbox"
                    checked={!!info.isPublic}
                    onChange={(e) => setInfo((i) => ({ ...i, isPublic: e.target.checked }))}
                  />
                  <span className="cve-toggle-slider" />
                  {info.isPublic ? "CV hiển thị cho mọi người" : "CV ẩn"}
                </label>
              </FieldRow>
            </div>
          </Panel>

          {/* Save button bottom */}
          <div className="cve-bottom-save">
            <button
              className={`cve-btn cve-btn--primary cve-btn--large ${saving ? "cve-btn--loading" : ""}`}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Đang lưu..." : saved ? "✓ Đã lưu!" : "💾 Lưu CV"}
            </button>
            <Link to="/cv" target="_blank" className="cve-btn cve-btn--outline">👁 Xem CV của bạn →</Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="cve-footer">
        <div className="cve-footer__inner">
          <span>© {new Date().getFullYear()} hiennt.website — CV Editor</span>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <Link to="/cv" className="cve-footer__link">Xem CV công khai</Link>
            <Link to="/admin" className="cve-footer__link">Admin Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
