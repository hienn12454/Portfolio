// Shared, dependency-free constants used by both CVPage (public) and CVEditPage (admin).
// Kept in their own module so the two stay independently code-split (see App.jsx) instead of
// CVEditPage's chunk pulling in all of CVPage's component code just for a few constants.

export const TEMPLATES = [
  { id: "classic", label: "Classic",  icon: "▣", desc: "Sidebar tối màu + timeline rõ ràng — chuẩn mực, dễ đọc với nhà tuyển dụng" },
  { id: "modern",  label: "Modern",   icon: "◈", desc: "Hero nổi bật + lưới thẻ hiện đại — gây ấn tượng thị giác ngay từ đầu" },
  { id: "compact", label: "Compact",  icon: "☰", desc: "Một cột, thân thiện ATS — tối ưu khi in hoặc nộp online" },
];

// Reorderable / togglable main-content sections on the public CV.
export const DEFAULT_SECTION_ORDER = ["work", "education", "awards"];
export const SECTION_LABELS = { work: "Kinh nghiệm làm việc", education: "Học vấn", awards: "Giải thưởng & Thành tích" };
