# Security Rotation Checklist

Use this checklist when database credentials, API keys, or webhook secrets may have been exposed in source control.

## 1) Immediate containment

- [ ] Stop using the currently exposed credentials immediately.
- [ ] Identify all environments affected: local, staging, production, CI/CD.
- [ ] Confirm whether the exposed values were pushed to remote repositories.

## 2) Rotate critical secrets

- [ ] Rotate database password / connection string (Supabase/Postgres).
- [ ] Rotate OpenRouter API key.
- [ ] Rotate Clerk webhook secret.
- [ ] Rotate any other provider token used in `appsettings` or environment variables.

## 3) Update runtime configuration

- [ ] Update secrets in deployment platform (Azure App Service / GitHub Actions Secrets / other secret stores).
- [ ] Remove hardcoded secret values from tracked config files.
- [ ] Keep only placeholders in `appsettings*.json`.
- [ ] Verify app reads secrets from environment variables at runtime.

## 4) Validate system health

- [ ] Restart backend services after secret update.
- [ ] Smoke test auth (`/api/auth/me`) and AI endpoints (`/api/career/chat`, CV import endpoint).
- [ ] Confirm database connectivity and migrations still work.

## 5) Repo hygiene and prevention

- [ ] Ensure root `.gitignore` excludes build artifacts (`bin/`, `obj/`, `dist/`, `node_modules/`).
- [ ] Add pre-commit secret scanning (example: gitleaks or detect-secrets).
- [ ] Add CI secret scanning job on pull requests.
- [ ] Document secret management policy in project README.

## 6) If secrets were pushed to remote

- [ ] Assume compromise and complete full rotation (no partial reuse).
- [ ] Review access logs (DB/API providers) for abnormal activity.
- [ ] Revoke unknown sessions/tokens if supported by provider.
- [ ] Record incident timeline and remediation actions.
