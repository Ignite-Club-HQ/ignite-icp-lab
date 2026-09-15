// Synthetic identity/access adapter. It is not an identity provider,
// principal verifier, production RLS implementation, or ICP canister.

const MAX_NAME_LENGTH = 120;
const roles = new Set(['app_admin', 'club_admin', 'team_admin', 'coach', 'player', 'member']);
const profileVisibilities = new Set(['public', 'members', 'private']);
const clone = value => structuredClone(value);

function fail(message) {
  throw new Error(message);
}

function requireText(value, field) {
  if (typeof value !== 'string' || !value.trim()) fail(`${field} required`);
  return value.trim();
}

function validateInput(input) {
  if (!input || typeof input !== 'object') fail('Identity fixture required');
  const accountId = requireText(input.accountId, 'Account ID');
  const principalText = requireText(input.principalText, 'Principal');
  if (input.displayName != null &&
      (typeof input.displayName !== 'string' || input.displayName.length > MAX_NAME_LENGTH)) {
    fail('Display name exceeds limit');
  }
  const assignments = (input.roles ?? []).map(role => {
    if (!role || !roles.has(role.role)) fail('Invalid identity role');
    return {
      role: role.role,
      clubId: role.clubId ?? null,
      teamId: role.teamId ?? null,
    };
  });
  const profileVisibility = input.profileVisibility ?? 'members';
  if (!profileVisibilities.has(profileVisibility)) fail('Invalid profile visibility');
  return {
    accountId,
    principalText,
    displayName: input.displayName?.trim() || 'Synthetic member',
    profileVisibility,
    roles: assignments,
  };
}

function indexBy(items, key) {
  const result = new Map();
  for (const item of items) {
    const value = item[key];
    if (!result.has(value)) result.set(value, []);
    result.get(value).push(item);
  }
  return result;
}

function createRegistry({ identities, children = [], exclusions = [], teamClubs = {} }) {
  const records = identities.map(validateInput);
  const byPrincipal = new Map();
  const byAccount = new Map();
  for (const record of records) {
    if (byPrincipal.has(record.principalText) || byAccount.has(record.accountId)) {
      fail('Duplicate identity');
    }
    byPrincipal.set(record.principalText, record);
    byAccount.set(record.accountId, record);
  }
  const childById = new Map();
  for (const child of children) {
    const id = requireText(child.childId, 'Child ID');
    if (childById.has(id)) fail('Duplicate child');
    childById.set(id, {
      childId: id,
      clubId: child.clubId ?? null,
      parentAccountId: child.parentAccountId ?? null,
    });
  }
  const exclusionKeys = new Set(exclusions.map(exclusion =>
    `${requireText(exclusion.accountId, 'Excluded account ID')}:${requireText(exclusion.clubId, 'Excluded club ID')}`));
  const teams = new Map(Object.entries(teamClubs));
  const guardiansByChild = indexBy(
    children.flatMap(child => (child.guardianAccountIds ?? []).map(accountId => ({
      childId: child.childId,
      guardianAccountId: accountId,
    }))),
    'childId',
  );
  return { byPrincipal, byAccount, childById, exclusionKeys, teams, guardiansByChild };
}

function requireCaller(registry, principalText) {
  if (typeof principalText !== 'string' || !principalText.trim()) {
    fail('Anonymous or unknown principal');
  }
  const principal = principalText.trim();
  const identity = registry.byPrincipal.get(principal);
  if (!identity) fail('Anonymous or unknown principal');
  return identity;
}

function relationshipFlags(registry, accountId, clubId) {
  let parentOfChild = false;
  let guardianOfChild = false;
  for (const child of registry.childById.values()) {
    const childClubId = child.clubId;
    if (childClubId && childClubId !== clubId) continue;
    if (child.parentAccountId === accountId) parentOfChild = true;
    if (registry.guardiansByChild.get(child.childId)?.some(link =>
      link.guardianAccountId === accountId)) guardianOfChild = true;
  }
  return { parentOfChild, guardianOfChild };
}

