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

## Required - Frontend (build-time for Vite)

- `VITE_API_BASE_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`
- `VITE_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`

Note: For Vite, `VITE_*` vars must exist during frontend build.
