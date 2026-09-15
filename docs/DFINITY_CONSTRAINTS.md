# DFINITY Constraints to Carry Into the Hybrid Design

This note records implementation constraints supplied during the ICP migration discussion. It applies to the future production architecture; the current repository remains synthetic and does not contain secrets or production identities.

## Secrets

A canister is not a vault. Ordinary canister state is replicated to every node in the subnet. Encrypting a secret in canister memory does not by itself provide an operator-confidential secret boundary.

For each secret, classify it as:

- Public configuration.
- User data that may be replicated.
- Encrypted data where replica operators may still be in scope.
- A credential or signing secret that must never be in ordinary canister state.

Credentials, service keys, OAuth secrets, push credentials, payment keys, and third-party API tokens should remain in an external secret system or a specifically approved protected environment. If Cloud Engine is used for confidential processing, confirm that the selected engine creation uses SEV-SNP protected bare-metal capacity and that the needed region has that capacity. This must be reconciled with the residency policy and operational availability requirements.

vetKeys are not directly reachable from an engine canister when calls cross a subnet boundary with cycles. If vetKeys are selected, the design must include a separately deployed and funded proxy canister, its trust boundary, its residency, and its failure behavior.

### PII, child photos, and vault separation

PII encryption, child photo protection, and secret custody are separate
architecture concerns:

1. **Child Photos & Minor Privacy**: Photos and media depicting children must
   not be stored as cleartext on ordinary public subnets where replica node
   operators have unrestricted memory access. They must either be client-side
   encrypted using vetKeys (deriving decryption keys only for verified parents,
   guardians, and authorized coaches) or hosted in approved SEV-SNP protected
   hardware (Cloud Engine).
2. **vetKeys**: May provide an approved encryption or key-derivation capability
   for PII and child photos, but is not a general-purpose secret vault.
3. **Vault Credentials**: OAuth, push, payment, storage-signing, webhook,
   database, and third-party integration credentials remain in an external vault
   or approved protected-processing boundary. Raw vault secrets must never enter
   ordinary canister state, Candid arguments, frontend bundles, or the repository.

The PII and child safety design must separately specify data minimization,
guardian consent, purpose, retention, revocation, erasure, key rotation,
residency, audit behavior, and failure-closed behavior. See
[PII_VETKEYS_VAULT_ARCHITECTURE.md](PII_VETKEYS_VAULT_ARCHITECTURE.md).

## Edge Functions and external calls

Edge Functions that become canister methods are straightforward only when their dependencies are local. Any outbound call from a canister across its own subnet must be explicitly classified.

For every external dependency, record:

- Destination and subnet relationship.
- Whether the call is bounded-wait.
- Whether it carries cycles.
- Maximum request and response size.
- Runtime rejection behavior.
- Retry, timeout, idempotency, and compensation.
- Data-residency impact.

Cross-subnet calls from the relevant engine path must use bounded-wait and carry no cycles. This must be tested at runtime, because compilation and installation do not prove that the call will be accepted.

## Timers and scheduled work

Use in-canister timers for scheduled work that belongs on ICP. Persist the intended schedule and last-run/idempotency state in stable memory. Re-arm timers after every upgrade because timer registrations are transient. Every timer job needs:

- A durable schedule.
- An idempotency key.
- A bounded unit of work.
- Retry and backoff behavior.
- A post-upgrade re-arm path.
- Recovery behavior after an interrupted execution.

## Authentication origin

Internet Identity principals are origin-specific. The canonical authentication origin must be selected before production users are enrolled. The default canister origin and the eventual custom application domain must not be treated as interchangeable identities.

Use a stable application account ID with explicit mappings to authenticated principals and legacy Supabase identities. Existing Supabase UUIDs are application identifiers, not ICP caller principals. Account linking must require authentication to the existing account and the new origin, prevent duplicate links, support revocation, and be auditable.

## Required design gates

Before production ICP deployment, obtain explicit decisions for:

1. Secret classification and external secret storage.
2. Whether SEV-SNP Cloud Engine capacity is required.
3. Available protected hardware in each approved residency region.
4. Whether vetKeys are needed and, if so, the proxy-canister design.
5. Every external call's bounded-wait and no-cycles behavior.
6. Timer persistence and post-upgrade re-arming.
7. Canonical Internet Identity derivation origin and custom-domain plan.
8. Supabase UUID-to-account migration and linking flow.
9. PII field classification, vetKeys/proxy design, and external vault boundary.
