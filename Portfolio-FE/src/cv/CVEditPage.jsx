import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { createApiClient } from "../core/http/apiClient";
import { useThemeSync } from "../core/useThemeSync";
import { TEMPLATES, DEFAULT_SECTION_ORDER, SECTION_LABELS } from "./cvShared";
import "./CVEditPage.css";

// ── helpers ──────────────────────────────────────────────
function parseSafe(json, fallback = []) {
  if (!json) return fallback;
  try { return JSON.parse(json); } catch { return fallback; }
}

function newId() { return crypto.randomUUID(); }

// ── Field validation (mirrors CvController.ValidateCvProfile on the backend) ──
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// Vietnamese mobile/landline: 0xxxxxxxxx (10 digits) or +84xxxxxxxxx (9-10 digits).
const PHONE_RE = /^(0\d{9,10}|\+84\d{9,10})$/;
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

function validateCvInfo(info) {
  const errors = {};

  if (!info.fullName?.trim()) {
    errors.fullName = "Vui lòng nhập họ và tên.";
  } else if (info.fullName.trim().length > 150) {
    errors.fullName = "Họ và tên không được vượt quá 150 ký tự.";
  }

  if (info.jobTitle && info.jobTitle.trim().length > 150) {
    errors.jobTitle = "Chức danh không được vượt quá 150 ký tự.";
  }

  if (info.email?.trim()) {
    const email = info.email.trim();
    if (email.length > 254 || !EMAIL_RE.test(email)) {
      errors.email = "Email không hợp lệ. Vui lòng nhập đúng định dạng (vd: ten@example.com).";
    }
  }

  if (info.phone?.trim()) {
    const digitsOnly = info.phone.trim().replace(/[\s\-.]/g, "");
    if (!PHONE_RE.test(digitsOnly)) {
      errors.phone = "Số điện thoại không hợp lệ. Vui lòng nhập số Việt Nam (vd: 0912345678 hoặc +84912345678).";
    }
  }

  if (info.address && info.address.trim().length > 300) {
    errors.address = "Địa chỉ không được vượt quá 300 ký tự.";
  }

  if (info.accentColor?.trim() && !HEX_COLOR_RE.test(info.accentColor.trim())) {
    errors.accentColor = "Màu chủ đạo không hợp lệ. Vui lòng chọn mã màu dạng #RRGGBB.";
  }

  for (const [key, label] of [["websiteUrl", "Website"], ["githubUrl", "GitHub"], ["linkedInUrl", "LinkedIn"]]) {
    const val = info[key];
    if (val?.trim() && !/^https?:\/\//i.test(val.trim())) {
      errors[key] = `Đường dẫn ${label} phải bắt đầu bằng http:// hoặc https://.`;
    }
  }

  return errors;
}

// Best-effort extraction of the backend's { message: "..." } out of the Error thrown by
// getJson() (whose .message looks like `HTTP 400 - {"message":"..."}`) so save failures can
// surface the real Vietnamese reason instead of a generic fallback.
function extractApiErrorMessage(err) {
  const raw = err?.message;
  if (!raw) return null;
  const sepIndex = raw.indexOf(" - ");
  if (sepIndex === -1) return null;
  try {
    const body = JSON.parse(raw.slice(sepIndex + 3));
    return body?.message || body?.Message || null;
  } catch {
    return null;
  }
}

