# External Worker Secrets Deployment Plan

## Executive Summary

This plan defines how to safely integrate 41 production secrets (API keys, private keys, webhook secrets) into external stateless workers that serve ICP canisters without exposing credentials in canister code or memory.

Every secret is:
1. **Provisioned in external secret management** (AWS Secrets Manager, Cloudflare Secrets, HashiCorp Vault, or provider-native services)
2. **Guarded by canister-issued workload identity** via `secret_workload_identity` verification
3. **Audited and logged** with immutable trails in both canister state and external logs
4. **Fail-closed** if unreachable or revoked

---

## 1. Complete Secret Inventory & Deployment Model

### 1.1 Payments & Billing Secrets (5 Secrets)

| Secret | Type | Source | Deployment | Workload Identity Scope | Failure Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `STRIPE_WEBHOOK_SECRET` | Webhook HMAC | Stripe Dashboard | Cloudflare Worker / AWS Lambda | `payment-webhook-processor` | Unsigned webhook rejected; no double-processing |
| `stripe_secret_key` (club-level) | API Key | Stripe Dashboard / DB | External Payments Gateway | `payment-processor` | Transaction fails closed; order stays `#Pending` |
| `STRIPE_WEBHOOK_SECRET` | Webhook Auth | Stripe Dashboard | Stripe Webhook Listener | `payment-webhook-verifier` | Webhook signature mismatch rejected |
| `IGNITE_PAYMENTS_SUPABASE_SERVICE_ROLE_KEY` | DB Master | Secondary Supabase (Payments) | Legacy Payments Sync Worker | `legacy-payments-sync` | Sync fails closed; no data loss |
| `IGNITE_PAYMENTS_SUPABASE_URL` | DB Endpoint | Secondary Supabase | Legacy Payments Sync Worker | (shared with above) | Connection timeout → skip retry window |

**Deployment Architecture**:
```
┌─────────────────────────────────────────┐
│ External Payments Gateway (Cloudflare)  │
├─────────────────────────────────────────┤
│ • Read: stripe_secret_key from Vault    │
│ • Call: stripe.checkout.sessions.create │
│ • Webhook: Verify STRIPE_WEBHOOK_SECRET │
│ • Authorization: secret_workload_identity│
└─────────────────────────────────────────┘
         ▲              │
         │              ▼
    ICP Canister    Stripe API
  (Events/Club)
```

**Workload Identity Registration** (One-Time, in production):
```bash
canister_principal=<external_gateway_principal>
npm run --prefix frontend test-secret-workload && \
curl -X POST http://<registry>:8000/register-workload \
  -d '{
    "workload_principal": "'$canister_principal'",
    "workload_name": "external-payments-gateway",
    "allowed_scopes": ["payment-processor", "payment-webhook-verifier"]
  }'
```

---

### 1.2 Email Delivery Secrets (2 Secrets)

| Secret | Type | Source | Deployment | Workload Identity Scope | Queue Integration |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `RESEND_API_KEY` | API Key | Resend Dashboard | Email Delivery Worker | `send-email-notification` | `notification_queue_motoko.claim()` |
| `RESEND_API_KEY` (Backup/Testing) | API Key | Resend Dashboard | Email Delivery Worker (Fallback) | `send-email-notification-backup` | On primary worker circuit-break |

**Deployment Architecture**:
```
notification_queue_motoko (ICP)
    │ (1) claims pending email jobs
    ▼
Email Delivery Worker (Cloudflare / Lambda)
    │ (2) verify_secret_access("send-email-notification", nonce)
    ├── (3) fetch RESEND_API_KEY from secret store
    ▼
Resend Email API
    │ (4) returns success/bounce
    ▼
Worker ACKs delivery / records failure
    │ (5) updates canister with delivery status
    ▼
notification_queue_motoko
```

**Workload Identity Registration**:
```motoko
// In production, register email worker once:
let email_worker = Principal.fromText("...");
await secret_workload_identity.register_workload(
  email_worker,
  "email-delivery-worker",
  vec { "send-email-notification" }
);
```

---

### 1.3 Push Notification Secrets (6 Secrets)

