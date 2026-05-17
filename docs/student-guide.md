# VidyaSetu — Student Guide

> **What's New:** Subscription system, usage limits, and admin controls  
> **Last Updated:** May 14, 2026  
> **Applies to:** All students (Free and Pro plans)

---

## 1. Your Subscription Plan

Every student account now has a **subscription plan**. You can see yours on the **Profile** page (`/profile`).

### Plans Available

| Feature | Free Plan | Pro Plan |
|---------|-----------|----------|
| **AI Assignments** | 3 per day | 50 per day |
| **AI Evaluations** | 10 per day | 100 per day |
| **Content Access** | Unlimited | Unlimited |
| **Leaderboard** | Included | Included |
| **Cost** | Free | Paid (contact admin) |

### Subscription Status

Your profile shows a badge indicating your status:

| Badge | Meaning |
|-------|---------|
| **FREE** | Free plan, active |
| **PRO** | Pro plan, active |
| **EXPIRED** | Pro plan expired — renew to restore access |

---

## 2. Profile Page — What's New

Visit `/profile` to see:

### Subscription Card (Top Right)
Shows your current plan, status, and usage limits.

```
┌─────────────────────────────┐
│ 👤 Free Plan                │
│    3 assignments/day limit  │
│                   [FREE]    │
└─────────────────────────────┘
```

### Stats Section
Your activity stats are unchanged:
- Assignments completed
- Average score
- XP earned
- Current streak

---

## 3. Assignment Generation — How Limits Work

### Current Behavior (Shadow Mode)

**You will NOT be blocked** if you exceed limits today. The system is in "shadow mode" — it logs usage but does not enforce limits.

You may see warnings in browser console:
```
[SHADOW] Would block: DAILY_LIMIT_REACHED
```
This is for monitoring only — your request still succeeds.

### When Enforcement Goes Live

Admins may enable enforcement. When active:

| Scenario | What You See |
|----------|-------------|
| Under limit | Assignment generates normally |
| Daily limit reached | `"Daily limit reached (3/3). Upgrade to Pro."` |
| Monthly limit reached | `"Monthly limit reached. Upgrade to Pro."` |
| Expired Pro plan | `"Subscription expired — Renew to continue."` |

### How to Check Your Usage

Your usage is tracked automatically. There is no student-facing usage counter yet — check your profile for plan details.

---

## 4. Submission & Evaluation

### Evaluation Limits

Same pattern as assignments:
- **Free:** 10 evaluations/day
- **Pro:** 100 evaluations/day

Currently in shadow mode (not enforced).

### What Counts as One Evaluation

Each time you submit an assignment and AI grades it = 1 evaluation.

---

## 5. How to Upgrade to Pro

Currently, upgrading is **admin-managed**:

1. Contact your school administrator or VidyaSetu support
2. They can upgrade your account from the admin panel
3. Your profile will immediately show "PRO" status

**Self-service upgrade** (payment integration) is planned for a future release.

---

## 6. What Has NOT Changed

The following work exactly as before:

| Feature | Status |
|---------|--------|
| Login (Google OAuth) | Unchanged |
| Dashboard | Unchanged |
| Assignment browsing | Unchanged |
| Study materials | Unchanged |
| Leaderboard | Unchanged |
| Progress tracking | Unchanged |
| Onboarding flow | Unchanged |

---

## 7. FAQ

### Q: Will I suddenly lose access to assignments?
**A:** No. Enforcement is in shadow mode. Admins will announce before going live.

### Q: I was Pro but now see "EXPIRED"
**A:** Your Pro subscription expired. Contact admin to renew.

### Q: Can I check how many assignments I've used today?
**A:** Not yet — a usage counter will be added in a future update.

### Q: What happens if I hit a limit?
**A:** Currently: nothing (shadow mode). When live: you'll see a message with upgrade option.

### Q: Do unused daily assignments roll over?
**A:** No. Limits reset every day at midnight UTC.

---

## 8. Quick Reference

| Page | URL | What's There |
|------|-----|--------------|
| Profile | `/profile` | Plan badge, status, stats |
| Dashboard | `/dashboard` | Unchanged |
| Assignments | `/assignments` | Unchanged |
| Study Materials | `/study-materials` | Unchanged |
| Leaderboard | `/leaderboard` | Unchanged |

---

*This guide is updated as features roll out. Last updated: May 14, 2026.*
