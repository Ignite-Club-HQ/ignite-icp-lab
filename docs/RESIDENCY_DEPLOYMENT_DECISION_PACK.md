# Residency and ICP Deployment Decision Pack

This document extends the hybrid ownership model with data-location and deployment-class requirements. It is an architecture decision pack for review; it contains no production endpoints, credentials, canister IDs, or real user data.

## Decision to adopt

Country is a policy constraint. Club placement selects one approved residency profile and one backend target within that profile.

```text
country policy → residency profile → backend → approved target
```

The frontend cannot choose any of these values. A browser country claim, IP address, or user preference is not an authorization or residency source.

## Residency profiles

The production control plane should use explicit profiles rather than assuming that a country name maps directly to one infrastructure location.

| Profile | Intended coverage | Supabase target | ICP target | Classification |
| --- | --- | --- | --- | --- |
| `AU_SYDNEY` | Australia and approved Australian data | Dedicated project in Sydney (`ap-southeast-2`) | Approved Australian public subnet or Cloud Engine subnet | Strict regional |
| `US_EAST` | US East customers | Dedicated project in US East (`us-east-1`) | Approved US East public subnet or Cloud Engine subnet | Strict regional |
| `EU_FRANKFURT` | EU customers where Frankfurt is acceptable | Dedicated project in Frankfurt (`eu-central-1`) | Approved European subnet or Cloud Engine subnet | Strict regional |
| `GLOBAL_NON_RESTRICTED` | Data explicitly approved for global placement | Approved general region | Default approved ICP application subnet | General |

These are proposed profile names. The actual allowed regions and subnet IDs require platform and legal review.

## Supabase target model

Each residency profile must map to an approved Supabase project target:

```text
target_alias: supabase-au-primary
provider: supabase
project_ref: managed outside the frontend
exact_region: ap-southeast-2
write_endpoint: managed outside the frontend
auth_region: verified
storage_region: verified
realtime_region: verified
edge_function_region: verified
status: active | read_only | disabled
```

Strict residency should use separate regional Supabase projects when the complete feature set must remain regional. Read replicas are not a substitute for a regional primary because write traffic, Auth, Storage, and Realtime have separate behavior.

The registry stores only `target_alias` and verified metadata. Project URLs, service keys, and secrets remain in the provider runtime and secret-management system.

## ICP target model

Each ICP residency profile must map to a target with independently verified topology:

```text
target_alias: icp-au-cloud-engine
provider: icp
canister: principal
subnet: principal
region_profile: AU_SYDNEY
deployment_class: public_subnet | cloud_engine
sev_snp: required | available | unavailable | not_required
status: active | read_only | disabled
```

The canister's subnet is part of the residency evidence. Moving a canister to another subnet is a migration operation and may change its canister ID. A target must not be marked active until its subnet, node geography, deployment class, and backup path have been verified.

Cloud Engine may provide stronger operator and hardware control, but it introduces responsibility for subnet operation, capacity, upgrades, monitoring, recovery, and cost. SEV-SNP availability must be confirmed for each region where confidential processing is required.

## Data classes

Every domain and integration must be assigned a data class:

| Class | Meaning | Placement requirement |
| --- | --- | --- |
| `strict_regional` | Must remain in the approved country or jurisdiction | Regional profile and target required |
| `regional_movable` | May move only through approved migration | Source freeze and destination verification required |
| `global_allowed` | May use an approved global service | Global profile permitted |
| `identity_metadata` | Account linkage and authentication metadata | Separate identity residency decision required |
| `operational_metadata` | Health, placement, and audit metadata | Minimize content; define control-plane location |
| `secret` | Credential, signing key, or token | Never ordinary canister state |

Apply these classes to club data, memberships, profiles, messages, attachments, notifications, audit events, backups, logs, analytics, and external service calls.

## Secrets and protected processing

Ordinary canister state is replicated across the subnet and is not a general-purpose secret vault. Classify every secret before ICP implementation.

- Keep OAuth, push, payment, storage-signing, and third-party API credentials outside ordinary canister state.
- If protected processing is required, confirm SEV-SNP Cloud Engine capacity and region availability before selecting the profile.
- If vetKeys are required from an engine deployment, design a separately deployed and funded proxy canister and record its trust and residency boundary.
- Do not place production credentials in Candid arguments, stable memory, the repository, frontend bundles, or test fixtures.

## Cross-subnet and external-call rules

For every canister call outside the local subnet, record:

- Destination subnet and residency profile.
- Bounded-wait behavior.
- No-cycles requirement where applicable.
- Payload bounds.
- Runtime rejection behavior.
- Retry and compensation.
- Data-residency impact.

Edge Function replacements must be tested at runtime. Successful compilation and installation do not prove that an external call will be accepted.

## Timers

Scheduled work must persist its schedule and idempotency state in stable memory. Timer registrations are transient across upgrades, so every timer service must re-arm timers after upgrade and recover safely after interrupted execution.

## Proposed registry extension

The current registry stores backend and country. The next contract revision should add:

```text
placement:
  club_id
  country
  residency_profile
  target_alias
  backend
  state
  version
```

Target metadata should be managed through a separate versioned registry or an operator-controlled configuration service. The placement registry should reject:

- A profile not allowed by country policy.
- A backend not allowed by the profile.
- A target whose verified region does not match the profile.
- A disabled or unhealthy target.
- A placement change without migration state and audit evidence.

The synthetic registry now exposes additive `Target` and `ResidencyAssignment` records. A target carries an alias, residency profile, backend reference, deployment class, enabled state, and version. A club assignment carries the selected profile and target alias and is accepted only when the target is enabled, its profile matches, and its backend matches the club placement. This is the first contract increment toward the full residency-aware placement model; country-to-profile policy and target health verification remain next.

Country profile allowlists and target health are now part of the synthetic contract. A residency assignment is rejected when its profile is not allowed for the club's country, its target is disabled, or its target is unhealthy. These checks are control-plane validation; actual subnet geography and provider-region verification still require operator evidence.

## Required external decisions

Before production deployment, obtain answers to:

1. Which exact Supabase regions and projects are approved for each country?
2. Are separate Supabase projects required for Auth, Storage, and Realtime residency?
3. Which public ICP subnets satisfy each jurisdiction's residency requirement?
4. Is Cloud Engine required for any country or secret class?
5. Where is SEV-SNP currently available, and is it available in each required region?
6. What are the Cloud Engine operational, backup, and recovery responsibilities?
7. Is a vetKeys proxy required, and where will it be deployed?
8. Where may the placement registry and audit records reside?
9. Which external services may receive regionally restricted data?
10. What is the canonical Internet Identity origin and custom-domain plan?

## Acceptance gate

The residency stage is complete only when each production country has:

- An approved residency profile.
- An approved Supabase target or an explicit ICP target decision.
- Verified Auth, Storage, Realtime, backup, and logging behavior.
- A documented secret-handling model.
- A subnet or Cloud Engine residency verification.
- A migration and rollback destination.
- An operator owner and audit policy.