| Secret | Type | Source | Deployment | Workload Identity Scope | Provider |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `FCM_PRIVATE_KEY` | Service Account | Google Cloud Console | Push Delivery Worker | `send-push-notification` | Firebase Cloud Messaging |
| `FCM_PROJECT_ID` | Metadata | Google Cloud | Push Delivery Worker | (shared) | Firebase Cloud Messaging |
| `FCM_CLIENT_EMAIL` | OAuth Service Account | Google Cloud | Push Delivery Worker | (shared) | Firebase Cloud Messaging |
| `FCM_SERVICE_ACCOUNT` (Full JSON) | OAuth Credentials | Google Cloud | Push Delivery Worker Secret Vault | (shared) | Firebase Cloud Messaging |
| `VAPID_PRIVATE_KEY` | ECDSA Private | Web Push Certification | Push Delivery Worker | `send-web-push-notification` | Web Push (Safari, Chrome) |
| `VAPID_PUBLIC_KEY` | ECDSA Public | Web Push Certification | Push Delivery Worker + Client | (shared) | Web Push (Sara, Chrome) |

**Deployment Architecture**:
```
notification_queue_motoko
    │ (1) claims APNs / FCM / Web Push jobs
    ▼
Push Delivery Worker (Single Worker, Multi-Provider)
    ├── (2a) For FCM: fetch FCM_SERVICE_ACCOUNT, sign OAuth, call firebase.googleapis.com
    ├── (2b) For APNs: fetch APNs .p8 key, sign JWT, call api.push.apple.com
    ├── (2c) For Web Push: fetch VAPID_PRIVATE_KEY, sign ECDSA, POST to endpoint
    │
    └─► verify_secret_access("send-push-notification", nonce) at start
        Audit log: which provider, success/failure, device token
    
    ▼ (3) Record delivery status (delivered / bounced / unregistered)
    
notification_queue_motoko (update delivery status)
```

**Workload Identity Registration**:
```bash
# Single worker, all push providers
push_worker_principal=<principal>
for provider in fcm apns web_push; do
  curl -X POST http://secret_workload_identity:8000/register-workload \
    -d '{
      "workload_principal": "'$push_worker_principal'",
      "workload_name": "push-delivery-worker-'$provider'",
      "allowed_scopes": ["send-push-notification"]
    }'
done
```

---

### 1.4 Google OAuth & Drive Secrets (4 Secrets)

| Secret | Type | Source | Deployment | Workload Identity Scope | Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GOOGLE_CLIENT_ID` | OAuth App ID | Google Cloud Console | Drive/Places Worker | `google-oauth-auth` | OAuth redirect validation |
| `GOOGLE_CLIENT_SECRET` | OAuth App Secret | Google Cloud Console | Drive/Places Worker | `google-oauth-exchange` | Token exchange server-to-server |
| `GOOGLE_PLACES_API_KEY` | Maps API Key | Google Cloud Console | Places Search Worker (or ICP HTTPS) | `google-places-query` | Venue search queries |

**Deployment Architecture**:
```
[User Initiates Drive Import]
    │
    ▼
[Drive Sync Worker]
    ├── (1) Exchange auth code for user's Google OAuth token (using GOOGLE_CLIENT_SECRET)
    ├── (2) Stream user's Google Drive folders & files to encrypted external storage
    ├── (3) Post metadata to media_metadata_motoko
    └── (4) verify_secret_access("google-oauth-exchange", nonce) + audit log
    
[Venue Search]
    │
    ▼
[Places Worker or ICP HTTPS Outcall]
    ├── (1) Call Google Places API with GOOGLE_PLACES_API_KEY
    └── (2) Return sanitized results (name, lat/lng, place_id)
```

**Workload Identity Registration**:
```motoko
let drive_worker = Principal.fromText("...");
await secret_workload_identity.register_workload(
  drive_worker,
  "google-drive-oauth-worker",
  vec { "google-oauth-exchange", "google-places-query" }
);
```

---

### 1.5 AI/LLM Secrets (2 Secrets)

| Secret | Type | Source | Deployment | Workload Identity Scope | Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | API Key | Google Cloud Console | LLM Summary Worker or ICP HTTPS | `llm-summarize-chat` | Chat summarization |
| `LOVABLE_API_KEY` | API Key | Lovable.dev (Deprecated) | LLM Worker (Optional) | `lovable-ai-query` | Legacy AI features (optional) |

**Deployment Architecture**:
```
[Chat Summary Request]
    │
    ▼
[LLM Worker (Cloudflare / Lambda) OR ICP HTTPS Outcall]
    ├── (1) Sanitize chat messages (remove raw PII fields)
    ├── (2) Call Gemini API with GEMINI_API_KEY
    ├── (3) Return deterministic temperature=0 summary
    └── (4) If worker: verify_secret_access("llm-summarize-chat", nonce)
```

**Workload Identity Registration**:
```bash
llm_worker_principal=<principal>
curl -X POST http://secret_workload_identity:8000/register-workload \
  -d '{
    "workload_principal": "'$llm_worker_principal'",
    "workload_name": "llm-summary-worker",
    "allowed_scopes": ["llm-summarize-chat"]
  }'
