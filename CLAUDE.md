# CLAUDE.md — Portfolio Project Reference

> Đọc file này trước khi code bất kỳ thứ gì. Cập nhật sau mỗi thay đổi lớn.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 5, React Router v7 |
| Auth | Clerk (@clerk/react v6) |
| Styling | Custom CSS (CSS variables, no Tailwind) |
| Backend | .NET 9, ASP.NET Core Web API |
| ORM | Entity Framework Core 9, PostgreSQL (Supabase) |
| Cache | Redis (optional, for AI chat) |
| AI | OpenRouter (career advisor, CV import vision) |
| Observability | OpenTelemetry |
| Webhooks | Svix (Clerk user sync) |
| Deployment | Azure Static Web Apps (FE) + Azure App Service (BE) |

---

## Directory Structure

```
Portfolio/
├── CLAUDE.md                          ← this file
├── Portfolio-FE/                      ← React + Vite SPA
│   └── src/
│       ├── App.jsx                    ← all routes defined here
│       ├── main.jsx                   ← ClerkProvider + router root
│       ├── styles.css                 ← global CSS variables & base styles
│       ├── admin/
│       │   ├── AdminPage.jsx          ← protected admin wrapper
│       │   └── AdminPanel.jsx         ← full admin dashboard (28KB)
│       ├── auth/
│       │   └── AuthPage.jsx           ← Clerk SignIn/SignUp UI
│       ├── core/http/
│       │   ├── apiClient.js           ← ALL API calls go through this
│       │   └── httpClient.js          ← raw fetch wrapper
│       ├── cv/
│       │   ├── CVPage.jsx             ← public CV display (/cv)
│       │   ├── CVPage.css
│       │   ├── CVEditPage.jsx         ← admin CV editor (/cv/edit)
│       │   └── CVEditPage.css
│       ├── home/
│       │   ├── HomePage.jsx           ← landing page (/)
│       │   ├── CareerAdvisorSection.jsx
│       │   ├── UserRoadmapPlannerSection.jsx
│       │   └── usePublicPortfolioData.js ← loads all public data on mount
│       ├── profile/
│       │   └── UserProfilePage.jsx    ← authenticated user profile editor
│       └── projects/                  ← Clean Architecture pattern example
│           ├── application/getProjectsUseCase.js
│           ├── domain/projectModel.js
│           ├── infrastructure/projectsApiRepository.js
│           └── presentation/
│               ├── components/ProjectCard.jsx
│               ├── hooks/useProjects.js
│               └── pages/ProjectsPage.jsx
└── Portfolio-BE/src/
    ├── Portfolio.Domain/Entities/     ← all entities listed below
    ├── Portfolio.Application/
    │   ├── Abstractions/IApplicationDbContext.cs
    │   └── Features/                  ← business logic services
    ├── Portfolio.Infrastructure/
    │   ├── Persistence/ApplicationDbContext.cs
    │   ├── Migrations/                ← EF Core migrations
    │   └── Configurations/            ← entity configurations
    └── Portfolio.Api/
        ├── Controllers/               ← all API endpoints
        ├── Auth/                      ← AdminRequirement + handler
        └── Program.cs                 ← DI setup, middleware, CORS
```

---

## Routes (Frontend)

| Path | Component | Auth |
|------|-----------|------|
| `/` | `HomePage` | Public |
| `/cv` | `CVPage` | Public |
| `/cv/edit` | `CVEditPage` | Admin (Clerk) |
| `/premium` | `PremiumPage` | Public (manage requires auth) |
| `/blog` | `BlogPage` | Public |
| `/blog/:slug` | `BlogPostPage` | Public |
| `/auth` | `AuthPage` | Public |
| `/admin` | `AdminPage` | Admin (Clerk) |
| `/profile` | `UserProfilePage` | Authenticated |
| `/admin/sso_callback` | Clerk redirect | — |
| `/admin/sso-callback` | Clerk redirect | — |
| `/sso-callback` | Clerk redirect | — |
| `*` | `HomePage` | Public (fallback) |

---

## API Client Usage

All API calls use `createApiClient(getToken)` from `src/core/http/apiClient.js`.

```js
// Public (no auth)
apiClient.getPublic(path)
apiClient.postPublic(path, payload)

// Authenticated
apiClient.getProtected(path)
apiClient.putProtected(path, payload)
apiClient.postProtected(path, payload)
apiClient.deleteProtected(path)
```

`getToken` comes from `useAuth()` Clerk hook. For public pages use:
```js
const apiClient = useMemo(() => createApiClient(async () => null), []);
```

