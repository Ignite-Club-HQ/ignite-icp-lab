# Hybrid Domain Ownership Model

This document defines which backend is authoritative for each product domain while Supabase and ICP coexist. It applies to the isolated lab architecture and contains no production endpoint, credential, or deployment configuration. It is a coexistence model for the current phase; its contracts must remain suitable for a future, separately approved migration in either direction.

## Core rules

The logical canister allocation for these ownership boundaries is defined in
[ICP_CANISTER_TOPOLOGY.md](ICP_CANISTER_TOPOLOGY.md). Domains use shared
shard families rather than one canister per club; physical shard counts grow
only when measured workload, residency, or hot-tenant isolation requires it.

1. Each tenant domain has exactly one authoritative writer at a time.
2. A placement decision is made before every domain operation.
3. Existing Supabase workloads continue using Supabase. ICP reads and writes apply only to newly provisioned or explicitly isolated workloads.
4. Writes are accepted only by the authoritative backend while the placement is `Active` and the backend and country policy are enabled.
5. There is no silent fallback from ICP to Supabase or from Supabase to ICP.
6. A domain is never dual-written unless a versioned replication and reconciliation protocol has been designed and tested for that domain.
7. Backend choice is trusted control-plane data. A browser, IP lookup, or user-supplied country value cannot select a backend.
8. User identity and authorization are shared application concepts. A backend-specific identifier is only a mapping, not the authorization source.
9. Existing Supabase placements are immutable in this phase. New ICP placement is provisioning, not migration; no export, import, cutover, or rollback of Supabase data is performed now. Future migration in either direction requires explicit authorization and evidence.
10. PII authority, PII encryption capability, and vault secret custody are
	separate boundaries. Domain ownership does not grant access to raw keys or
	external credentials.
11. Multi-site topology is supported through explicit site identifiers (`site_id`)
	and target descriptors in the placement control plane. The system can route
	to multiple independent Supabase instances (e.g. Site A primary and Site B
	secondary/tenant) as well as partner hybrid sites (Site C with both Supabase
	and ICP backends). Each site maintains isolated client connection pools,
	independent availability switches, and fail-closed isolation. Cross-site
	federation details are documented in
	[FEDERATED_MULTI_SITE_HYBRID_ARCHITECTURE.md](FEDERATED_MULTI_SITE_HYBRID_ARCHITECTURE.md).

## Placement granularity decision

The selected backend is a **workload-level placement**. Country is a policy constraint and defaulting mechanism, not the placement identity. A country may permit Supabase, ICP, or both, but each newly provisioned workload receives an explicit placement record. Existing Supabase workloads are not reassigned.

This permits separately provisioned synthetic identities to use ICP without changing existing Supabase users. User choice does not select the backend for shared club data. Existing memberships, roles, schedules, messages, and club content remain on Supabase.

New ICP-workload provisioning may use a country policy default, but provisioning must still write an explicit placement. Existing Supabase clubs and domains are never silently rerouted or reassigned.

## Initial authority matrix

The initial target is a per-club placement model. The selected backend owns the club's tenant data for each domain unless a row explicitly says otherwise.

