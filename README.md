# Portfolio Cá Nhân - hiennt.website

[![Website](https://img.shields.io/badge/Website-hiennt.website-1F6FEB?style=plastic&logo=googlechrome&logoColor=FFFFFF&labelColor=0B1220)](https://hiennt.website)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=plastic&logo=react&logoColor=0B1220&labelColor=0B1220)](./Portfolio-FE)
[![Backend](https://img.shields.io/badge/Backend-.NET%20Web%20API-512BD4?style=plastic&logo=dotnet&logoColor=FFFFFF&labelColor=0B1220)](./Portfolio-BE)
[![Hosting](https://img.shields.io/badge/Hosting-Azure-0078D4?style=plastic&logo=microsoftazure&logoColor=FFFFFF&labelColor=0B1220)](https://azure.microsoft.com/)
[![Database](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=plastic&logo=supabase&logoColor=0B1220&labelColor=0B1220)](https://supabase.com/)
[![Authentication](https://img.shields.io/badge/Authentication-Clerk-6C47FF?style=plastic&logo=clerk&logoColor=FFFFFF&labelColor=0B1220)](https://clerk.com/)

Website portfolio cá nhân theo hướng hiện đại, tập trung vào trải nghiệm người dùng, khả năng quản trị nội dung linh hoạt và kiến trúc sạch để mở rộng lâu dài.

## Liên kết nhanh

- Website: [https://hiennt.website](https://hiennt.website)
- Backend API: [https://api.hiennt.website](https://api.hiennt.website/)
- Frontend source: [`Portfolio-FE`](./Portfolio-FE)
- Backend source: [`Portfolio-BE`](./Portfolio-BE)

## Tính năng chính

- **Auth + phân quyền rõ ràng**
  - Đăng nhập/đăng ký qua Clerk (email/password + Google).
  - Role `admin` và `user` xử lý riêng; admin có nút `Dashboard`, user chỉ xem nội dung.
  - Giao diện Clerk bản mặc định, đã tối ưu redirect và callback cho SPA.

- **Trang chủ động (dynamic content)**
  - Các section homepage lấy dữ liệu từ backend.
  - Hero title có hiệu ứng gõ chữ (typewriter), có thể chỉnh nội dung/tốc độ/màu từ dashboard.
  - Màu tiêu đề/mô tả cho các section có thể tùy chỉnh.

- **Admin Dashboard quản trị nội dung**
  - Chỉnh sửa About, Skills, Projects, Articles, Contact.
  - Cập nhật URL `Live Demo` / `Source Code` cho dự án.
  - Theo dõi analytics cơ bản: lượt truy cập, lượt đăng nhập, số user.

- **Career Direction Lab (AI + RAG)**
  - Chatbot tư vấn hướng đi IT dựa trên ngữ cảnh hệ thống + dữ liệu roadmap.
  - Tích hợp OpenRouter model: `qwen/qwen3-coder:free`.
  - Sinh roadmap học tập theo `track` + `specialty` của người dùng.
  - Mỗi user có lịch sử plan riêng, có plan theo ngày và tự động cập nhật theo mốc 00:00 VN.

- **Responsive và UX**
  - Tối ưu 3 nhóm thiết bị: desktop, tablet, mobile.
  - Header/footer bo góc đồng bộ, back-to-top gọn dạng nút tròn, cải thiện spacing/typography/touch targets.

## Kiến trúc kỹ thuật

### Frontend (`Portfolio-FE`)

- React + Vite
- React Router
- Clerk (`@clerk/react`, `@clerk/localizations`)
- CSS thuần, chia lớp theo section + breakpoint

### Backend (`Portfolio-BE`)

- ASP.NET Core Web API
- Entity Framework Core
- PostgreSQL (Supabase)
- Clean Architecture theo lớp:
  - `Domain`: entities
  - `Application`: use cases/services/interfaces
  - `Infrastructure`: DB/integrations (OpenRouter, roadmap client, time provider)
  - `Api`: controllers + composition root

### Hạ tầng triển khai

- Frontend: Azure Static Web Apps
- Backend: Azure Web Apps
- Database: Supabase
- DNS/CDN: Cloudflare

## Cấu trúc repository

```text
Portfolio/
|- Portfolio-FE/   # React app
|- Portfolio-BE/   # .NET Web API
|- .github/workflows/
```

## Hướng dẫn chạy local

### 1) Clone dự án

```bash
git clone <repo-url>
cd Portfolio
```

### 2) Chạy backend

```bash
cd Portfolio-BE
dotnet restore
dotnet build
dotnet run --project src/Portfolio.Api
```

### 3) Chạy frontend

```bash
cd Portfolio-FE
npm install
npm run dev
```

### 4) Biến môi trường frontend (`Portfolio-FE/.env.local`)

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
VITE_CLERK_JWT_TEMPLATE=portfoliobe-api
VITE_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
VITE_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
```

### 5) Biến môi trường backend (Azure App Settings hoặc secrets)

```env
OpenRouter__ApiKey=<YOUR_OPENROUTER_API_KEY>
OpenRouter__Model=qwen/qwen3-coder:free
OpenRouter__HttpReferer=https://hiennt.website
OpenRouter__AppTitle=HienNT Portfolio Career Advisor
OpenRouter__Temperature=0.35
OpenRouter__MaxTokens=500
```

## Lưu ý môi trường production

- Các biến `VITE_*` được Vite nhúng tại thời điểm build.
- Sau khi đổi biến môi trường cho frontend, cần trigger deploy lại để áp dụng giá trị mới.
- Với auth Clerk, cần đảm bảo redirect URL và domain whitelist khớp domain deploy.

## CI/CD

- Frontend tự động deploy qua workflow Azure Static Web Apps khi push `main`.
- Backend có thể deploy tự động lên Azure Web Apps bằng publish profile secret (workflow đã hỗ trợ mở rộng theo profile thực tế của dự án).

## Lộ trình mở rộng

- Bổ sung test tự động cho auth flow và roadmap flow.
- Thêm logging/monitoring production sâu hơn.
- Tối ưu SEO/social metadata cho từng section và bài viết.

## Tác giả

- Hien NT
- Website: [https://hiennt.website](https://hiennt.website)