---

## Backend API Endpoints

### Public
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | All projects (ordered by featured) |
| GET | `/api/articles` | Published articles |
| GET | `/api/articles/{slug}` | Article by slug |
| GET | `/api/skills` | Visible skills |
| GET | `/api/content/contact` | Contact info |
| GET | `/api/content/page` | Page CMS content |
| GET | `/api/cv` | Public CV profile |
| POST | `/api/analytics/page-view` | Track page view |
| POST | `/api/career/chat` | Career advisor AI chat |
| GET | `/api/career/chat/diagnostic` | OpenRouter diagnostic |
| GET | `/api/auth/config` | Clerk auth URLs |
| GET | `/api/premium/plans` | Premium plan catalog (monthly/yearly) |
| POST | `/api/contact-messages` | Submit contact form message |
| POST | `/api/projects/{id}/like` | Increment project like count |
| POST | `/api/projects/{id}/view` | Increment project view count |
| POST | `/api/cv/view` | Increment public CV page-view count |

### Authenticated
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/me` | Current user profile |
| PUT | `/api/auth/me/profile` | Update own profile |
| POST | `/api/auth/me/profile/import-cv` | Import CV from image (vision AI) |
| POST | `/api/analytics/login` | Track login event |
| GET | `/api/roadmap-plans/mine/today` | Today's roadmap plan |
| GET | `/api/roadmap-plans/mine` | All user plans |
| GET | `/api/roadmap-plans/mine/{id}` | Specific plan |
| POST | `/api/roadmap-plans/mine/generate` | Generate new plan |
| GET | `/api/premium/me` | Current user's premium status + entitlements |
| POST | `/api/premium/me/subscribe` | Subscribe/renew (mock checkout) |
| POST | `/api/premium/me/cancel` | Cancel (keeps access until expiry) |

### Admin Only (`AdminOnly` policy)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/admin-check` | Verify admin access |
| GET | `/api/cv/admin` | Any CV profile |
| PUT | `/api/cv` | Upsert CV profile |
| GET | `/api/articles/admin` | All articles |
| POST | `/api/articles` | Create article |
| PUT | `/api/articles/{id}` | Update article |
| DELETE | `/api/articles/{id}` | Delete article |
| GET | `/api/skills/admin` | All skills |
| POST | `/api/skills` | Create skill |
| PUT | `/api/skills/{id}` | Update skill |
| DELETE | `/api/skills/{id}` | Delete skill |
| POST | `/api/projects` | Create project |
| PUT | `/api/projects/{id}` | Update project |
| DELETE | `/api/projects/{id}` | Delete project |
| PUT | `/api/content/contact` | Upsert contact |
| PUT | `/api/content/page` | Upsert page content |
| GET | `/api/analytics/summary` | Metrics summary |
| POST | `/api/auth/users/{userId}/profile/import-cv` | Import CV for user |
| POST | `/api/webhooks/clerk` | Clerk webhooks (Svix) |
| GET | `/api/premium/admin/subscriptions` | List all premium subscriptions |
| POST | `/api/premium/admin/users/{userId}/grant` | Admin grant/activate premium |
| GET | `/api/contact-messages/admin` | List contact messages + unread count |
| PUT | `/api/contact-messages/admin/{id}/read` | Mark message read/unread |
| DELETE | `/api/contact-messages/admin/{id}` | Delete contact message |

---

## Domain Entities

All inherit `BaseAuditableEntity` with: `Id (Guid)`, `CreatedAtUtc`, `UpdatedAtUtc`.

### User
```
ClerkUserId, Email, DisplayName, FirstName, LastName, ImageUrl
DateOfBirth, PhoneNumber, Address, Occupation, Headline, Bio
WebsiteUrl, GithubUrl, LinkedInUrl, Company, YearsOfExperience
Education, SkillsSummary, Languages, DesiredRole, CoverImageUrl
Role ("User"|"Admin"), IsActive
```

### Project
```
Title, Slug, Category ("fullstack"), Role, Summary, Stack
CaseStudy, Impact, RepositoryUrl, DemoUrl, IsFeatured
LikeCount, ViewCount   ← engagement counters (anonymous)
```

### ContactMessage ← NEW (migration: AddContactMessagesAndProjectEngagement)
```
Name, Email, Subject (nullable), Message, IsRead
```

### Article
```
Title, Slug, Summary, Content, IsPublished
```

### Skill
```
Name, Description, DisplayOrder, IsVisible
```

### ContactInfo
```
Email (nullable), Phone, Location, GithubUrl, LinkedInUrl
```

