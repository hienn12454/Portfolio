# Azure Environment Variables

Set these in Azure App Service -> Configuration -> Application settings.

## Required - Backend

- `ConnectionStrings__DefaultConnection`
  - Example:
  - `Host=aws-1-ap-southeast-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.loevprgndrobnqfatobg;Password=<SUPABASE_PASSWORD>;SSL Mode=Require;Trust Server Certificate=true`
- `Clerk__Authority`
  - Example: `https://harmless-mollusk-15.clerk.accounts.dev`
- `Clerk__Audience`
  - Use the audience from your Clerk JWT template
- `Clerk__WebhookSecret`
  - `whsec_...` from Clerk Webhooks page
- `Cors__AllowedOrigins__0`
  - Example: `https://gray-beach-0ae56a600.7.azurestaticapps.net`
- `Cors__AllowedOrigins__1`
  - Example: `https://hiennt.website`

## Required - Clerk URL config (Backend)

- `Clerk__SignInUrl`
  - Example: `/sign-in`
- `Clerk__SignUpUrl`
  - Example: `/sign-up`
- `Clerk__ResetPasswordUrl`
  - Example: `/reset-password`

## Optional - Bootstrap admins

- `Clerk__AdminClerkUserIds`
  - Comma-separated Clerk user IDs
  - Example: `user_2abc,user_2def`
- `Clerk__AdminUsernames`
  - Comma-separated Clerk usernames that should be treated as Admin
  - Example: `admin,portfolio-admin`

## Optional - AI Career Chatbot (OpenRouter)

- `OpenRouter__ApiKey`
  - API key from OpenRouter dashboard
- `OpenRouter__Model`
  - Example: `openai/gpt-4o-mini` or `meta-llama/llama-3.1-8b-instruct`
- `OpenRouter__HttpReferer`
  - Example: `https://hiennt.website`
- `OpenRouter__AppTitle`
  - Example: `HienNT Portfolio Career Advisor`
- `OpenRouter__Temperature`
  - Example: `0.35`
- `OpenRouter__MaxTokens`
  - Example: `500`

## Required - Frontend (build-time for Vite)

- `VITE_API_BASE_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_CLERK_JWT_TEMPLATE`
  - Example: `portfoliobe-api`
- `VITE_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`
- `VITE_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`

Note: For Vite, `VITE_*` vars must exist during frontend build.

## Required - Clerk Dashboard

- Add `https://gray-beach-0ae56a600.7.azurestaticapps.net` to allowed origins / redirect URLs.
- Add `https://hiennt.website` to allowed origins / redirect URLs.
- Ensure JWT template audience matches `Clerk__Audience` in backend.
- Ensure backend webhook endpoint is configured:
  - `https://portfoliobe.azurewebsites.net/api/webhooks/clerk`
