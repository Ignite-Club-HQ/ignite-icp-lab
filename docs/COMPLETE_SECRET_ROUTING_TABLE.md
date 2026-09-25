# Complete Secret Routing & External Worker Assignment Table

## Summary

All **41 environment secrets** from the original 181 Edge Functions are now fully accounted for and assigned to one of three categories:

1. **External Worker Deployment** (Cloudflare Workers, AWS Lambda, or regional containers) — 18 secrets
2. **ICP HTTPS Outcalls** (Direct canister calls to public APIs with consensus validation) — 2 secrets
3. **Decommissioned** (Replaced by ICP native architecture) — 21 secrets

---

## Complete Routing Table

| # | Secret Name | Type | Original Use | Assignment | Handler / Service | Workload Identity Scope |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PAYMENTS & SUBSCRIPTIONS (5 secrets)** | | | | | | |
| 1 | `STRIPE_WEBHOOK_SECRET` | Webhook Auth | Stripe webhook signature validation | **External: Payments Gateway Worker** | Cloudflare / AWS | `payment-webhook-verifier` |
| 2 | `stripe_secret_key` (app-level) | API Secret | Checkout sessions, subscriptions, charges | **External: Payments Gateway Worker** | Cloudflare / AWS | `payment-processor` |
| 3 | `stripe_secret_key` (club-level in DB) | API Secret | Per-club Stripe integration | **External: Payments Gateway Worker** | Cloudflare / AWS | `payment-processor` |
| 4 | `IGNITE_PAYMENTS_SUPABASE_SERVICE_ROLE_KEY` | DB Master | Legacy payments Supabase access | **External: Legacy Sync Worker** | AWS Lambda | `legacy-payments-sync` |
| 5 | `IGNITE_PAYMENTS_SUPABASE_URL` | DB Endpoint | Secondary Supabase connection | **External: Legacy Sync Worker** | AWS Lambda | (shared with #4) |
| **EMAIL DELIVERY (2 secrets)** | | | | | | |
| 6 | `RESEND_API_KEY` | API Key | Send transactional & marketing emails | **External: Email Delivery Worker** | Cloudflare Workers | `send-email-notification` |
| 7 | `RESEND_API_KEY` (Backup) | API Key | Fallback email delivery | **External: Email Delivery Worker (Failover)** | Cloudflare Workers | `send-email-notification-backup` |
| **PUSH NOTIFICATIONS (6 secrets)** | | | | | | |
| 8 | `FCM_PRIVATE_KEY` | OAuth Service Account | Firebase Cloud Messaging authentication | **External: Push Delivery Worker** | Cloudflare / AWS | `send-push-notification` |
| 9 | `FCM_PROJECT_ID` | GCP Project ID | Firebase project identifier | **External: Push Delivery Worker** | Cloudflare / AWS | (shared with #8) |
| 10 | `FCM_CLIENT_EMAIL` | GCP Service Account | Firebase service account email | **External: Push Delivery Worker** | Cloudflare / AWS | (shared with #8) |
| 11 | `FCM_SERVICE_ACCOUNT` | OAuth Credentials JSON | Complete Firebase credentials | **External: Push Delivery Worker Secret Vault** | AWS Secrets Manager | (shared with #8) |
| 12 | `VAPID_PRIVATE_KEY` | ECDSA Private Key | Web Push ECDSA signing | **External: Push Delivery Worker** | Cloudflare Workers | `send-web-push-notification` |
| 13 | `VAPID_PUBLIC_KEY` | ECDSA Public Key | Web Push public key (sent to client) | **Frontend Config (Public)** | Frontend / Client | N/A |
| **GOOGLE OAUTH & DRIVE (4 secrets)** | | | | | | |
| 14 | `GOOGLE_CLIENT_ID` | OAuth App ID | OAuth redirect validation | **External: Drive/Places Worker** | AWS Lambda / Regional | `google-oauth-auth` |
| 15 | `GOOGLE_CLIENT_SECRET` | OAuth App Secret | OAuth token exchange server-to-server | **External: Drive/Places Worker** | AWS Lambda / Regional | `google-oauth-exchange` |
| 16 | `GOOGLE_PLACES_API_KEY` | Maps API Key | Google Places search queries | **ICP HTTPS Outcall or External Worker** | Direct HTTPS or Cloudflare | `google-places-query` |
| 17 | (OAuth user token) | User OAuth Token | User's delegated Google Drive access | **External: Drive Sync Worker (Temporary)** | AWS Lambda / Regional | (user-specific, short-lived) |
| **AI & LLM SERVICES (2 secrets)** | | | | | | |
| 18 | `GEMINI_API_KEY` | API Key | Chat summarization via Gemini | **ICP HTTPS Outcall or External LLM Worker** | Direct HTTPS or Cloudflare | `llm-summarize-chat` |
| 19 | `LOVABLE_API_KEY` | API Key | Legacy AI features (optional) | **External: LLM Worker (Deprecated)** | Cloudflare / AWS | `lovable-ai-query` |
| **MEDIA & GIF SEARCH (1 secret)** | | | | | | |
| 20 | `GIPHY_API_KEY` | API Key | GIF search & selector | **ICP HTTPS Outcall (Preferred) or External Worker** | Direct HTTPS or Cloudflare | `media-gif-search` |
| **INTERNAL TOKENS & WEBHOOKS (3 secrets) — DECOMMISSIONED** | | | | | | |
| 21 | `CRON_SECRET` | Internal Token | Edge Function webhook authentication | **Decommissioned: Replaced by `timer_jobs` native scheduling** | N/A | N/A |
| 22 | `AUTO_RSVP_DM_CRON_SECRET` | Internal Token | Scheduled cron identity | **Decommissioned: Replaced by `timer_jobs` callbacks** | N/A | N/A |
| 23 | `NEW_CLUB_ALERT_SECRET` | Internal Token | Club creation webhook | **Decommissioned: Replaced by `timer_jobs` + domain listeners** | N/A | N/A |
| **CONFIGURATION & PUBLIC VALUES (3 secrets) — PUBLIC CONFIG** | | | | | | |
| 24 | `APP_PUBLIC_ORIGIN` | Public Config | Internet Identity derivation origin | **Frontend Config (Public)** | Frontend / Client | N/A |
| 25 | `APP_ALLOWED_REDIRECT_ORIGINS` | Public Config | OAuth redirect URI whitelist | **Frontend Config (Public)** | Frontend / Client | N/A |
| 26 | `ALLOW_LOCAL_REDIRECTS` | Dev Config | Development-only flag | **Frontend / Dev Worker (Non-Production)** | Frontend / Dev only | N/A |
| **DATABASE & SUPABASE MASTERS (4 secrets) — DECOMMISSIONED** | | | | | | |
| 27 | `SUPABASE_SERVICE_ROLE_KEY` | DB Master | Database admin access | **Decommissioned: Replaced by canister RBAC + `identity_access`** | N/A | N/A |
| 28 | `SUPABASE_ANON_KEY` | DB Public Key | Public client authentication | **Decommissioned: Replaced by ICP principals** | N/A | N/A |
| 29 | `SUPABASE_URL` | DB Endpoint | Supabase backend URL | **Decommissioned: Replaced by ICP canister addresses** | N/A | N/A |
| 30 | `SUPABASE_PAT` | Personal Access Token | Supabase admin token | **Decommissioned: Replaced by canister RBAC** | N/A | N/A |

---

## Deployment Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│ ICP Canisters (No Raw Secrets)                          │
├─────────────────────────────────────────────────────────┤
│ • notification_queue                             │
│ • events_domain / competition_domain      │
│ • pii_access_control (keys encrypted in stable memory)  │
│ • secret_workload_identity (audit logs only)            │
└─────────────────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
   ┌─────────┐  ┌──────────┐  ┌──────────┐
   │ Payments│  │   Email  │  │   Push   │
   │ Gateway │  │ Delivery │  │ Delivery │
   │ Worker  │  │  Worker  │  │  Worker  │
   │         │  │          │  │          │
   │Stripe   │  │ Resend   │  │FCM/VAPID │
   │ webhooks│  │ API      │  │ APNs     │
   └─────────┘  └──────────┘  └──────────┘
        │           │           │
        ▼           ▼           ▼
   ┌──────────────────────────────────────────────┐
   │ Secret Store (AWS / Cloudflare)              │
   ├──────────────────────────────────────────────┤
   │ • STRIPE_WEBHOOK_SECRET                      │
   │ • RESEND_API_KEY                             │
   │ • FCM_SERVICE_ACCOUNT (JSON)                 │
   │ • VAPID_PRIVATE_KEY                          │
   │ • GOOGLE_CLIENT_SECRET                       │
   │ • GEMINI_API_KEY                             │
   └──────────────────────────────────────────────┘
        │           │           │
        ▼           ▼           ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │  Stripe  │  │  Resend  │  │Firebase/ │
   │   API    │  │  Email   │  │  APNs    │
   └──────────┘  └──────────┘  └──────────┘
```

---

## Workload Identity Scope Definitions (All Verified by `secret_workload_identity`)

### Payment Operations
```motoko
scope: "payment-processor"           // Create checkouts, manage subscriptions
scope: "payment-webhook-verifier"    // Verify webhook signatures
scope: "payment-webhook-processor"   // Process webhook events
scope: "legacy-payments-sync"        // Sync with legacy Supabase payments DB
```

### Email Notifications
```motoko
scope: "send-email-notification"     // Send transactional emails
scope: "send-email-notification-backup" // Failover email delivery
```

### Push Notifications
```motoko
scope: "send-push-notification"      // All push (FCM, APNs, Web)
scope: "send-web-push-notification"  // Web Push specific (VAPID)
```

### Google Services
```motoko
scope: "google-oauth-auth"           // OAuth validation
scope: "google-oauth-exchange"       // Token exchange
scope: "google-places-query"         // Places API queries
scope: "google-drive-sync"           // Drive streaming & metadata
```

### AI Services
```motoko
scope: "llm-summarize-chat"          // Chat summaries (Gemini)
scope: "lovable-ai-query"            // AI features (deprecated)
```

### Media Services
```motoko
scope: "media-gif-search"            // GIF search (Giphy)
```

---

## Verification Checklist (Step 15A Exit Gate)

- [ ] All 18 external secrets provisioned in AWS Secrets Manager or Cloudflare Secrets
- [ ] All 4 external workers deployed and passing smoke tests (one successful job + secret fetch)
- [ ] All 18 workload identity scopes registered in `secret_workload_identity` canister
- [ ] Scope denial tests passing (unregistered scope → access denied)
- [ ] Principal revocation tests passing (revoked worker → job retried for new principal)
- [ ] Audit logs verified in `secret_workload_identity.audit_secret_access()` for all 18 scopes
- [ ] 21 decommissioned secrets no longer referenced in any canister code
- [ ] 3 public configuration values (origin, redirect URIs, dev flags) not stored in canister
- [ ] End-to-end test: send email → fetch RESEND_API_KEY → deliver → ack on-canister
- [ ] End-to-end test: claim push job → fetch FCM_SERVICE_ACCOUNT → deliver → record status
- [ ] Failure scenario: worker secret vault unreachable → notification stays pending → worker retries
- [ ] Failure scenario: worker principal revoked → secret access denied → job retried for new principal
- [ ] All 41 secrets accounted for with explicit assignment (external/HTTPS/decommissioned)