### PageContent
```
HeroTitle, HeroDescription, AboutTitle, AboutDescription
HeroTitleColor, HeroDescriptionColor, HeroTypingSpeedMs (default:28)
AboutTitleColor, AboutDescriptionColor, SkillsTitleColor, SkillsDescriptionColor
ProjectsTitleColor, ProjectsDescriptionColor, ContactTitleColor, ContactDescriptionColor
```

### SiteMetric
```
TotalPageViews, TotalLogins, LastPageViewAtUtc, LastLoginAtUtc
```

### UserRoadmapPlan
```
UserId (Guid), Track ("it"), Specialty, SourceRoadmapSlug
PlanMarkdown, DailyTechnical, DailyForDate (DateOnly)
```

### CvProfile ← NEW (migration: AddCvProfile; extended: AddCvProfileEnhancements)
```
FullName, JobTitle, Email, Phone, Address, AvatarUrl
WebsiteUrl, GithubUrl, LinkedInUrl, Summary
WorkExperiencesJson, EducationsJson, SkillGroupsJson
CertificationsJson, LanguagesJson, AwardsJson, HobbiesJson
IsPublic (default:true), AccentColor (default:"#2563eb")
Template (default:"classic"; "classic"|"modern"|"compact" — server-driven default template)
SectionOrderJson (nullable — reorder/hide Work/Education/Awards main-content sections)
ViewCount (server-managed, incremented via POST /api/cv/view)
```

**JSON field shapes:**
```jsonc
// WorkExperiencesJson
[{ "position","company","location","startDate","endDate","isCurrent","description","bullets":[] }]

// EducationsJson
[{ "degree","school","field","startDate","endDate","gpa","description","achievements":[] }]

// SkillGroupsJson
[{ "category","items":[{"name","level":0-100}] }]

// CertificationsJson
[{ "name","issuer","date","expiryDate","credentialUrl" }]

// LanguagesJson
[{ "language","proficiency":"native|fluent|intermediate|basic|beginner" }]

// AwardsJson
[{ "title","issuer","date","description" }]

// HobbiesJson
[{ "icon":"📚","name":"Đọc sách" }]
```

### PremiumSubscription ← NEW (migration: AddPremiumSubscription)
```
UserId (Guid), Plan ("monthly"|"yearly"), Status ("active"|"cancelled"|"expired")
StartedAtUtc, ExpiresAtUtc, AmountPaid (decimal), Currency (default:"VND")
PaymentMethod (default:"mock"), PaymentReference, AutoRenew, CancelledAtUtc
```
Each subscribe/renew inserts a new row (billing history); the "current" subscription
is the valid row with the furthest `ExpiresAtUtc`. Payment is **mock** (instant activation
or admin grant) — swap `PaymentMethod`/reference for a real gateway later. Entitlements
returned by `/api/premium/me`: `aiUnlimited`, `advancedCv`, `profileBadge`.

---

## DbContext Sets

```csharp
Articles, ContactInfos, CvProfiles, PageContents,
Projects, SiteMetrics, Skills, Users, UserRoadmapPlans,
PageViewLogs, UserLoginLogs, PremiumSubscriptions, ContactMessages
```

---

## Migrations (in order)

1. `20260424101409_InitialCreatePostgres`
2. `20260424102211_AddUsers`
3. `20260424102823_AddAdminContentAndRoles`
4. `20260424110613_AddSkills`
5. `20260428042218_AddUserProfileFields`
6. `20260428042805_AddProjectDetailsAndAnalytics`
7. `20260428182728_AddUserRoadmapPlans`
8. `20260428184946_AddPageContentStyleSettings`
9. `20260430083211_AddExtendedUserProfileFieldsAndCvImport`
10. `20260521072920_MakeContactEmailOptional`
11. `20260523180754_AddCvProfile`
12. `20260523193226_AddAnalyticsLogs`
13. `20260531120000_AddPremiumSubscription`
14. `20260531130000_AddContactMessagesAndProjectEngagement`
15. `20260830120000_AddCvProfileEnhancements`

**Add new migration:**
```bash
cd Portfolio-BE
dotnet ef migrations add <MigrationName> --project src/Portfolio.Infrastructure --startup-project src/Portfolio.Api
dotnet ef database update --project src/Portfolio.Infrastructure --startup-project src/Portfolio.Api
```

---

## Environment Variables

### Frontend (`.env`)
```
VITE_API_BASE_URL=http://localhost:5000        # Backend URL
VITE_CLERK_PUBLISHABLE_KEY=pk_...             # Required
VITE_CLERK_JWT_TEMPLATE=portfoliobe-api       # JWT template name
VITE_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/    # After sign in
VITE_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/    # After sign up
VITE_DEBUG_AUTH=false                          # Enable auth debug logs
```

