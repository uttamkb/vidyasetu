# Manual Steps for Production Go-Live: VIDYASETSU.COM

This document tracks the manual configurations required in the Google Cloud Console and Cloudflare that cannot be automated via scripts.

## 1. Google Cloud Billing
- [ ] Go to [GCP Billing Console](https://console.cloud.google.com/billing).
- [ ] Ensure the project `vidyasetu-495001` is linked to an active billing account.

## 2. Google OAuth Configuration (Authentication)
- [ ] **Consent Screen**: Go to [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent).
  - Set User Type to **External**.
  - Add `vidyasetsu.com` to **Authorized domains**.
- [ ] **Redirect URIs**: Go to [Credentials](https://console.cloud.google.com/apis/credentials).
  - Edit your OAuth 2.0 Client ID.
  - Add `https://vidyasetsu.com/api/auth/callback/google` to **Authorized redirect URIs**.
  - Add your Cloud Run generated URL (e.g., `https://vidyasetu-service-XXXXX.a.run.app/api/auth/callback/google`) as a secondary redirect URI for testing.

## 3. Custom Domain Mapping
- [ ] **GCP Side**: Go to **Cloud Run** > **Manage Custom Domains**.
  - Map `vidyasetsu.com` to the `vidyasetu-service`.
  - Copy the DNS records (A/AAAA/CNAME) provided by GCP.
- [ ] **Cloudflare Side**: Log in to [Cloudflare](https://dash.cloudflare.com/).
  - Go to the **DNS** tab for `vidyasetsu.com`.
  - Add the records copied from GCP.
  - Set Proxy Status to **"DNS Only"** (Grey Cloud) for the initial validation phase.
  - Once validated, switch back to **"Proxied"** (Orange Cloud).

## 4. Cloudflare SSL/TLS Settings
- [ ] Go to **SSL/TLS** > **Overview**.
- [ ] Set encryption mode to **Full** or **Full (strict)**.

## 5. Verify Secrets in Secret Manager
- [ ] Go to [Secret Manager](https://console.cloud.google.com/security/secret-manager).
- [ ] Ensure all versions of the following secrets have values (not placeholders):
  - `DATABASE_URL`
  - `AUTH_SECRET`
  - `GEMINI_API_KEY`
  - `AUTH_GOOGLE_ID`
  - `AUTH_GOOGLE_SECRET`

---
**Note**: Complete these steps *after* running `./setup-secrets.sh` and `./deploy-gcp.sh`.
