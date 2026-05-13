import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth, useClerk } from "@clerk/react";
import { createApiClient } from "../core/http/apiClient";

const EMPTY_PROFILE = {
  displayName: "",
  dateOfBirth: "",
  phoneNumber: "",
  address: "",
  occupation: "",
  headline: "",
  bio: "",
  websiteUrl: "",
  githubUrl: "",
  linkedInUrl: "",
  company: "",
  yearsOfExperience: "",
  education: "",
  skills: "",
  languages: "",
  desiredRole: "",
  avatarUrl: "",
  coverImageUrl: ""
};

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function UserProfilePage() {
  const { isSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();
  const apiClient = useMemo(() => createApiClient(getToken), [getToken]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [cvAnalyzing, setCvAnalyzing] = useState(false);
  const [adminTargetUserId, setAdminTargetUserId] = useState("");
  const [adminCvAnalyzing, setAdminCvAnalyzing] = useState(false);
  const [lastCvInsights, setLastCvInsights] = useState(null);
  const userMenuRef = useRef(null);
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const cvInputRef = useRef(null);
  const adminCvInputRef = useRef(null);

  function mapUserToProfile(user) {
    return {
      displayName: user?.displayName ?? "",
      dateOfBirth: user?.dateOfBirth ?? "",
      phoneNumber: user?.phoneNumber ?? "",
      address: user?.address ?? "",
      occupation: user?.occupation ?? "",
      headline: user?.headline ?? "",
      bio: user?.bio ?? "",
      websiteUrl: user?.websiteUrl ?? "",
      githubUrl: user?.githubUrl ?? "",
      linkedInUrl: user?.linkedInUrl ?? "",
      company: user?.company ?? "",
      yearsOfExperience: user?.yearsOfExperience ?? "",
      education: user?.education ?? "",
      skills: user?.skillsSummary ?? "",
      languages: user?.languages ?? "",
      desiredRole: user?.desiredRole ?? "",
      avatarUrl: user?.imageUrl ?? "",
      coverImageUrl: user?.coverImageUrl ?? ""
    };
  }

  useEffect(() => {
    async function loadProfile() {
      if (!isSignedIn) {
        setLoading(false);
        return;
      }

      try {
        const me = await apiClient.getProtected("/api/auth/me");
        const user = me?.user ?? null;
        setProfile(mapUserToProfile(user));
        setIsAdminUser(user?.role === "Admin");
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [apiClient, isSignedIn]);

  useEffect(() => {
    if (!isUserMenuOpen) {
      return undefined;
    }

    function handleOutsideClick(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isUserMenuOpen]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const normalizedProfile = {
        ...profile,
        websiteUrl: normalizeUrl(profile.websiteUrl),
        githubUrl: normalizeUrl(profile.githubUrl),
        linkedInUrl: normalizeUrl(profile.linkedInUrl)
      };
      const payload = {
        displayName: normalizedProfile.displayName || null,
        dateOfBirth: normalizedProfile.dateOfBirth || null,
        phoneNumber: normalizedProfile.phoneNumber || null,
        address: normalizedProfile.address || null,
        occupation: normalizedProfile.occupation || null,
        headline: normalizedProfile.headline || null,
        bio: normalizedProfile.bio || null,
        websiteUrl: normalizedProfile.websiteUrl || null,
        githubUrl: normalizedProfile.githubUrl || null,
        linkedInUrl: normalizedProfile.linkedInUrl || null,
        company: normalizedProfile.company || null,
        yearsOfExperience: normalizedProfile.yearsOfExperience === "" ? null : Number(normalizedProfile.yearsOfExperience),
        education: normalizedProfile.education || null,
        skillsSummary: normalizedProfile.skills || null,
        languages: normalizedProfile.languages || null,
        desiredRole: normalizedProfile.desiredRole || null,
        coverImageUrl: normalizedProfile.coverImageUrl || null
      };
      await apiClient.putProtected("/api/auth/me/profile", payload);

      setProfile(normalizedProfile);
      setMessage("Hồ sơ đã được cập nhật thành công.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  function handleFieldChange(field, value) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("Không thể đọc file CV."));
      reader.readAsDataURL(file);
    });
  }

  function handleImageUpload(event, targetField) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const maxSizeInMb = 4;
    if (file.size > maxSizeInMb * 1024 * 1024) {
      setError(`Ảnh quá lớn. Vui lòng chọn file nhỏ hơn ${maxSizeInMb}MB.`);
      event.target.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Chỉ hỗ trợ file ảnh (jpg, png, webp...).");
      event.target.value = "";
      return;
    }

    setError("");
    if (targetField === "avatarUrl") {
      setUploadingAvatar(true);
    } else {
      setUploadingCover(true);
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setProfile((current) => ({ ...current, [targetField]: result }));
      if (targetField === "avatarUrl") {
        setUploadingAvatar(false);
      } else {
        setUploadingCover(false);
      }
      event.target.value = "";
    };
    reader.onerror = () => {
      setError("Không thể đọc file ảnh. Vui lòng thử lại.");
      if (targetField === "avatarUrl") {
        setUploadingAvatar(false);
      } else {
        setUploadingCover(false);
      }
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  }

  async function handleCvImport(event, mode) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("CV chỉ hỗ trợ dạng ảnh (jpg, png, webp...).");
      return;
    }

    const maxSizeMb = 6;
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`Ảnh CV quá lớn. Vui lòng chọn file dưới ${maxSizeMb}MB.`);
      return;
    }

    if (mode === "self") {
      setCvAnalyzing(true);
    } else {
      setAdminCvAnalyzing(true);
    }
    setError("");
    setMessage("");

    try {
      const base64 = await fileToBase64(file);
      const endpoint =
        mode === "self"
          ? "/api/auth/me/profile/import-cv"
          : `/api/auth/users/${encodeURIComponent(adminTargetUserId.trim())}/profile/import-cv`;

      if (mode === "admin" && !adminTargetUserId.trim()) {
        throw new Error("Vui lòng nhập User ID cần cập nhật.");
      }

      const result = await apiClient.postProtected(
        endpoint,
        {
          imageBase64: base64,
          fileName: file.name
        },
        { timeoutMs: 180_000 }
      );

      if (mode === "self") {
        setProfile(mapUserToProfile(result?.user));
      }

      setLastCvInsights(result?.parsed ?? null);
      setMessage("AI đã đọc CV và tự động điền thông tin hồ sơ.");
    } catch (importError) {
      setError(importError.message || "Không thể phân tích CV lúc này.");
    } finally {
      if (mode === "self") {
        setCvAnalyzing(false);
      } else {
        setAdminCvAnalyzing(false);
      }
    }
  }

  return (
    <main className="site">
      <header className="topbar">
        <div className="container topbar__content">
          <Link to="/" className="brand" aria-label="Go to homepage">
            Portfolio
          </Link>
          <div className="topbar__actions">
            <nav className="nav">
              <Link to="/">Home</Link>
              <Link to="/profile">Profile</Link>
            </nav>
            {isSignedIn ? (
              <div className="user-menu" ref={userMenuRef}>
                <button
                  type="button"
                  className="button button--ghost button--small user-menu__trigger"
                  onClick={() => setIsUserMenuOpen((current) => !current)}
                  aria-haspopup="menu"
                  aria-expanded={isUserMenuOpen}
                >
                  Profile
                </button>
                {isUserMenuOpen ? (
                  <div className="user-menu__dropdown" role="menu">
                    {isAdminUser ? (
                      <Link to="/admin" role="menuitem" onClick={() => setIsUserMenuOpen(false)}>
                        Dashboard
                      </Link>
                    ) : null}
                    <Link to="/profile" role="menuitem" onClick={() => setIsUserMenuOpen(false)}>
                      Hồ sơ
                    </Link>
                    <button
                      type="button"
                      className="user-menu__signout"
                      role="menuitem"
                      onClick={async () => {
                        setIsUserMenuOpen(false);
                        await signOut({ redirectUrl: "/" });
                      }}
                    >
                      Đăng xuất
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <section className="section container">
        <div className="profile-header">
          <h2>Hồ sơ cá nhân</h2>
          <p>
            Hoàn thiện hồ sơ để thể hiện chuyên nghiệp hơn trước nhà tuyển dụng: thông tin cá nhân, định hướng nghề nghiệp,
            liên kết portfolio và hình ảnh đại diện.
          </p>
        </div>

        {!isSignedIn ? <p className="error">Vui lòng đăng nhập để chỉnh sửa hồ sơ.</p> : null}
        {loading ? <p>Loading profile...</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {message ? <p>{message}</p> : null}

        {isSignedIn && !loading ? (
          <article className="contact-form profile-form-card">
            <div className="profile-cover">
              {profile.coverImageUrl ? <img src={profile.coverImageUrl} alt="Profile cover" /> : <div className="profile-cover__placeholder" />}
              <button
                type="button"
                className="button button--ghost button--small profile-cover__button"
                onClick={() => coverInputRef.current?.click()}
              >
                {uploadingCover ? "Đang tải ảnh bìa..." : "Tải ảnh bìa"}
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="profile-file-input"
                onChange={(event) => handleImageUpload(event, "coverImageUrl")}
              />
            </div>

            <div className="profile-avatar-row">
              <div className="profile-avatar">
                {profile.avatarUrl ? <img src={profile.avatarUrl} alt="Avatar" /> : <span>Avatar</span>}
              </div>
              <div className="profile-avatar-actions">
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {uploadingAvatar ? "Đang tải ảnh..." : "Tải ảnh đại diện"}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="profile-file-input"
                  onChange={(event) => handleImageUpload(event, "avatarUrl")}
                />
              </div>
            </div>

            <div className="profile-cv-tools">
              <h3>Import hồ sơ từ ảnh CV bằng AI</h3>
              <p>Tải ảnh CV để AI tự trích xuất technical, GPA, skills, project và tự điền vào portfolio profile.</p>
              <button type="button" className="button button--primary" onClick={() => cvInputRef.current?.click()}>
                {cvAnalyzing ? "AI đang phân tích CV..." : "Tải ảnh CV và tự động điền hồ sơ"}
              </button>
              <input
                ref={cvInputRef}
                type="file"
                accept="image/*"
                className="profile-file-input"
                onChange={(event) => handleCvImport(event, "self")}
              />
            </div>

            {isAdminUser ? (
              <div className="profile-cv-tools profile-cv-tools--admin">
                <h3>Admin: import CV cho user</h3>
                <label>
                  User ID (GUID)
                  <input value={adminTargetUserId} onChange={(event) => setAdminTargetUserId(event.target.value)} />
                </label>
                <button type="button" className="button button--ghost" onClick={() => adminCvInputRef.current?.click()}>
                  {adminCvAnalyzing ? "Đang phân tích CV user..." : "Tải ảnh CV cho user này"}
                </button>
                <input
                  ref={adminCvInputRef}
                  type="file"
                  accept="image/*"
                  className="profile-file-input"
                  onChange={(event) => handleCvImport(event, "admin")}
                />
              </div>
            ) : null}

            {lastCvInsights ? (
              <div className="profile-cv-insights">
                <h3>Kết quả AI trích xuất CV</h3>
                <p><strong>Technical:</strong> {lastCvInsights.technicalSummary || "N/A"}</p>
                <p><strong>Skills:</strong> {lastCvInsights.skills || "N/A"}</p>
                <p><strong>Strengths:</strong> {lastCvInsights.strengths || "N/A"}</p>
                <p><strong>Projects:</strong> {lastCvInsights.projects || "N/A"}</p>
                <p><strong>Education:</strong> {lastCvInsights.education || "N/A"}</p>
                <p><strong>GPA:</strong> {lastCvInsights.gpa ?? "N/A"}</p>
              </div>
            ) : null}

            <form onSubmit={handleSubmit}>
              <div className="profile-form-grid">
                <label>
                  Họ tên hiển thị
                  <input value={profile.displayName} onChange={(event) => handleFieldChange("displayName", event.target.value)} maxLength={120} />
                </label>
                <label>
                  Chức danh chính
                  <input value={profile.occupation} onChange={(event) => handleFieldChange("occupation", event.target.value)} maxLength={120} />
                </label>
                <label>
                  Tagline nghề nghiệp
                  <input value={profile.headline} onChange={(event) => handleFieldChange("headline", event.target.value)} maxLength={160} />
                </label>
                <label>
                  Vai trò mong muốn
                  <input value={profile.desiredRole} onChange={(event) => handleFieldChange("desiredRole", event.target.value)} maxLength={120} />
                </label>
                <label>
                  Ngày sinh
                  <input type="date" value={profile.dateOfBirth} onChange={(event) => handleFieldChange("dateOfBirth", event.target.value)} />
                </label>
                <label>
                  Số điện thoại
                  <input value={profile.phoneNumber} onChange={(event) => handleFieldChange("phoneNumber", event.target.value)} maxLength={30} />
                </label>
                <label>
                  Công ty hiện tại
                  <input value={profile.company} onChange={(event) => handleFieldChange("company", event.target.value)} maxLength={120} />
                </label>
                <label>
                  Số năm kinh nghiệm
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={profile.yearsOfExperience}
                    onChange={(event) => handleFieldChange("yearsOfExperience", event.target.value)}
                  />
                </label>
                <label>
                  Địa chỉ
                  <input value={profile.address} onChange={(event) => handleFieldChange("address", event.target.value)} maxLength={300} />
                </label>
                <label>
                  Website cá nhân
                  <input value={profile.websiteUrl} onChange={(event) => handleFieldChange("websiteUrl", event.target.value)} maxLength={220} />
                </label>
                <label>
                  GitHub URL
                  <input value={profile.githubUrl} onChange={(event) => handleFieldChange("githubUrl", event.target.value)} maxLength={220} />
                </label>
                <label>
                  LinkedIn URL
                  <input value={profile.linkedInUrl} onChange={(event) => handleFieldChange("linkedInUrl", event.target.value)} maxLength={220} />
                </label>
              </div>

              <label>
                Giới thiệu bản thân
                <textarea rows={4} value={profile.bio} onChange={(event) => handleFieldChange("bio", event.target.value)} maxLength={800} />
              </label>
              <label>
                Kỹ năng nổi bật (ngăn cách bằng dấu phẩy)
                <textarea rows={3} value={profile.skills} onChange={(event) => handleFieldChange("skills", event.target.value)} maxLength={600} />
              </label>
              <label>
                Học vấn / Chứng chỉ
                <textarea rows={3} value={profile.education} onChange={(event) => handleFieldChange("education", event.target.value)} maxLength={600} />
              </label>
              <label>
                Ngôn ngữ sử dụng
                <input value={profile.languages} onChange={(event) => handleFieldChange("languages", event.target.value)} maxLength={200} />
              </label>
              <button type="submit" className="button button--primary" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu hồ sơ"}
              </button>
            </form>
          </article>
        ) : null}
      </section>
    </main>
  );
}