function accessFor(registry, identity, clubId) {
  const direct = identity.roles.some(role =>
    role.clubId === clubId && ['member', 'player', 'coach', 'team_admin', 'club_admin'].includes(role.role));
  const team = identity.roles.some(role =>
    role.teamId && registry.teams.get(role.teamId) === clubId);
  const { parentOfChild, guardianOfChild } = relationshipFlags(registry, identity.accountId, clubId);
  const isAppAdmin = identity.roles.some(role => role.role === 'app_admin');
  const isClubAdmin = isAppAdmin || identity.roles.some(role =>
    role.role === 'club_admin' && role.clubId === clubId);
  const excluded = registry.exclusionKeys.has(`${identity.accountId}:${clubId}`);
  // Admin authorization is deliberately independent from exclusion. An
  // excluded admin remains an admin, while exclusion removes membership
  // derived from ordinary club/team/family relationships.
  const isMember = !excluded && (direct || team || parentOfChild || guardianOfChild);
  return {
    accountId: identity.accountId,
    clubId,
    isAppAdmin,
    isClubAdmin,
    isAdmin: isAppAdmin || isClubAdmin,
    isMember,
    excluded,
    directClubRole: direct,
    teamRole: team,
    parentOfChild,
    guardianOfChild,
  };
}

function authorizationFor(registry, identity) {
  const clubIds = new Set();
  for (const role of identity.roles) {
    if (role.clubId) clubIds.add(role.clubId);
    if (role.teamId && registry.teams.has(role.teamId)) {
      clubIds.add(registry.teams.get(role.teamId));
    }
  }
  for (const child of registry.childById.values()) {
    if (child.clubId) clubIds.add(child.clubId);
  }
  for (const key of registry.exclusionKeys) clubIds.add(key.slice(key.indexOf(':') + 1));

  const decisions = [...clubIds].map(clubId => accessFor(registry, identity, clubId));
  return {
    accountId: identity.accountId,
    principalText: identity.principalText,
    appAdmin: decisions.some(decision => decision.isAppAdmin),
    adminClubIds: decisions
      .filter(decision => decision.isClubAdmin && !decision.isAppAdmin)
      .map(decision => decision.clubId),
    memberClubIds: decisions
      .filter(decision => decision.isMember)
      .map(decision => decision.clubId),
  };
}

export function createFixtureIdentityAccessService({
  identities = [],
  children = [],
  exclusions = [],
  teamClubs = {},
} = {}) {
  const registry = createRegistry({ identities, children, exclusions, teamClubs });
  return {
    async resolveAccount(principalText) {
      const identity = requireCaller(registry, principalText);
      return { accountId: identity.accountId, principalText: identity.principalText };
    },

    async resolveAuthorization(principalText) {
      return authorizationFor(registry, requireCaller(registry, principalText));
    },

    async getProfile(principalText, requestedAccountId) {
      const caller = requireCaller(registry, principalText);
      const requested = registry.byAccount.get(requireText(requestedAccountId, 'Account ID'));
      if (!requested) fail('Account not found');
      const isSelf = caller.accountId === requested.accountId;
      const callerMembership = [...new Set(
        caller.roles.filter(role => role.clubId).map(role => role.clubId),
      )].some(clubId => accessFor(registry, caller, clubId).isMember);
      if (!isSelf && requested.profileVisibility === 'private') fail('Not authorized');
      if (!isSelf && requested.profileVisibility === 'members' && !callerMembership) {
        fail('Not authorized');
      }
      return {
        accountId: requested.accountId,
        displayName: requested.displayName,
        profileVisibility: requested.profileVisibility,
      };
    },

    async getClubAccess(principalText, clubId) {
      return accessFor(registry, requireCaller(registry, principalText), requireText(clubId, 'Club ID'));
    },

    async canAccessChild(principalText, childId) {
      const identity = requireCaller(registry, principalText);
      const child = registry.childById.get(requireText(childId, 'Child ID'));
      if (!child) fail('Child not found');
      if (child.parentAccountId === identity.accountId) return true;
      return registry.guardiansByChild.get(child.childId)?.some(link =>
        link.guardianAccountId === identity.accountId) ?? false;
    },
  };
}

// Explicit selection only; there is no automatic Supabase fallback.
export function selectIdentityAccessService(mode, { fixture, icp } = {}) {
  if (mode === 'fixture' && fixture) return fixture;
  if (mode === 'icp' && icp) return icp;
  throw new Error('Local identity service is not configured. No fallback is permitted.');
}
