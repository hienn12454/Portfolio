# Portfolio Cá Nhân - hiennt.website

[![Website](https://img.shields.io/badge/Website-hiennt.website-000000?style=for-the-badge&logo=googlechrome&logoColor=FFFFFF&labelColor=000000)](https://hiennt.website)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-000000?style=for-the-badge&logo=react&logoColor=FFFFFF&labelColor=000000)](./Portfolio-FE)
[![Backend](https://img.shields.io/badge/Backend-.NET%20Web%20API-000000?style=for-the-badge&logo=dotnet&logoColor=FFFFFF&labelColor=000000)](./Portfolio-BE)
[![Azure](https://img.shields.io/badge/Azure-Hosting-000000?style=for-the-badge&logo=microsoftazure&logoColor=FFFFFF&labelColor=000000)](https://azure.microsoft.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-000000?style=for-the-badge&logo=supabase&logoColor=FFFFFF&labelColor=000000)](https://supabase.com/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-DNS%20%26%20CDN-000000?style=for-the-badge&logo=cloudflare&logoColor=FFFFFF&labelColor=000000)](https://www.cloudflare.com/)
[![PAVietnam](https://img.shields.io/badge/PAVietnam-Domain-000000?style=for-the-badge&logoColor=FFFFFF&labelColor=000000)](https://www.pavietnam.vn/)
[![Clerk](https://img.shields.io/badge/Clerk-Authentication-000000?style=for-the-badge&logo=clerk&logoColor=FFFFFF&labelColor=000000)](https://clerk.com/)

Website portfolio cá nhân được xây dựng theo định hướng hiện đại, gọn gàng và chuyên nghiệp. Dự án tập trung vào trải nghiệm người dùng, khả năng quản trị nội dung và kiến trúc dễ mở rộng cho quá trình phát triển lâu dài.

## Liên kết nhanh

- Website chính thức: [https://hiennt.website](https://hiennt.website)
- Backend Swagger: [https://portfoliobe.azurewebsites.net/](https://portfoliobe.azurewebsites.net/)

## Tính năng nổi bật

- Giao diện portfolio công khai với các mục: giới thiệu, kỹ năng, dự án, liên hệ.
- Hỗ trợ đa ngôn ngữ `Tiếng Anh / Tiếng Việt`.
- Tích hợp xác thực người dùng bằng Clerk.
- Khu vực quản trị nội dung dành cho tài khoản có quyền phù hợp.
- Đồng bộ dữ liệu qua API giữa frontend và backend.
- Cấu hình theo môi trường (`local`, `production`) thông qua biến môi trường.

## Kiến trúc công nghệ

### Frontend (`Portfolio-FE`)

- React + Vite
- React Router
- Clerk (`@clerk/react`)
- CSS tùy biến theo theme sáng/tối và hiệu ứng tương tác

### Backend (`Portfolio-BE`)

- .NET Web API
- Hệ API REST cho:
  - Auth
  - Nội dung trang
  - Kỹ năng
  - Bài viết

### Hạ tầng triển khai

- Azure: triển khai dịch vụ web
- Supabase: dịch vụ dữ liệu
- Cloudflare: DNS/CDN/proxy
- PAVietnam: quản lý tên miền

## Cấu trúc repository

- `Portfolio-FE`: mã nguồn frontend.
- `Portfolio-BE`: mã nguồn backend.

## Hướng dẫn chạy local

### 1) Clone dự án

```bash
git clone <repo-url>
cd Portfolio
```

### 2) Chạy frontend

```bash
cd Portfolio-FE
npm install
npm run dev
```

Tạo `.env.local` từ `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
VITE_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
VITE_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
```

### 3) Chạy backend

```bash
cd Portfolio-BE
# chạy theo cấu trúc .NET hiện tại của bạn
```

## Biến môi trường production cho frontend

```env
VITE_API_BASE_URL=https://portfoliobe.azurewebsites.net
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxx
VITE_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
VITE_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
```

Lưu ý: Vite nhúng biến môi trường ở thời điểm build. Sau khi thay đổi biến trên Azure, cần redeploy để giá trị mới được áp dụng.

## Định hướng phát triển

- Hoàn thiện điều hướng theo vai trò người dùng (`user`/`admin`) sau khi đăng nhập.
- Bổ sung theo dõi lỗi và giám sát hiệu năng production.
- Tối ưu SEO và social preview cho trang chia sẻ.

## Tác giả

- Hien NT
- Website: [https://hiennt.website](https://hiennt.website)