// ── Vietnamese provinces/cities data ─────────────────────
const PROVINCES_VN = [
  // Thành phố trực thuộc Trung ương
  { name: "Hà Nội",          city: true },
  { name: "TP. Hồ Chí Minh", city: true },
  { name: "Đà Nẵng",         city: true },
  { name: "Hải Phòng",       city: true },
  { name: "Cần Thơ",         city: true },
  // Tỉnh thành (A → Z)
  { name: "An Giang" },
  { name: "Bà Rịa - Vũng Tàu" },
  { name: "Bắc Giang" },
  { name: "Bắc Kạn" },
  { name: "Bạc Liêu" },
  { name: "Bắc Ninh" },
  { name: "Bến Tre" },
  { name: "Bình Định" },
  { name: "Bình Dương" },
  { name: "Bình Phước" },
  { name: "Bình Thuận" },
  { name: "Cà Mau" },
  { name: "Cao Bằng" },
  { name: "Đắk Lắk" },
  { name: "Đắk Nông" },
  { name: "Điện Biên" },
  { name: "Đồng Nai" },
  { name: "Đồng Tháp" },
  { name: "Gia Lai" },
  { name: "Hà Giang" },
  { name: "Hà Nam" },
  { name: "Hà Tĩnh" },
  { name: "Hải Dương" },
  { name: "Hậu Giang" },
  { name: "Hòa Bình" },
  { name: "Hưng Yên" },
  { name: "Khánh Hòa" },
  { name: "Kiên Giang" },
  { name: "Kon Tum" },
  { name: "Lai Châu" },
  { name: "Lâm Đồng" },
  { name: "Lạng Sơn" },
  { name: "Lào Cai" },
  { name: "Long An" },
  { name: "Nam Định" },
  { name: "Nghệ An" },
  { name: "Ninh Bình" },
  { name: "Ninh Thuận" },
  { name: "Phú Thọ" },
  { name: "Phú Yên" },
  { name: "Quảng Bình" },
  { name: "Quảng Nam" },
  { name: "Quảng Ngãi" },
  { name: "Quảng Ninh" },
  { name: "Quảng Trị" },
  { name: "Sóc Trăng" },
  { name: "Sơn La" },
  { name: "Tây Ninh" },
  { name: "Thái Bình" },
  { name: "Thái Nguyên" },
  { name: "Thanh Hóa" },
  { name: "Thừa Thiên Huế" },
  { name: "Tiền Giang" },
  { name: "Trà Vinh" },
  { name: "Tuyên Quang" },
  { name: "Vĩnh Long" },
  { name: "Vĩnh Phúc" },
  { name: "Yên Bái" },
];

const VN_MONTHS = [
  "Tháng 1","Tháng 2","Tháng 3","Tháng 4",
  "Tháng 5","Tháng 6","Tháng 7","Tháng 8",
  "Tháng 9","Tháng 10","Tháng 11","Tháng 12",
];

const _CY = new Date().getFullYear();
const VN_YEARS = Array.from({ length: _CY - 1989 + 4 }, (_, i) => _CY + 3 - i);

const QUICK_LOCATIONS = ["Hà Nội", "TP. HCM", "Đà Nẵng", "Hải Phòng", "Cần Thơ", "Remote", "Nước ngoài"];

