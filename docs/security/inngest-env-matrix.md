# Inngest Security: Environment Matrix

This document outlines how VidyaSetu handles Inngest security across different environments. We prioritize a "Secure by Default" posture to prevent unauthenticated events from reaching our background workers in production.

## Environment Variables

| Variable | Allowed Values | Description |
|----------|----------------|-------------|
| `INNGEST_DEV` | `true`, `false`, `undefined` | The **Primary Source of Truth** for Inngest mode. |
| `INNGEST_EVENT_KEY` | string | Used to send events to Inngest. |
| `INNGEST_SIGNING_KEY` | string | Used to verify signatures of incoming requests from Inngest. |
| `NODE_ENV` | `development`, `production`, `test` | System environment. Used as a safety check against `INNGEST_DEV`. |

---

## Matrix: Expected Behavior

| Environment | `NODE_ENV` | `INNGEST_DEV` | Signatures | Requirement | Result |
|-------------|------------|---------------|------------|-------------|--------|
| **Local Dev** | `development` | `true` | **BYPASSED** | None | Works with `inngest-cli dev` |
| **Local Prod** | `production` | `false` | **ENFORCED** | Keys Required | Strict security testing |
| **Staging** | `production` | `false` | **ENFORCED** | Keys Required | Production parity |
| **Production** | `production` | `false` | **ENFORCED** | Keys Required | Maximum security |

---

## Blocked Configurations (Fail-Fast)

The application will throw an error and **refuse to start** in the following scenarios:

### 1. Insecure Production Attempt
*   **Condition**: `NODE_ENV=production` AND `INNGEST_DEV=true`
*   **Reason**: Explicitly blocks attempts to bypass signature validation in a production environment.
*   **Error**: `[Inngest] SECURITY ALERT: Cannot enable INNGEST_DEV in production environment`

### 2. Missing Production Secrets
*   **Condition**: `INNGEST_DEV` is not `true` AND (`INNGEST_EVENT_KEY` or `INNGEST_SIGNING_KEY` are missing).
*   **Reason**: Prevents the application from starting if it cannot enforce the required security protocols.
*   **Error**: `[Inngest] Missing Production Secrets: ...`

### 3. Invalid Configuration String
*   **Condition**: `INNGEST_DEV` is set to any value other than `"true"` or `"false"`.
*   **Reason**: Prevents configuration typos (e.g., `INNGEST_DEV=yes`) from causing unpredictable behavior.
*   **Error**: `[Inngest] Invalid INNGEST_DEV value: ...`

---

## Local Developer Experience (DX)

When using the provided `./build-and-run.sh` script:
*   `--dev`: Automatically sets `INNGEST_DEV=true`.
*   `--prod`: Automatically sets `INNGEST_DEV=false`.

If running `next dev` manually, you must add `INNGEST_DEV=true` to your `.env.local` to enable local event processing.
