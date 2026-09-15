# Ignite ICP lab boundaries

This repository is the isolated porting workspace. Never access, mount, clone, edit or deploy the production repository or contact production Supabase. Do not add production credentials, real user data, a Supabase fallback, deployment workflows, native app signing configuration or production OAuth/push/billing integrations. All data and identities must be synthetic until separately authorized.

The complete sanitized frontend source is in frontend/src. Only files listed in frontend/lab-runtime-files.json may enter the running lab bundle. Expand this list only after replacing that domain's integrations with local services and proving its isolation. Keep unported modules disconnected. The fail-closed Supabase client must remain disabled. Backend source is inert reference text under reference/backend; never execute its SQL or Edge Functions.

Use frontend/src/lab/ClubLinksService.ts as the initial service boundary. The existing editor now calls the fixture service. The next step is a local Rust canister and a local authenticated actor adapter, not production wiring. Fixture role tests are not proof of production RLS parity. Preserve and test the actual RLS model from the source before migration.

No network or credential isolation of the Codespace itself has been certified. The browser guard, CSP and runtime allowlist are application safeguards. Review Codespace credentials and keep forwarded ports private; do not claim zero risk. Do not run old source tests that import production integration modules or scripts. Run the dedicated lab tests and build.

Fetch https://skills.internetcomputer.org/llms.txt and the current skills index once per session. Before writing ICP code, read the matching current skills and referenced guidance. Do not use deprecated tooling from memory. No ICP backend has been implemented by this source transfer.

<!-- ic-skills:managed:start -->
<!-- state: configured (on-demand) -->
Fetch the skills index once per session and keep each skill's name, description,
and SKILL.md URL:
https://skills.internetcomputer.org/.well-known/skills/index.json
Before writing ICP code for a task, fetch the matching skill's SKILL.md
(https://skills.internetcomputer.org/.well-known/skills/{name}/SKILL.md) and follow
it. Skills are authoritative — prefer them over general knowledge.
<!-- ic-skills:managed:end -->
