# Domain Information: VIDYASETSU.COM

| Field | Value |
|-------|-------|
| **Domain Name** | VIDYASETSU.COM |
| **Registrar** | Cloudflare, Inc. |
| **Registrar URL** | https://www.cloudflare.com/ |
| **WHOIS Server** | whois.cloudflare.com |
| **Creation Date** | 2026-05-03T11:12:34Z |
| **Expiration Date**| 2027-05-03T11:12:34Z |

## Cloudflare Setup Checklist for GCP
Since you are using Cloudflare, here is how to connect it to your Cloud Run service:

1. **Cloud Run Custom Domain**:
   - In GCP Console, go to **Cloud Run** > **Manage Custom Domains**.
   - Add `vidyasetsu.com`.
   - GCP will provide a set of **DNS records** (A/AAAA/CNAME).

2. **Cloudflare DNS Configuration**:
   - Log in to your Cloudflare dashboard.
   - Go to **DNS** settings for `vidyasetsu.com`.
   - Add the records provided by GCP.
   - **Important**: For initial validation, you may need to set the proxy status to **"DNS Only"** (grey cloud). Once validated, you can switch it to **"Proxied"** (orange cloud).

3. **SSL/TLS**:
   - Cloudflare provides its own SSL. Set your Cloudflare SSL/TLS mode to **"Full"** or **"Full (Strict)"**.