### Backend (`appsettings.json`)
```
ConnectionStrings:DefaultConnection            # PostgreSQL (Supabase)
Clerk:Authority                                # Clerk issuer URL
Clerk:Audience                                 # Clerk audience
Clerk:WebhookSecret                            # Svix secret
Clerk:AdminClerkUserIds                        # Comma-separated admin IDs
Clerk:AdminEmails                              # Comma-separated admin emails
OpenRouter:ApiKey                              # OpenRouter key
OpenRouter:Model                               # LLM model
OpenRouter:CvVisionModel                       # Vision model for CV parsing
Redis:ConnectionString                         # Optional Redis
Cors:AllowedOrigins                            # ["https://hiennt.website", ...]
```

---

## CSS Design System

Global variables from `styles.css`:
```css
--text, --text-muted, --text-soft
--bg, --bg-elevated
--surface, --surface-alt, --surface-border
--accent, --accent-soft
--brand
--font-sans, --font-display
--body-md, --heading-lg, --heading-xl
--button-shadow
```

Fonts: `Manrope` (body), `Space Grotesk` (headings) from Google Fonts.

---

## Auth Flow

1. Clerk handles login on frontend
2. `getToken({ template: "portfoliobe-api" })` → JWT
3. JWT sent as `Authorization: Bearer <token>` header
4. Backend `AdminRequirementHandler` checks `ClerkUserId` against `Clerk:AdminClerkUserIds` config
5. Clerk webhooks (`/api/webhooks/clerk`) sync user create/update/delete to DB

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-23 | Added CV feature: `CvProfile` entity, `CvController`, migration `AddCvProfile`, `CVPage` (public), `CVEditPage` (admin), routes `/cv` and `/cv/edit` |
| 2026-05-24 | Created `CLAUDE.md`; Redesigned CVPage & CVEditPage with modern 3D glassmorphism UI |
| 2026-05-24 | CI: workflow auto-detects & applies pending EF migrations on push to main; warns on unmigrated entity changes. Requires GitHub secret `DB_CONNECTION_STRING` |
| 2026-05-31 | Added features: **Contact inbox** (`ContactMessage` + `/api/contact-messages` + admin endpoints), **public Blog** (`/blog`, `/blog/:slug`), **project likes/views** (`LikeCount`/`ViewCount` + like/view endpoints), **Premium-gated CV PDF export**. Migration `AddContactMessagesAndProjectEngagement`. Tests: full xUnit suite — unit tests (Premium/Contact/User services) + integration tests (`WebApplicationFactory` + EF InMemory + test auth) covering public/auth/admin endpoints |
| 2026-08-30 | **CV validation + test coverage**: `POST /api/cv` (Upsert) now validates `FullName` (required, ≤150 ký tự), `Email`, `Phone` (định dạng số VN), `Address` (≤300 ký tự), `AccentColor` (#RRGGBB), `Template`, and social/website URLs — all with Vietnamese error messages. `CVEditPage` mirrors the same rules client-side with inline field errors. Added `CvControllerTests.cs` (previously zero tests for `/api/cv`). Fixed CI gap: the orphaned `Portfolio.Tests` project (never wired into the `.sln`, never run) now builds and runs in CI; "Run backend tests" runs the whole solution instead of a single test project |
| 2026-08-30 | **TopCV-inspired CV page overhaul**: CV score popover (clickable completeness ring with itemized checklist linking to the editor), share modal (link + QR code + vCard download), visual template-gallery modal replacing the pill switcher, server-driven default template + admin-editable section order/visibility for Work/Education/Awards, public CV view counter. Migration `AddCvProfileEnhancements` (`CvProfile.Template`, `SectionOrderJson`, `ViewCount`); new endpoint `POST /api/cv/view`. Editor (`CVEditPage`) gained a "🧩 Bố cục CV" drag-reorder panel and a view-count stat |
| 2026-05-31 | Added **Premium** feature: `PremiumSubscription` entity + table (migration `AddPremiumSubscription`), `PremiumController` + `PremiumSubscriptionService` (mock checkout / admin grant, monthly+yearly plans), `PremiumPage` (`/premium`) with renew/cancel UI, premium badge in homepage nav/user-menu. UI cleanup: removed dead decorative layers + cursor-glow pointermove effect from HomePage, fixed Career Advisor greeting i18n bug, wired contact form to mailto submit |