```

---

### 1.6 Media & Content Search Secrets (2 Secrets)

| Secret | Type | Source | Deployment | Workload Identity Scope | Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GIPHY_API_KEY` | API Key | Giphy Developers | ICP HTTPS Outcall or Worker | `media-gif-search` | GIF search / selector |

**Deployment Architecture**:
```
Option A: ICP HTTPS Outcall (preferred for low-volume)
    │
    ▼
[ICP consensus query]
    │ (1) Make deterministic HTTPS request to giphy.com
    ├── (2) Transform response (extract gif URLs)
    └── (3) Return consensus-validated results
    
Option B: External Worker (for high-volume)
    │
    ▼
[Giphy Worker (Cloudflare)]
    ├── (1) fetch GIPHY_API_KEY
    ├── (2) Call giphy.com/api
    └── (3) verify_secret_access("media-gif-search", nonce)
```

---

### 1.7 Internal Cron / Webhook Secrets (3 Secrets) — DECOMMISSIONED ON ICP

| Secret | Legacy Use | ICP Replacement | Status |
| :--- | :--- | :--- | :--- |
| `CRON_SECRET` | Edge Function webhook token | Native `timer_jobs` canister callbacks | **Removed** |
| `AUTO_RSVP_DM_CRON_SECRET` | Scheduled cron identity token | Native `timer_jobs` schedule state | **Removed** |
| `NEW_CLUB_ALERT_SECRET` | Webhook for club creation alerts | `timer_jobs` event listener + `messaging_domain` | **Removed** |

These secrets are **not needed on ICP** because all scheduling is handled by durable canister state in `timer_jobs`, with no external webhooks required.

---

### 1.8 Configuration & Visibility Secrets (3 Secrets)

| Secret | Type | Source | Deployment | Workload Identity Scope | Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `APP_PUBLIC_ORIGIN` | Config | Application DNS | Public (Frontend Config) | N/A | Internet Identity derivation origin |
| `APP_ALLOWED_REDIRECT_ORIGINS` | Config | Security Policy | Public (Frontend Config) | N/A | OAuth redirect whitelist |
| `ALLOW_LOCAL_REDIRECTS` | Config | Dev Only | Frontend / Dev Worker | N/A | Testing flag (not production) |

**No workload identity needed** — these are public or dev-only configuration values.

---

### 1.9 Legacy/Deprecated Secrets (4 Secrets) — NOT PORTED

| Secret | Legacy Use | ICP Status | Reason |
| :--- | :--- | :--- | :--- |
| `SUPABASE_SERVICE_ROLE_KEY` | Database master key | **Decommissioned** | Replaced by canister RBAC & `identity_access` |
| `SUPABASE_ANON_KEY` | Database public key | **Decommissioned** | Replaced by ICP principals |
| `SUPABASE_URL` | Database endpoint | **Decommissioned** | ICP canisters are the data layer |
| `SUPABASE_PAT` | Personal access token | **Decommissioned** | Not needed on ICP |

These are **intentionally removed** from ICP. Domain canisters are the authoritative data layer; there is no fallback to Supabase.

---

## 2. Workload Identity Registration Process

### 2.1 Template: Register a New Worker

**In production setup** (one-time per worker):

```typescript
import { Principal } from '@icp-sdk/core/principal';
import { HttpAgent } from '@icp-sdk/core/agent';
import type { _SERVICE as SecretService } from './bindings/secret_workload_identity/declarations/secret_workload_identity.did';

const secretCanisterId = 'ca6gz-...-cai';
const workerPrincipal = Principal.fromText('22222-...-cai'); // External worker's principal

async function registerWorker() {
  const agent = new HttpAgent({ host: 'https://ic0.app' });
  const secretActor = Actor.createActor(secretIdl, { agent, canisterId: secretCanisterId });

  const result = await secretActor.register_workload(
    workerPrincipal,
    'email-delivery-worker',
    ['send-email-notification'] // scopes
  );

  console.log('Registered:', result);
}
```

### 2.2 Runtime: Worker Requests Secret Access

**Every time a worker starts processing**:

```typescript
// Worker code (e.g., Cloudflare Worker)
const nonce = crypto.randomUUID();

const accessCheck = await fetch('https://<secret_canister>.icp0.io/', {
  method: 'POST',
  body: JSON.stringify({
    request: {
      verify_secret_access: [
        workerPrincipal,
        'send-email-notification',
        nonce,
      ],
    },
  }),
});

const { approved, reason } = await accessCheck.json();

if (!approved) {
  console.error('Access denied:', reason);
  process.exit(1); // Fail closed
}

// Now safe to read actual secrets from worker's vault
const RESEND_API_KEY = await getSecret('RESEND_API_KEY');
const result = await resend.emails.send({ /* ... */ });
```

