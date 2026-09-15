#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

cat <<'EOF'
=========================================
Ignite ICP Lab - Private Staging Runbook
=========================================

This script is intentionally scoped to PRIVATE STAGING only.
It does not deploy production credentials or expose secrets.
It assumes synthetic identities and synthetic data only.

Prereqs:
- Netlify CLI installed
- Node >= 22.12.0
- ICP staging network available locally or on a private network
- Synthetic worker principals already created for staging

Step 1: Validate repo guardrails
EOF

cargo test --workspace --locked
cd frontend
npm ci --no-fund --no-audit
npm run check:isolation
npm run check:prod-secrets
npm run deploy:staging
npm run build

cat <<'EOF'

Step 2: Register synthetic worker identities in the private staging ICP network

The scopes below are the only allowed ones:
- send-email-notification
- send-push-notification
- write-audit-log
- payment-processor

Replace the placeholders below with staging principals before running.
EOF

cat <<'EOF'
# Example commands only; replace the placeholder principals before execution.
# icp canister call secret_workload_identity initialize
# icp canister call secret_workload_identity register_workload '(principal "<EMAIL_WORKER_PRINCIPAL>", "ignite-email-worker", vec{"send-email-notification"})'
# icp canister call secret_workload_identity register_workload '(principal "<PUSH_WORKER_PRINCIPAL>", "ignite-push-worker", vec{"send-push-notification"})'
# icp canister call secret_workload_identity register_workload '(principal "<AUDIT_WORKER_PRINCIPAL>", "ignite-audit-worker", vec{"write-audit-log"})'
# icp canister call secret_workload_identity register_workload '(principal "<PAYMENT_WORKER_PRINCIPAL>", "ignite-payment-worker", vec{"payment-processor"})'
# icp canister call secret_workload_identity verify_secret_access '(principal "<EMAIL_WORKER_PRINCIPAL>", "send-email-notification", "staging-email-check")'
# icp canister call secret_workload_identity verify_secret_access '(principal "<PUSH_WORKER_PRINCIPAL>", "send-push-notification", "staging-push-check")'
# icp canister call secret_workload_identity verify_secret_access '(principal "<PUSH_WORKER_PRINCIPAL>", "payment-processor", "staging-bad-scope-check")'
EOF

cat <<'EOF'

Step 3: Deploy frontend to Netlify staging
EOF

netlify deploy --prod --dir=dist

cat <<'EOF'

Step 4: Smoke tests against the staging environment
EOF

npx vitest run \
  lab-tests/external-worker-boundary.test.tsx \
  lab-tests/secret-workload-client.test.tsx \
  lab-tests/external-worker-coordinator.test.tsx \
  lab-tests/external-worker-integration.test.tsx \
  lab-tests/external-worker-provider-registry.test.tsx \
  lab-tests/phase-3-queue-production.test.tsx

cat <<'EOF'

READY FOR PRIVATE STAGING ONLY
- no real user data
- no production secrets
- no production providers
- only synthetic worker identities and synthetic payloads

If the checks fail, do not deploy.
EOF
