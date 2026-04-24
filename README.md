# Portfolio Website - hiennt.website

[![Live Website](https://img.shields.io/badge/Live-hiennt.website-0ea5e9?style=for-the-badge&logo=google-chrome&logoColor=white)](https://hiennt.website)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%7C%20Vite-61dafb?style=for-the-badge&logo=react&logoColor=0b0f19)](./Portfolio-FE)
[![Backend](https://img.shields.io/badge/Backend-.NET-512bd4?style=for-the-badge&logo=dotnet&logoColor=white)](./Portfolio-BE)
[![Azure](https://img.shields.io/badge/Deploy-Azure-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)](https://azure.microsoft.com/)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Cloudflare](https://img.shields.io/badge/CDN%20%26%20DNS-Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://www.cloudflare.com/)
[![PAVietnam](https://img.shields.io/badge/Domain-PAVietnam-1f2937?style=for-the-badge)](https://www.pavietnam.vn/)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)](https://clerk.com/)

Website portfolio cá nhân theo hướng professional, tập trung vào hiệu năng, trải nghiệm người dùng và khả năng quản trị nội dung.

## Demo

- Website: [https://hiennt.website](https://hiennt.website)
- Backend Swagger: [https://portfoliobe.azurewebsites.net/](https://portfoliobe.azurewebsites.net/)

## Tính năng chính

- Trang portfolio public hiển thị thông tin cá nhân, kỹ năng, dự án, bài viết.
- Đa ngôn ngữ `EN/VI` cho nội dung trang chủ.
- Đăng nhập/đăng ký bằng Clerk.
- Phân quyền cơ bản user/admin cho khu vực quản trị.
- Admin dashboard để cập nhật:
  - Thông tin liên hệ
  - Nội dung trang (hero/about)
  - Kỹ năng
  - Bài viết
- Tích hợp API frontend-backend qua biến môi trường.

## Công nghệ sử dụng

### Frontend

- React + Vite
- React Router
- Clerk (`@clerk/react`)

### Backend

- .NET Web API
- RESTful API cho content/articles/skills/auth

### Hạ tầng & dịch vụ

- Azure (hosting/deployment)
- Supabase (PostgreSQL hoặc dịch vụ dữ liệu liên quan)
- Cloudflare (DNS/CDN/proxy)
- PAVietnam (domain provider)

## Cấu trúc repository

- `Portfolio-FE`: mã nguồn frontend.
- `Portfolio-BE`: mã nguồn backend.

## Thiết lập nhanh local

### 1) Clone project

```bash
git clone <repo-url>
cd Portfolio
```

### 2) Chạy Frontend

```bash
cd Portfolio-FE
npm install
npm run dev
```

Tạo file `.env.local` từ `.env.example` và cấu hình:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
VITE_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
VITE_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
```

### 3) Chạy Backend

```bash
cd Portfolio-BE
# dùng lệnh run/build theo cấu trúc backend hiện tại của bạn
```

## Môi trường production (Frontend)

Biến cần có khi build FE:

```env
VITE_API_BASE_URL=https://portfoliobe.azurewebsites.net
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxx
VITE_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
VITE_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
```

Luu y: Vite nhúng biến môi trường ở thời điểm build, nên sau khi đổi biến trên Azure cần redeploy/rebuild.

## Roadmap goi y

- Hoan thien redirect theo role sau khi login (`user`/`admin`).
- Bo sung monitoring/logging cho production.
- Toi uu SEO metadata va social preview.

## Tac gia

- Owner: Hien NT
- Website: [hiennt.website](https://hiennt.website)