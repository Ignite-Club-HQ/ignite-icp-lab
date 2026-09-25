# Remaining implementation work

This document records the current remaining implementation backlog in the local ICP lab worktree, based on the reconciled repo state and the execution plan in [docs/HYBRID_RUST_MOTOKO_EXECUTION_PLAN.md](./HYBRID_RUST_MOTOKO_EXECUTION_PLAN.md).

## Current status summary

- Step 1 is complete in the current repo: topology and Candid drift are passing.
- The hybrid frontend migration is largely in place, with the shared router and placement logic already implemented.
- The repo is past the initial architecture gates and is now in the longer-tail parity and product-hardening backlog.
- The remaining work is not a fresh reset or topology rewrite; it is the later implementation backlog.
- Live PocketIC proof remains blocked by the local launcher issue, so full live execution proof is still limited by environment constraints rather than lack of code structure.
- The imported frontend regression suite is now activated as a permanent second test tier: `npm run test:legacy` currently passes 1999 tests with 2 intentional skips across 180 files, in addition to the existing `npm test` lab suite.
- Supabase and ICP test doubles are now available for imported and new tests via `frontend/src/test/mockSupabaseClient.ts` and `frontend/src/test/mockLocalActor.ts`, and legacy-suite setup now blocks accidental real network calls.

## Remaining work in dependency order

### 1) Finish hybrid frontend migration

Goal: complete the migration of the remaining routed pages from direct Supabase assumptions to the hybrid backend router and typed local services.

Remaining work:
- Finish the remaining pages classified as `hybrid` but still effectively using fixture-only read behavior.
- Replace fixture-only reads with typed local adapters where the authority exists.
- Complete create/edit/join flows for clubs, teams, events, competitions, roles, enrolment, and EOI.
- Ensure unsupported writes show explicit read-only / not-enabled states instead of silent fallback.
- Keep external-only surfaces in `external_boundary` or `supabase_only` clearly and intentionally.
- Add browser-level proof that ICP mode does not make Supabase requests.

Exit gate:
- No routed page silently falls back to Supabase in ICP lab mode.
- Every routed page has an explicit backend status and behavior.

### 2) Close authorization parity gaps

Goal: make every domain enforce authorization inside its own update methods rather than trusting the frontend.

Remaining work:
- Finish identity, profile, recovery, and consent flows.
- Complete club membership and team membership checks.
- Finish event guardian, RSVP, and attendance authorization.
- Finish competition participant and official role checks.
- Finish messaging DM, group, moderation, and retention checks.
- Finish media ownership, guardian, and storage-prefix rules.
- Finish notification recipient, preference, and delivery scope checks.
- Finish timer callback capability enforcement.

Exit gate:
- Positive and negative authorization evidence is present for each domain.

### 3) Complete domain production-shape behavior

Goal: move from proof-of-concept domain behavior to production-shaped domain logic.

Remaining work:
- Add bounded pagination and payload limits to remaining collections.
- Make more mutations idempotent and durable.
- Finish richer events, competition, messaging, and media workflows.
- Enforce domain-local access checks within each canister.
- Add snapshot, restore, upgrade, and interruption evidence for populated-state scenarios.

Exit gate:
- Replay, recovery, and partial-failure scenarios are covered for each domain.

### 4) Complete privacy and storage boundaries

Goal: approve and enforce the privacy architecture for PII and child-sensitive media.

Remaining work:
- Reconcile the field classification matrix with every sanitized source column.
- Finalize retention, residency, consent, and erasure rules for PII and child-photo data.
- Implement the approved vetKeys / protected-engine design and purpose-bound key capabilities.
- Add key rotation, revocation, and crypto-erasure evidence.
- Prove that unavailable key and vault services fail closed without plaintext fallback.

Exit gate:
- Privacy and child-safety evidence is explicit, not assumed.

### 5) Finish external-worker and vault integration

Goal: keep all non-lab external dependencies outside the repo until expressly approved.

Remaining work:
- Add real vault attestation and short-lived workload credentials only in approved lab infrastructure.
- Add provider verification for webhooks and nonces.
- Finish rotation/revocation and immutable audit storage.
- Keep email, push, payment, AI, and third-party workers outside the repo until separately approved.

Exit gate:
- No production credentials or external secret material are present in source files.

### 6) Finish placement-admin and control-plane integration

Goal: wire the authority surfaces into the actual app-admin flow.

Remaining work:
- Mount placement settings in the real app-admin navigation.
- Enforce app-admin / placement-admin authorization.
- Connect country policy, target/version, health, and availability to the typed registry adapter.
- Add Site A/B/C isolation and cache/session separation.
- Keep club country and device-country detection authoritative but advisory where appropriate.

Exit gate:
- Routing and placement authority remain consistent across app and admin surfaces.

### 7) Finish durability and operational evidence

Goal: strengthen local proof beyond compile-time checks.

Remaining work:
- Run interrupted route and migration recovery checks.
- Verify schema evolution and cross-canister reference behavior.
- Complete cycle, stable-growth, concurrency, and upgrade measurements.
- Add monitoring, runbooks, and ownership for local ICP operations.

Exit gate:
- Local durability evidence is stronger than “it compiles.”

### 8) Final production-readiness gates

Goal: keep all new ICP work synthetic and lab-only until explicit external approvals exist.