---

## 3. Secret Storage & Rotation Strategy

### 3.1 Production Secret Management Options

| Service | Deployment Model | Secret Rotation | Audit Trail |
| :--- | :--- | :--- | :--- |
| **AWS Secrets Manager** | AWS Lambda | Automatic rotation policies | CloudWatch + KMS logs |
| **Cloudflare Secrets** | Cloudflare Workers | Manual rotation via Wrangler | Cloudflare Audit Logs |
| **HashiCorp Vault** | Self-hosted or SaaS | Dynamic secrets + auto-rotation | Vault audit backend |
| **Google Cloud Secret Manager** | Google Cloud Run | Automatic versioning + rotation | Cloud Audit Logs |

**Recommendation for Ignite**:
* **Stripe secrets**: AWS Secrets Manager (critical, audited)
* **Email/Push/LLM API keys**: Cloudflare Secrets (co-located with workers, auto-sync)
* **OAuth service accounts (Google)**: AWS Secrets Manager + encrypted backup
* **VAPID keys**: Cloudflare Secrets (short-lived, rotatable)

### 3.2 Key Rotation Ceremony (Production, Monthly)

**Goal**: Rotate secrets without disrupting service.

**Steps**:
1. **Create new secret version** in AWS/Cloudflare (old and new keys coexist for grace period)
2. **Deploy new worker revision** with updated secret reference
3. **Monitor error logs** for 24 hours (ensure new key works)
4. **Disable old secret** in vault (prevent accidental use)
5. **Update audit log** in canister with rotation timestamp
6. **Audit trail preserved**: Every rotation is logged in `secret_workload_identity` audit tables

---

## 4. Audit & Compliance Logging

Every secret access is logged immutably in the `secret_workload_identity` canister:

```motoko
type SecretAccessAudit = record {
  timestamp: nat64;
  requesting_principal: principal;  // Worker's canister/agent principal
  workload_name: text;              // e.g. "email-delivery-worker"
  secret_scope: text;               // e.g. "send-email-notification"
  approved: bool;                   // true/false decision
  denial_reason: opt text;          // if denied
  nonce: text;                      // replay protection
};
```

**Query Example**:
```bash
# Query all email worker secret accesses in past 7 days
curl -X POST https://secret_workload_identity.icp0.io/ -d '{
  "request": {
    "audit_secret_access": [{
      "opt_principal": ["<email_worker_principal>"],
      "opt_scope": ["send-email-notification"],
      "opt_from_ts": [<7_days_ago_ns>],
      "opt_to_ts": [<now_ns>]
    }]
  }
}'
```

---

## 5. Failure Modes & Fallback Strategies

| Failure Scenario | ICP Canister Behavior | Worker Behavior | Recovery |
| :--- | :--- | :--- | :--- |
| Worker calls `verify_secret_access`, denied | N/A | Fails immediately; no secret fetched | Re-register workload or escalate to admin |
| Worker fetches secret from vault, vault unavailable | N/A | Exponential backoff, max 3 retries | Circuit-breaker after 10 min; alert ops |
| Worker sends to Resend, temporary network error | Notification stays `#Pending` | Backoff & retry (exponential up to 1hr) | Worker retries on next cycle |
| Worker sends to Resend, permanent rejection (bad email) | Notification transitions to `#Failed` | Record error; do NOT retry | Manual review or bounce handler |
| Worker's secret access is revoked mid-job | (None — canister is unaware) | Worker fails; job re-queued for next principal | Escalate to admin; audit log shows revocation |

---

## 6. Deployment Checklist (Step 15A in Implementation Plan)

- [ ] **AWS Secrets Manager Setup**: Create secret entries for Stripe, OAuth, APNs .p8, etc.
- [ ] **Cloudflare Workers Deployment**: Deploy 4 workers (Payments, Email, Push, LLM) with Wrangler secrets bound.
- [ ] **Workload Identity Registration**: Run registration script to register each worker principal with `secret_workload_identity`.
- [ ] **Smoke Tests**: Each worker performs one successful secret access and logs audit entry.
- [ ] **Secret Rotation Policy**: Document monthly rotation ceremony and update runbook.
- [ ] **Audit Log Access**: Grant ops team read-only query access to `secret_workload_identity` audit tables.
- [ ] **Incident Response**: Define escalation for "secret access denied" and "vault unavailable" scenarios.