| Domain | Initial authority | ICP target | Supabase coexistence | ICP provisioning priority | Notes |
| --- | --- | --- | --- | --- | --- |
| Club links and club configuration | Per-club placement | Club-domain canister | Existing provider remains available | First | Current local POC |
| Clubs and teams | Per-club placement | Club-domain canister | Existing provider remains available | Early | Keep stable application IDs |
| Club memberships | Per-club placement | Membership/domain canister | Existing provider remains authoritative until parity passes | High | Security-critical |
| Roles and permissions | Per-club placement, with global operator roles | Authorization/domain canister | Supabase RLS remains source during transition | High | Requires full RLS parity |
| User profiles and PII | Supabase account authority | `identity_access` plus owning domain for new workloads; encrypted PII requires the approved vetKeys/protected-engine path | Existing Supabase profiles remain unchanged | High | No raw keys or vault secrets in ICP state |
| Events and schedules | Per-club placement | Club-domain canister | Existing provider remains available | Medium | Good post-configuration candidate |
| Notifications | Service-specific authority | Notification canister plus external delivery worker | Supabase or external delivery may remain | Medium | Delivery provider is separate from record authority |
| Media metadata | Per-club placement | Media metadata canister | Supabase metadata remains available | Medium | Bytes have separate storage authority |
| Media and file bytes | Dedicated storage placement | Asset/media canisters or approved external storage | Supabase Storage may remain per object set | Medium/high | Do not assume one asset canister |
| Messaging conversations and messages | Per-club or conversation placement | Messaging canister set | Supabase Realtime remains during transition | Late | Major latency and scale gate |
| Message attachments | Conversation placement with storage service | Attachment/media canister | Supabase Storage may remain | Late | Requires chunking and access control |
| Sponsors | Per-club placement | Club-domain canister | Existing provider remains available | Medium | Verify media and payment dependencies |
| Competitions and leagues | Shared or league-owner placement | Dedicated competition canister | Existing provider remains available | Later | Ownership may not be club-local |
| Audit records | Control-plane/domain authority | Append-only audit canister or domain logs | Supabase audit data remains queryable | Early | Required for placement and security actions |
| Backend placement and country policy | ICP control-plane authority | Placement registry | No Supabase writer | First | Critical routing state |

This matrix is the initial architecture. A domain may remain on Supabase permanently; ICP is additive and is not a destination for existing Supabase data.

## Read and write behavior

### Active placement

- Reads go to the selected backend.
- Writes go to the selected backend.
- The provider rejects operations if the registry decision is stale or unavailable.

### Read-only placement

- Reads go to the selected backend.
- Writes fail with an explicit read-only error.
- This state is used for controlled ICP provisioning or incident containment.

### Migration-required placement (reserved, out of scope)

- This defensive state is retained for future separately authorized work.
- It is not used to move or mirror existing Supabase data in this plan.

### Blocked placement

- Reads and writes fail closed.
- Operators must resolve the placement or restore from a verified snapshot.

### Disabled backend

- Existing placement metadata is retained.
- New placements cannot target the disabled backend.
- Existing writes fail closed until the selected backend is restored; existing Supabase workloads are never automatically reassigned.
- No automatic rerouting occurs.

## Shared and cross-club data

Some domains do not fit a simple club-local ownership model:

- Global application roles belong to the control plane.
- User accounts belong to an account service, with linked backend records.
- Leagues and competitions may be owned by a league or competition service.
- Notifications have a record owner and a separate delivery provider.
- Files have metadata ownership and byte-storage ownership, which may differ.

Cross-club reads must use an explicit service contract. A club canister must not query another club's private data merely because the caller belongs to both clubs.

## Prohibited states

The hybrid system must reject or prevent:

- Two active writers for the same domain and club.
- Frontend-selected country or backend authority.
- Implicit fallback after a timeout or provider error.
- Reassigning an existing Supabase workload to ICP without the future migration protocol.
- Copying, dual-writing, or deleting existing Supabase data.
- Authorization based only on a cached frontend placement.
- Using a Supabase UUID as an ICP caller principal.

## Acceptance criteria for step 1

Step 1 is complete when:

- Every major domain has an identified authority and provisioning priority.
- Shared versus club-local ownership is explicit.
- Active, read-only, blocked, and disabled behavior is defined; migration-required remains reserved.
- Dual-write and fallback rules are prohibited by contract.
- The placement registry can represent every permitted backend choice.
- Product, security, and operations owners approve the matrix before domain canister implementation begins.

## Decisions still required

The following decisions require product and DFINITY review before production design:

1. Whether user profiles are globally owned or split into account and club-profile records.
2. Whether competitions and leagues are shared services or club-owned data.
3. Whether notifications remain externally delivered while new ICP notification records are introduced.
4. Whether message conversations are club-local, team-local, or independently placed.
5. Which media bytes must be certified by ICP and which may remain in external storage.
6. The retention period for synthetic ICP snapshots and recovery evidence.
7. The operator approval process for country-policy changes and backend disablement.