Remaining work:
- Complete privacy, child-safety, security, dependency, residency, and operational approvals.
- Keep existing Supabase workloads authoritative.
- Do not enable dual-writing, silent reassignment, or production fallback.

Exit gate:
- The repo remains in synthetic lab mode until the required approvals are obtained.

## Current repo evidence

Relevant current sources:
- [docs/HYBRID_RUST_MOTOKO_EXECUTION_PLAN.md](./HYBRID_RUST_MOTOKO_EXECUTION_PLAN.md)
- [docs/VALIDATION.md](./VALIDATION.md)
- [frontend/src/lab/backendRouter.ts](../frontend/src/lab/backendRouter.ts)
- [frontend/src/lab/hybridClubLinksService.ts](../frontend/src/lab/hybridClubLinksService.ts)
- [frontend/src/pages/EventsPage.tsx](../frontend/src/pages/EventsPage.tsx)
- [frontend/src/pages/NotificationsPage.tsx](../frontend/src/pages/NotificationsPage.tsx)
- [frontend/src/pages/ManageUsersPage.tsx](../frontend/src/pages/ManageUsersPage.tsx)
- [frontend/lab-route-classification.json](../frontend/lab-route-classification.json)
- [icp.yaml](../icp.yaml)
- [icp-domain-topology.json](../icp-domain-topology.json)

## Production path (outside the current lab boundary)

The lab can be turned into an actual production application, but only by moving through a separate, explicitly approved production phase. The current repo remains synthetic and must not be treated as production infrastructure. The production path should be layered as follows:

### A. Freeze the lab architecture and prove parity

1. Lock the canonical topology, Candid contracts, deployment naming, and environment boundaries.
2. Treat the current synthetic topology as the baseline for production design review, not as a live deployment target.
3. Complete the remaining parity evidence for club, events, competitions, messaging, media, notifications, and timers.
4. Require explicit positive/negative authorization tests before promoting a domain to production status.

### B. Separate production-only boundaries from the lab

1. Create a production deployment plan for external workers, vaults, payment systems, mail/push delivery, AI integration, media scanning, and storage credentials.
2. Keep all real secrets, credentials, and external infrastructure outside this repo and outside the lab worktree.
3. Use dedicated production-only environment files, secret stores, and provisioning workflows that are not committed to the lab codebase.
4. Keep the lab remaining synthetic and local-only until each external dependency is separately approved.

### C. Define the production architecture decision set

1. Decide the production hosting model: production ICP subnet placement, app admin model, storage boundary, worker placement, key management, and incident ownership.
2. Decide which services remain Supabase-backed versus ICP-backed and define the exact source of truth for each domain.
3. Decide whether the production app uses:
   - ICP for identity/account and canister-owned workflows,
   - Supabase for app data, analytics, and static/browse workloads,
   - external managed services for email, push, billing, media scanning, AI, and storage.
4. Define fail-closed behavior for missing services, blocked placements, invalid residency, or unhealthy targets.

### D. Add production migration and recovery controls

1. Create a production migration plan with staged release gates for schema evolution, canister upgrade, data backfill, and rollback.
2. Add durable snapshot / restore tests for each production-critical domain.
3. Add interruption and recovery tests for timers, notifications, messaging, competitions, and events.
4. Define incident ownership, rollback authority, and health monitors before production enablement.

### E. Formal production approval gates

The production app should not be launched until all of the following are approved and evidenced:
- privacy and child-safety review
- security review and dependency review
- canister authorization parity review
- external worker and secret-vault review
- residency and compliance review
- operational runbook and rollback review
- production secret handling review

### F. Concrete conversion sequence

1. Finish the remaining parity, privacy, and routing work in the current repo.
2. Freeze a production architecture document for the final domain split between Supabase and ICP.
3. Stand up a production-only environment separate from the synthetic lab.
4. Migrate verified domains in batches with dual validation and explicit rollback.
5. Enable production traffic only after all domain gates and external approvals pass.
6. Prepare the repo for reintegration into the main Ignite codebase by separating the lab-only files, keeping production secrets out of history, and providing a clean migration branch or patch set for the upstream repo.
7. Reconcile the final production topology and Candid contract set with the main repo conventions, build tooling, and deployment process before merging or restoring the code under the Ignite repository.

### G. Reintegrating under the Ignite repo

The final move back under the main Ignite repository should be treated as a separate integration step, not as part of the synthetic lab work itself.

Required work:
- identify every lab-only file and ensure it is either removed or clearly isolated behind a production-safe boundary
- make sure no synthetic data, loopback ICP references, local-only adapters, or placeholder claims remain in the production branch
- keep the production branch aligned with the approved domain ownership model and external worker boundary
- provide a clean audit trail of what changed relative to the lab baseline before merging into the main repo
- keep the repo history and branch structure explicit: lab work stays in its own worktree/branch until the production review is complete

Exit gate:
- the codebase is reviewable as a production-ready branch with clearly separated lab artifacts, not as a raw transfer of experiment code

## Bottom line

The repo is no longer missing the foundation. The remaining work is the later implementation backlog: complete the hybrid frontend migration, close the remaining parity gaps, finish the privacy/storage boundary, and keep all production-readiness obligations outside the current lab scope until separately authorized. The production conversion itself is a separate phase that must be designed and approved outside the synthetic lab, with a tighter boundary for secrets, real data, and live infrastructure.