// ── reusable subcomponents ────────────────────────────────
function FieldRow({ label, children, hint, error }) {
  return (
    <div className={`cve-field${error ? " cve-field--error" : ""}`}>
      <label className="cve-label">{label}</label>
      {children}
      {error
        ? <span className="cve-field-error">⚠ {error}</span>
        : hint && <span className="cve-hint">{hint}</span>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", invalid = false }) {
  return (
    <input
      className={`cve-input${invalid ? " cve-input--error" : ""}`}
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

// ── MonthYearPicker ───────────────────────────────────────
// value: "" | "MM/YYYY" | "Hiện tại"
// onChange: (string) => void
// allowPresent: show "Hiện tại" checkbox
function MonthYearPicker({ value, onChange, allowPresent = false }) {
  function parseValue(v) {
    if (!v) return { month: "", year: "", present: false };
    if (v === "Hiện tại") return { month: "", year: "", present: true };
    const m = v.match(/^(\d{2})\/(\d{4})$/);
    if (m) return { month: m[1], year: m[2], present: false };
    return { month: "", year: "", present: false };
  }

  const init = parseValue(value);
  const [month, setMonth] = useState(init.month);
  const [year,  setYear]  = useState(init.year);
  const [present, setPresent] = useState(init.present);
  const prevRef = useRef(value);

  useEffect(() => {
    if (prevRef.current === value) return;
    prevRef.current = value;
    const p = parseValue(value);
    setMonth(p.month); setYear(p.year); setPresent(p.present);
  }, [value]);

  function emit(m, y, p) {
    if (p)       { onChange("Hiện tại"); return; }
    if (m && y)  { onChange(`${m}/${y}`); return; }
    if (!m && !y){ onChange(""); }
    // partial — wait for both before emitting
  }

  function handleMonth(m) { setMonth(m); emit(m, year, present); }
  function handleYear(y)  { setYear(y);  emit(month, y, present); }

  function handlePresent(checked) {
    setPresent(checked);
    if (checked) { onChange("Hiện tại"); }
    else { month && year ? onChange(`${month}/${year}`) : onChange(""); }
  }

  function handleClear() {
    setMonth(""); setYear(""); setPresent(false);
    onChange("");
  }

  const displayVal = present ? "Hiện tại" : (month && year ? `${month}/${year}` : "");

  return (
    <div className="cve-mypicker">
      {!present && (
        <div className="cve-mypicker__selects">
          <select className="cve-select cve-mypicker__sel" value={month} onChange={(e) => handleMonth(e.target.value)}>
            <option value="">Tháng</option>
            {VN_MONTHS.map((lbl, i) => (
              <option key={i} value={String(i + 1).padStart(2, "0")}>{lbl}</option>
            ))}
          </select>
          <select className="cve-select cve-mypicker__sel cve-mypicker__sel--year" value={year} onChange={(e) => handleYear(e.target.value)}>
            <option value="">Năm</option>
            {VN_YEARS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </select>
          {displayVal && (
            <button type="button" className="cve-mypicker__clear" onClick={handleClear} title="Xóa ngày">✕</button>
          )}
        </div>
      )}
      {allowPresent && (
        <label className="cve-mypicker__present-lbl">
          <input type="checkbox" checked={present} onChange={(e) => handlePresent(e.target.checked)} />
          <span className="cve-mypicker__check" />
          Hiện tại
        </label>
      )}
      {displayVal && (
        <div className="cve-mypicker__preview">📅 {displayVal}</div>
      )}
    </div>
  );
}

// ── AddressPicker ─────────────────────────────────────────
// value: free string (e.g. "Hà Nội, Cầu Giấy" or "Ho Chi Minh City, Vietnam")
// Falls back to free-text mode for non-VN or manual input
function AddressPicker({ value, onChange }) {
  const cities    = PROVINCES_VN.filter((p) => p.city);
  const provinces = PROVINCES_VN.filter((p) => !p.city);

  function parseAddr(v) {
    if (!v) return { province: "", detail: "", free: false };
    for (const p of PROVINCES_VN) {
      if (v === p.name) return { province: p.name, detail: "", free: false };
      if (v.startsWith(p.name + ", ")) return { province: p.name, detail: v.slice(p.name.length + 2), free: false };
    }
    return { province: "", detail: v, free: true };
  }

  const init = parseAddr(value);
  const [province, setProvince] = useState(init.province);
  const [detail,   setDetail]   = useState(init.detail);
  const [free,     setFree]     = useState(init.free);
  const prevRef = useRef(value);

  useEffect(() => {
    if (prevRef.current === value) return;
    prevRef.current = value;
    const p = parseAddr(value);
    setProvince(p.province); setDetail(p.detail); setFree(p.free);
  }, [value]);

  function buildVal(prov, det) {
    if (!prov) return det || "";
    return det ? `${prov}, ${det}` : prov;
  }

  function handleProvince(prov) { setProvince(prov); onChange(buildVal(prov, detail)); }
  function handleDetail(det)    { setDetail(det);    onChange(buildVal(province, det)); }

  function toggleFree() {
    if (!free) {
      const combined = buildVal(province, detail);
      setDetail(combined); setProvince(""); setFree(true); onChange(combined);
    } else {
      const parsed = parseAddr(detail);
      setProvince(parsed.province); setDetail(parsed.detail); setFree(false);
      onChange(buildVal(parsed.province, parsed.detail));
    }
  }

  const displayVal = free ? detail : buildVal(province, detail);

  return (
    <div className="cve-addrpicker">
      {free ? (
        <input
          className="cve-input"
          type="text"
          value={detail}
          onChange={(e) => { setDetail(e.target.value); onChange(e.target.value); }}
          placeholder="Ho Chi Minh City, Vietnam — hoặc địa chỉ quốc tế..."
        />
      ) : (
        <>
          <select className="cve-select" value={province} onChange={(e) => handleProvince(e.target.value)}>
            <option value="">— Chọn tỉnh / thành phố —</option>
            <optgroup label="Thành phố trực thuộc TW">
              {cities.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
            </optgroup>
            <optgroup label="Tỉnh thành còn lại">
              {provinces.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
            </optgroup>
          </select>
          {province && (
            <input
              className="cve-input"
              type="text"
              value={detail}
              onChange={(e) => handleDetail(e.target.value)}
              placeholder="Quận/Huyện, địa chỉ chi tiết (tùy chọn)"
            />
          )}
        </>
      )}
      <div className="cve-addrpicker__foot">
        <button type="button" className={`cve-addrpicker__toggle ${free ? "is-free" : ""}`} onClick={toggleFree}>
          {free ? "🗺 Chọn tỉnh/thành" : "✏️ Nhập tự do"}
        </button>
        {displayVal && <span className="cve-addrpicker__preview">📍 {displayVal}</span>}
      </div>
    </div>
  );
}

// ── LocationPicker ────────────────────────────────────────
// Quick chip buttons for common work locations + custom text fallback
function LocationPicker({ value, onChange }) {
  const isChip = QUICK_LOCATIONS.includes(value);
  const [custom, setCustom] = useState(isChip ? "" : (value || ""));
  const prevRef = useRef(value);

  useEffect(() => {
    if (prevRef.current === value) return;
    prevRef.current = value;
    if (!QUICK_LOCATIONS.includes(value)) setCustom(value || "");
    else setCustom("");
  }, [value]);

  function handleChip(loc) {
    if (value === loc) { onChange(""); }
    else { setCustom(""); onChange(loc); }
  }

  function handleCustom(v) {
    setCustom(v); onChange(v);
  }

  return (
    <div className="cve-locpicker">
      <div className="cve-locpicker__chips">
        {QUICK_LOCATIONS.map((loc) => (
          <button
            type="button"
            key={loc}
            className={`cve-locpicker__chip ${value === loc ? "active" : ""}`}
            onClick={() => handleChip(loc)}
          >
            {loc}
          </button>
        ))}
      </div>
      {!isChip && (
        <input
          className="cve-input cve-locpicker__custom"
          type="text"
          value={custom}
          onChange={(e) => handleCustom(e.target.value)}
          placeholder="Hoặc nhập tùy chỉnh..."
        />
      )}
    </div>
  );
}

// ── Work experience card ──────────────────────────────────
function WorkCard({ item, onChange, onRemove }) {
  function field(key) { return (v) => onChange({ ...item, [key]: v }); }
  function handleEndDate(v) {
    onChange({ ...item, endDate: v === "Hiện tại" ? "" : v, isCurrent: v === "Hiện tại" });
  }
  const endVal = item.isCurrent ? "Hiện tại" : (item.endDate || "");
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
          <MonthYearPicker value={item.startDate || ""} onChange={field("startDate")} />
        </FieldRow>
        <FieldRow label="Thời gian kết thúc">
          <MonthYearPicker value={endVal} onChange={handleEndDate} allowPresent />
        </FieldRow>
      </div>
      <FieldRow label="Địa điểm làm việc">
        <LocationPicker value={item.location || ""} onChange={field("location")} />
      </FieldRow>
      <FieldRow label="Mô tả">
        <TextArea value={item.description} onChange={field("description")} placeholder="Mô tả công việc, trách nhiệm..." rows={3} />
      </FieldRow>
      <FieldRow label="Thành tích (mỗi dòng 1 mục)" hint="Mỗi dòng là một bullet point">
        <TextArea
          value={(item.bullets || []).join("\n")}
          onChange={(v) => field("bullets")(v.split("\n").filter((l) => l.trim()))}
          placeholder={"- Tăng hiệu năng hệ thống 40%\n- Dẫn đầu nhóm 5 developer"}
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
          <MonthYearPicker value={item.startDate || ""} onChange={field("startDate")} />
        </FieldRow>
        <FieldRow label="Thời gian kết thúc">
          <MonthYearPicker value={item.endDate || ""} onChange={field("endDate")} allowPresent />
        </FieldRow>
      </div>
      <FieldRow label="Thành tích nổi bật (mỗi dòng 1 mục)">
        <TextArea
          value={(item.achievements || []).join("\n")}
          onChange={(v) => field("achievements")(v.split("\n").filter((l) => l.trim()))}
          placeholder={"- Học bổng toàn phần\n- Top 5% sinh viên xuất sắc"}
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
          <MonthYearPicker value={item.date || ""} onChange={field("date")} />
        </FieldRow>
        <FieldRow label="Ngày hết hạn">
          <MonthYearPicker value={item.expiryDate || ""} onChange={field("expiryDate")} allowPresent />
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
          <MonthYearPicker value={item.date || ""} onChange={field("date")} />
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

// ── Section order / visibility (drag to reorder, eye toggle to hide) ──────
function SectionOrderList({ items, onChange }) {
  const dragIndex = useRef(null);

  function handleDrop(i) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === i) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(i, 0, moved);
    onChange(next);
  }

  function toggleVisible(i) {
    onChange(items.map((it, idx) => idx === i ? { ...it, visible: it.visible === false } : it));
  }

  return (
    <div className="cve-section-order">
      {items.map((item, i) => (
        <div
          key={item.key}
          className={`cve-section-order__row${item.visible === false ? " is-hidden" : ""}`}
          draggable
          onDragStart={() => { dragIndex.current = i; }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(i)}
        >
          <span className="cve-section-order__handle" title="Kéo để sắp xếp thứ tự">⠿</span>
          <span className="cve-section-order__label">{SECTION_LABELS[item.key] || item.key}</span>
          <button
            type="button"
            className="cve-section-order__eye"
            onClick={() => toggleVisible(i)}
            title={item.visible === false ? "Đang ẩn trên CV — bấm để hiện lại" : "Đang hiển thị — bấm để ẩn"}
          >
            {item.visible === false ? "🙈 Đang ẩn" : "👁 Đang hiện"}
          </button>
        </div>
      ))}
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [attemptedSave, setAttemptedSave] = useState(false);

  // Personal info
  const [info, setInfo] = useState({
    fullName: "", jobTitle: "", email: "", phone: "",
    address: "", avatarUrl: "", websiteUrl: "", githubUrl: "",
    linkedInUrl: "", summary: "", accentColor: "#2563eb", isPublic: true,
    template: "classic",
  });

  // Sections
  const [works, setWorks] = useState([]);
  const [edus, setEdus] = useState([]);
  const [skillGroups, setSkillGroups] = useState([]);
  const [certs, setCerts] = useState([]);
  const [langs, setLangs] = useState([]);
  const [awards, setAwards] = useState([]);
  const [hobbies, setHobbies] = useState([]);

  // Layout — reorderable / togglable main-content sections + read-only view stat
  const [sectionOrder, setSectionOrder] = useState(() => DEFAULT_SECTION_ORDER.map((key) => ({ key, visible: true })));
  const [viewCount, setViewCount] = useState(0);

  // Re-validate live once the user has tried to save at least once, so fixing a field
  // clears its error immediately instead of waiting for the next Save click.
  useEffect(() => {
    if (!attemptedSave) return;
    setFieldErrors(validateCvInfo(info));
  }, [info, attemptedSave]);

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
        template: data.template || "classic",
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
      const savedOrder = parseSafe(data.sectionOrderJson, []);
      setSectionOrder(savedOrder.length > 0 ? savedOrder : DEFAULT_SECTION_ORDER.map((key) => ({ key, visible: true })));
      setViewCount(data.viewCount || 0);
    }).catch(() => {});
  }, [apiClient]);

  async function handleSave() {
    setAttemptedSave(true);
    const validationErrors = validateCvInfo(info);
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setError("Vui lòng kiểm tra lại thông tin — một số trường chưa hợp lệ (xem chi tiết bên dưới mỗi ô).");
      return;
    }

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
        sectionOrderJson: JSON.stringify(sectionOrder),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(extractApiErrorMessage(e) || "Lưu thất bại. Vui lòng thử lại.");
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
            <p className="cve-header__sub">
              Thiết kế CV của bạn — sẽ hiển thị tại <strong>hiennt.website/cv</strong>
              <span className="cve-header__viewcount" title="Số lượt xem CV công khai">· 👁 {viewCount.toLocaleString("vi-VN")} lượt xem</span>
            </p>
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
            { id: "summary",  label: "📝 Giới thiệu" },
            { id: "work",     label: "💼 Kinh nghiệm" },
            { id: "education",label: "🎓 Học vấn" },
            { id: "skills",   label: "⚡ Kỹ năng" },
            { id: "certs",    label: "🏅 Chứng chỉ" },
            { id: "languages",label: "🌐 Ngôn ngữ" },
            { id: "awards",   label: "🏆 Giải thưởng" },
            { id: "hobbies",  label: "🎯 Sở thích" },
            { id: "layout",   label: "🧩 Bố cục CV" },
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
              <FieldRow label="Họ và tên *" error={attemptedSave ? fieldErrors.fullName : undefined}>
                <TextInput
                  value={info.fullName}
                  onChange={(v) => setInfo((i) => ({ ...i, fullName: v }))}
                  placeholder="Nguyễn Trung Hiên"
                  invalid={attemptedSave && !!fieldErrors.fullName}
                />
              </FieldRow>
              <FieldRow label="Chức danh / Vị trí" error={attemptedSave ? fieldErrors.jobTitle : undefined}>
                <TextInput
                  value={info.jobTitle}
                  onChange={(v) => setInfo((i) => ({ ...i, jobTitle: v }))}
                  placeholder="Fullstack Developer"
                  invalid={attemptedSave && !!fieldErrors.jobTitle}
                />
              </FieldRow>
              <FieldRow label="Email" error={attemptedSave ? fieldErrors.email : undefined}>
                <TextInput
                  value={info.email}
                  onChange={(v) => setInfo((i) => ({ ...i, email: v }))}
                  placeholder="hiennt@example.com"
                  type="email"
                  invalid={attemptedSave && !!fieldErrors.email}
                />
              </FieldRow>
              <FieldRow label="Số điện thoại" error={attemptedSave ? fieldErrors.phone : undefined}>
                <TextInput
                  value={info.phone}
                  onChange={(v) => setInfo((i) => ({ ...i, phone: v }))}
                  placeholder="0912 345 678 hoặc +84912345678"
                  invalid={attemptedSave && !!fieldErrors.phone}
                />
              </FieldRow>
              <FieldRow label="Ảnh đại diện (URL)">
                <TextInput value={info.avatarUrl} onChange={(v) => setInfo((i) => ({ ...i, avatarUrl: v }))} placeholder="https://..." type="url" />
              </FieldRow>
              <FieldRow label="Website" error={attemptedSave ? fieldErrors.websiteUrl : undefined}>
                <TextInput
                  value={info.websiteUrl}
                  onChange={(v) => setInfo((i) => ({ ...i, websiteUrl: v }))}
                  placeholder="https://hiennt.website"
                  type="url"
                  invalid={attemptedSave && !!fieldErrors.websiteUrl}
                />
              </FieldRow>
              <FieldRow label="GitHub" error={attemptedSave ? fieldErrors.githubUrl : undefined}>
                <TextInput
                  value={info.githubUrl}
                  onChange={(v) => setInfo((i) => ({ ...i, githubUrl: v }))}
                  placeholder="https://github.com/..."
                  type="url"
                  invalid={attemptedSave && !!fieldErrors.githubUrl}
                />
              </FieldRow>
              <FieldRow label="LinkedIn" error={attemptedSave ? fieldErrors.linkedInUrl : undefined}>
                <TextInput
                  value={info.linkedInUrl}
                  onChange={(v) => setInfo((i) => ({ ...i, linkedInUrl: v }))}
                  placeholder="https://linkedin.com/in/..."
                  type="url"
                  invalid={attemptedSave && !!fieldErrors.linkedInUrl}
                />
              </FieldRow>
            </div>
            {/* Address picker spans full width */}
            <FieldRow label="Địa chỉ" error={attemptedSave ? fieldErrors.address : undefined}>
              <AddressPicker value={info.address} onChange={(v) => setInfo((i) => ({ ...i, address: v }))} />
            </FieldRow>
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

          {/* Layout — reorder / show-hide main-content sections */}
          <Panel title="🧩 Bố cục CV" id="layout">
            <FieldRow
              label="Thứ tự & hiển thị các mục"
              hint="Kéo ⠿ để sắp xếp lại, bấm biểu tượng mắt để ẩn/hiện một mục trên CV công khai (áp dụng đầy đủ cho mẫu Classic; các mẫu khác chỉ áp dụng ẩn/hiện)"
            >
              <SectionOrderList items={sectionOrder} onChange={setSectionOrder} />
            </FieldRow>
          </Panel>

          {/* Settings */}
          <Panel title="⚙️ Cài đặt" id="settings">
            <div className="cve-grid-2">
              <FieldRow label="Mẫu CV mặc định" hint="Mẫu hiển thị đầu tiên với khách xem CV của bạn">
                <div className="cve-tpl-picker">
                  {TEMPLATES.map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      className={`cve-tpl-picker__btn${info.template === t.id ? " is-active" : ""}`}
                      onClick={() => setInfo((i) => ({ ...i, template: t.id }))}
                      title={t.desc}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </FieldRow>
              <FieldRow label="Màu chủ đạo" hint="Màu accent hiển thị trên CV" error={attemptedSave ? fieldErrors.accentColor : undefined}>
                <div className="cve-color-picker">
                  <input
                    type="color"
                    value={HEX_COLOR_RE.test(info.accentColor || "") ? info.accentColor : "#2563eb"}
                    onChange={(e) => setInfo((i) => ({ ...i, accentColor: e.target.value }))}
                    className="cve-color-swatch"
                  />
                  <TextInput
                    value={info.accentColor}
                    onChange={(v) => setInfo((i) => ({ ...i, accentColor: v }))}
                    placeholder="#2563eb"
                    invalid={attemptedSave && !!fieldErrors.accentColor}
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
