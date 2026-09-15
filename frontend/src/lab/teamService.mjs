// Synthetic, in-memory adapter. This is not production authorization or an ICP canister.
//
// Reproduces the single verified `public.teams` SELECT policy (see
// docs/PORTING_PLAN.md for the citation):
//   CREATE POLICY "Authenticated users can view teams" ON public.teams
//     FOR SELECT TO authenticated USING (true);
// Any authenticated caller may read any team, regardless of club membership.
// Anonymous callers (actor === null) are denied, matching `TO authenticated`.

const MAX_PAGE_SIZE = 50;
const MAX_NAME_LENGTH = 160;
const lifecycleStatuses = new Set(['draft', 'active', 'archived']);

const clone = value => structuredClone(value);

function fail(message) {
  throw new Error(message);
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
    fail('Invalid team cursor');
  }
  return cursor.slice(6);
}

function validateSeed(input, index) {
  if (!input || typeof input !== 'object') fail('Team seed required');
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > MAX_NAME_LENGTH) {
    fail('Team name must be 1–160 characters');
  }
  if (typeof input.clubId !== 'string' || !input.clubId.trim()) fail('Team club ID required');
  const lifecycleStatus = input.lifecycleStatus ?? 'active';
  if (!lifecycleStatuses.has(lifecycleStatus)) fail('Invalid team lifecycle status');
  const id = input.id ?? `team-${index + 1}`;
  const timestamp = input.createdAt ?? new Date(index * 1000).toISOString();
  return {
    id,
    clubId: input.clubId,
    name: input.name.trim(),
    lifecycleStatus,
    createdAt: timestamp,
    updatedAt: input.updatedAt ?? timestamp,
  };
}

export function createFixtureTeamService({ initial = [] } = {}) {
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
      const visible = ordered([...rows.values()].filter(row =>
        !options.clubId || row.clubId === options.clubId));
      const start = cursorId == null ? 0 : visible.findIndex(row => row.id === cursorId) + 1;
      if (cursorId != null && start === 0) fail('Cursor is not valid for this result set');
      const items = visible.slice(start, start + limit).map(clone);
      const last = visible[start + items.length - 1];
      return { items, nextCursor: last && start + items.length < visible.length ? encodeCursor(last.id) : null };
    },

    async get(actor, id) {
      if (!actor) fail('Not authorized');
      return clone(getRow(id));
    },
  };
}

export function selectTeamService(mode, { fixture, icp } = {}) {
  if (mode === 'fixture' && fixture) return fixture;
  if (mode === 'icp' && icp) return icp;
  throw new Error('Local team service is not configured. No fallback is permitted.');
}
