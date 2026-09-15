# Authorization and RLS Parity Record

This record is for the isolated synthetic lab. The Supabase sources under
`reference/backend` are inert evidence and were not executed. No production
RLS, credentials, users, or data were accessed.

## Source policy inventory

| Source rule family | Source evidence | Lab parity status |
| --- | --- | --- |
| Authenticated caller required | RLS policies use `TO authenticated`; helper methods reject anonymous callers | Implemented in `require_authenticated_user` |
| Club role membership | `has_role(... club_id ...)`, `is_club_member` | Implemented in `identities::member` and `require_club_member` |
| Club admin and app admin | `is_club_admin_for`, `has_role(... app_admin ...)` | Implemented in `identities::admin`, `require_club_admin`, and `require_app_admin` |
| Team membership by direct role | `is_team_member` in `20260504115905...sql.md` | Implemented in `identities::team_member` |
| Team membership by parent or guardian | `child_team_assignments` joined to `children` or `child_guardians` | Implemented in `identities::team_member` and tested |
| Club and team exclusions | `20260721114111...sql.md` exclusion clauses | Implemented at account/club scope and tested |
| Role-scoped operations | Policies and RPCs check `club_admin`, `team_admin`, `coach`, and global roles | Implemented by `require_role`; role vocabulary is bounded by ACL validation |
| Ownership and parent confirmation | `confirm_eoi_placement` checks parent identity or email | Synthetic child/guardian ownership is represented by `require_guardian`; EOI-specific workflow is not ported |
| Cross-club ownership | RPCs reject teams whose club differs from the source record | Club Links IDs are club-scoped; cross-club mutation is rejected by `scoped` |
| Profile privacy | `can_view_full_profile` permits self or app admin | Not part of the Club Links domain; must be implemented by a profile canister before that domain is enabled |
| Domain-specific policy gates | Messaging, event, media, billing, and subscription policies | Remain provider/domain work; no production domain is enabled by this lab |

## Implemented reusable checks

The Club Links canister now has fail-closed checks for:

- authenticated users;
- app administrators;
- club members;
- club administrators;
- team members, including direct roles and parent/guardian-derived membership;
- guardians for known children;
- named roles;
- club exclusions and linked-principal exclusion inheritance;
- club-scoped link ownership.

Every Club Links update method performs authorization inside the canister. The
frontend cannot grant itself a role or bypass a placement/provider boundary.

## Negative-case coverage

The backend tests cover anonymous callers, outsiders, excluded administrators,
excluded linked principals, unknown teams, cross-team access, non-guardians,
unknown children, revoked principals, expired challenges, stale identity
versions, and cross-club link IDs.

## Completion boundary

Step 7 is complete for the currently implemented Club Links ICP domain and its
shared authorization model. It is not a claim that every product domain has
been ported to ICP. Before enabling another domain, its source policies,
triggers, ownership rules, and negative cases must be added to this record and
tested at that domain's canister boundary.
