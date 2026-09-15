# Production Deployment Action Tracker

## Goal

Move the project from a lab-validated synthetic ICP implementation to a private staging deployment and then to a production-safe deployment path without exposing secrets, bypassing RLS, or relying on Supabase-only behavior.

## Decision gate

This tracker is contingent on the following principle:

- No real secret, API key, master token, or private credential may live in canister memory, browser bundles, or frontend config.
- No edge function is considered production-safe unless it has a scoped external worker or native ICP replacement.
- Every domain must have explicit authorization evidence and negative tests.

---

## Action tracker

| Phase | Workstream | Owner / role | Concrete tasks | Exit gate | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 0 | Project guardrails | Platform + Security | Freeze production assumptions; enforce synthetic-only data; review netlify/ICP environment separation; confirm no live provider credentials | All environments are clearly separated and marked synthetic until explicit approval | environment matrix, deployment plan, review sign-off |
| 1 | Secret custody and workload identity | Security + Platform | Deploy worker vaults; register worker principals; define per-role scopes; remove any remaining service-role/master key from app code | No secret reaches canister memory or frontend bundle; every worker has explicit workload scope | `secret_workload_identity` proofs, vault config review, secret inventory sign-off |
| **2** | **External delivery workers** | **Backend + Platform** | **✅ DONE: Coordinator + Boundary + Providers (8 unit tests + 4 integration tests passing)** | **Workers authenticate with ICP, claim queue tasks scoped by scope, fail closed** | **`externalWorkerCoordinator.test.tsx` (8 tests), `externalWorkerIntegration.test.tsx` (4 tests) — all passing. Real canister integration ready.** |
| 3 | Notification and timer production path | Backend + ICP | Validate queue leases, retries, dead-letter transitions, callback scopes, and provider dedupe | No cross-domain worker claims; no job loss during lease expiry; dead-letter path is explicit | timer + notification test suite, failover logs |
| 4 | RLS parity completion | Backend + QA | Recheck source inventory against live domain methods; fill remaining negative tests for profile, guardian, team, media, and competition flows | Every domain has positive and negative tests; no implicit role fallback | parity matrix evidence, domain-specific regression pack |
| 5 | Provider-neutral routing | Frontend + Platform | Finalize hybrid Supabase/ICP route selection; enforce explicit fail-closed routing; remove silent backend fallback | No silent provider fallback; route selection is explicit and logged | hybrid route tests, admin policy tests |
| 6 | Placement and admin controls | Frontend + Platform | Implement admin-only placement settings route; enforce country policy, version validation, residency, health checks | Unauthorized users cannot mutate placement; country policy is enforced at all layers | placement-admin live tests and policy matrix |
| 7 | Upgrade and restore proof | ICP + DevOps | Extend stable-state proof beyond timer_jobs to every canister carrying durable state; validate backup and restore procedure | Every durable canister has upgrade and restore evidence | post-upgrade test logs, snapshot restore tests |
| 8 | Staging deployment | DevOps + QA | Deploy app to Netlify staging; point to private ICP staging environment; synthetic test data only | Staging works end-to-end without production credentials or real PII | staging checklist, smoke tests, deployment log |
| 9 | Production readiness review | Security + Leadership | Review all evidence, sign off, confirm monitoring and rollback plan | Production approval only after all gates pass | production readiness checklist and sign-off |

---

## Phase detail

### Phase 1: Secret custody and workload identity

#### Tasks
- Audit every secret currently referenced by Edge Functions.
- Move all operational secrets to controlled worker vaults.
- Register worker principals against `secret_workload_identity`.
- Bind each worker to a minimal allowed scope.
- Ensure canister state holds only non-secret identifiers and callback metadata.

#### Deliverable
- Secret inventory with final ownership and vault target.
- Worker identity registry and scope list.

#### Exit gate
- No secret exists in browser config, canister state, or frontend bundle.
- Every worker access is audited and scoped.

### Phase 2: External delivery workers

