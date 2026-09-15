# Motoko notification queue comparison

This canister intentionally implements the same Candid contract as the Rust
`notification_queue` POC. It is a comparison target, not a replacement yet.

The data model uses enhanced persistent Motoko actor state and an explicit first
migration. The live comparison uses the same enqueue, claim, acknowledgement,
retry, and recovery probe as the Rust canister.
