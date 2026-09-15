// Synthetic, in-memory adapter. This is not production authorization or an ICP canister.
//
// Reproduces the union of three verified `public.clubs` SELECT policies (see
// docs/PORTING_PLAN.md for citations); Postgres RLS unions every matching
// permissive policy, so a caller is visible if ANY branch matches:
//   - "Club members can view their clubs": is_club_member(uid, id) OR app_admin
//   - "Authenticated users can view clubs for discovery": auth.uid() IS NOT NULL
//     AND listed_on_marketplace = true
//   - "Creators can view their clubs": created_by = auth.uid()
// Anonymous callers (actor === null) are denied entirely, matching the
// source's `auth.uid() IS NOT NULL`/`TO authenticated` requirement on all
// three policies.

const MAX_PAGE_SIZE = 50;
const MAX_NAME_LENGTH = 160;

const clone = value => structuredClone(value);

function fail(message) {
  throw new Error(message);
}

function isAppAdmin(actor) {
  return !!actor && actor.appAdmin === true;
}

function isMember(actor, clubId) {
  return !!actor && !!actor.memberClubIds?.includes(clubId);
}

function canRead(actor, row) {
  if (!actor) return false;
  if (isAppAdmin(actor)) return true;
  if (isMember(actor, row.id)) return true;
  if (row.createdBy === actor.accountId) return true;
  return row.listedOnMarketplace === true;
}

function ordered(rows) {
  return [...rows].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}

function encodeCursor(id) {
  return `after:${id}`;
}

function decodeCursor(cursor) {
  if (cursor == null) return null;
  if (typeof cursor !== 'string' || !cursor.startsWith('after:') || cursor.length <= 6) {
    fail('Invalid club cursor');
  }
  return cursor.slice(6);
}

function validateSeed(input, index) {
  if (!input || typeof input !== 'object') fail('Club seed required');
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > MAX_NAME_LENGTH) {
    fail('Club name must be 1–160 characters');
  }
  if (typeof input.createdBy !== 'string' || !input.createdBy.trim()) {
    fail('Club creator account ID required');
  }
  const id = input.id ?? `club-${index + 1}`;
  const timestamp = input.createdAt ?? new Date(index * 1000).toISOString();
  return {
    id,
    name: input.name.trim(),
    listedOnMarketplace: input.listedOnMarketplace === true,
    createdBy: input.createdBy,
    createdAt: timestamp,
    updatedAt: input.updatedAt ?? timestamp,
  };
}

export function createFixtureClubService({ initial = [] } = {}) {
  const rows = new Map();
  initial.forEach((input, index) => {
    const row = validateSeed(input, index);
    rows.set(row.id, row);
  });

  function getRow(id) {
    const row = rows.get(id);
    if (!row) fail('Not authorized');
    return row;
  }

  return {
    async list(actor, options = {}) {
      const limit = options.limit ?? 20;
      if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) fail('Limit must be between 1 and 50');
      if (!actor) return { items: [], nextCursor: null };
      const cursorId = decodeCursor(options.cursor);
      const visible = ordered([...rows.values()].filter(row => canRead(actor, row)));
      const start = cursorId == null ? 0 : visible.findIndex(row => row.id === cursorId) + 1;
      if (cursorId != null && start === 0) fail('Cursor is not valid for this result set');
      const items = visible.slice(start, start + limit).map(clone);
      const last = visible[start + items.length - 1];
      return { items, nextCursor: last && start + items.length < visible.length ? encodeCursor(last.id) : null };
    },

    async get(actor, id) {
      const row = getRow(id);
      if (!canRead(actor, row)) fail('Not authorized');
      return clone(row);
    },
  };
}

export function selectClubService(mode, { fixture, icp } = {}) {
  if (mode === 'fixture' && fixture) return fixture;
  if (mode === 'icp' && icp) return icp;
  throw new Error('Local club service is not configured. No fallback is permitted.');
}