#### Tasks
- Email delivery worker for Resend.
- Push worker for FCM / web push.
- Payment gateway worker for Stripe checkout and callbacks.
- AI / search / media gateways only where required.

#### Deliverable
- Worker harnesses with queue claims, retries, and idempotency.
- Signed provider callback flows.

#### Exit gate
- All provider calls are explicit, authenticated, retry-safe, and deduplicated.

### Phase 3: Notification and timer production path

#### Tasks
- Final queue ownership model.
- Re-check worker scoping by domain.
- Validate dead-letter behavior, retries, provider dedupe, and callback guards.
- Prove lease expiry recovery and upgrade persistence for all runtime-critical queues.

#### Deliverable
- Durable queue proof for timer + notification workflows.

#### Exit gate
- Cross-scope claims are impossible.
- No stale processing job survives lease expiry.

### Phase 4: RLS parity completion

#### Tasks
- Complete parity for identity, guardian, club, team, media, and competition access paths.
- Add stale-write, replay, exclusion, and ownership tests.
- Recheck all source SQL policies against their ICP equivalents.

#### Deliverable
- Domain-by-domain parity report with evidence.

#### Exit gate
- Every role and object path has explicit positive and negative coverage.

### Phase 5: Routes, placement, and admin policy

#### Tasks
- Finalize hybrid route selection.
- Ensure site, country, and backend constraints are explicit and fail-closed.
- Add admin-only placement settings surface.

#### Deliverable
- Provider-neutral routing and admin policy model.

#### Exit gate
- No route can silently fall back or bypass policy.
- Country and placement constraints are enforced in both UI and canister logic.

### Phase 6: Upgrade and restore proof

#### Tasks
- Validate durable state for all canisters that persist data.
- Add upgrade and snapshot/restore evidence.
- Confirm backward compatibility for any newly added fields.

#### Deliverable
- Upgrade/restore playbook and signal-tested artifacts.

#### Exit gate
- A canister can upgrade without losing queue, callback, or auth metadata.

### Phase 7: Private staging deployment

#### Tasks
- Deploy frontend to Netlify in staging mode.
- Point to private staging ICP or local disposable network.
- Use synthetic identities only.
- Ensure no production credentials are present.

#### Deliverable
- Working staging deployment that exercises the end-to-end app path.

#### Exit gate
- All app flows work in a private environment without production secrets.

### Phase 8: Production review and release gate

#### Tasks
- Security review of all secret and worker flows.
- Failover and rollback test.
- Real environment readiness review.
- Final decision on production launch.

#### Deliverable
- Production readiness memo.

#### Exit gate
- Every required artifact is signed off and no red flags remain.

---

## Owner mapping

| Area | Recommended owner | Responsibility |
| :--- | :--- | :--- |
| Security and secret governance | Security lead | Secret inventories, principal registration, audit review |
| ICP architecture | ICP platform lead | Canister boundary design, upgrade safety, workload identity |
| Backend implementation | Backend engineer | Domain parity, queue logic, worker contracts |
| Frontend and routing | Frontend engineer | Hybrid routing, admin settings, deployment safety |
| QA / parity validation | QA lead | Negative tests, source-to-ICP mapping proof |
| DevOps / staging | DevOps lead | Netlify deployment, private staging, rollback |

---

## Recommended milestone ordering

1. Secret custody + worker identity
2. Queue + provider delivery workers
3. RLS parity completion and negative tests
4. Placement/admin policy and route hardening
5. Upgrade/restore proof across durable canisters
6. Private staging deployment
7. Final production readiness sign-off

---

## Current message to stakeholders

The project is no longer in a no-implementation state. It is in a strong lab-proof state, but it is not yet production-safe. The next phase is operational hardening and staging deployment, not product launch.

The work is now clear and tractable:

- secure the external worker boundary,
- finish the remaining parity tests,
- lock down the placement/admin controls,
- prove durable upgrade safety,
- then deploy to private staging.
