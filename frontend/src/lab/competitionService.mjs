// Synthetic, in-memory adapter. This is not production authorization or an ICP canister.
export const DEMO_ORGANIZER_CLUB_ID = '00000000-0000-4000-8000-000000000010';
export const DEMO_MEMBER_CLUB_ID = '00000000-0000-4000-8000-000000000011';

const MAX_PAGE_SIZE = 50;
const MAX_SNAPSHOT_ROWS = 1000;
const MAX_REQUEST_LEDGER_ROWS = 2000;
const MAX_NAME_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_SHORT_FIELD_LENGTH = 80;
const statuses = new Set(['draft', 'active', 'archived']);
const visibilities = new Set(['private', 'unlisted', 'public']);

const clone = value => structuredClone(value);

function fail(message) {
  throw new Error(message);
}

function requireActor(actor) {
  if (!actor?.accountId?.trim()) fail('Authenticated account required');
}

function isAdmin(actor, clubId) {
  return !!actor && (actor.appAdmin === true || actor.adminClubIds?.includes(clubId));
}

function isMember(actor, clubId) {
  return !!actor && (actor.memberClubIds?.includes(clubId) || isAdmin(actor, clubId));
}

function canRead(actor, row) {
  if (isAdmin(actor, row.organizerClubId)) return true;
  if (row.status === 'active' && row.visibility === 'public') return true;
  return row.status === 'active' && (row.visibility === 'unlisted' || isMember(actor, row.organizerClubId));
}

function canWrite(actor, row) {
  return isAdmin(actor, row.organizerClubId);
}

function validateText(value, field, maxLength, { nullable = false } = {}) {
  if (value == null && nullable) return null;
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    fail(`${field} must be 1–${maxLength} characters`);
  }
  return value.trim();
}

function validateOptionalText(value, field, maxLength) {
  if (value == null || (typeof value === 'string' && !value.trim())) return null;
  return validateText(value, field, maxLength);
}

function validateDraft(draft, { allowOrganizer = true } = {}) {
  if (!draft || typeof draft !== 'object') fail('Competition draft required');
  const name = validateText(draft.name, 'Name', MAX_NAME_LENGTH);
  if (allowOrganizer && (typeof draft.organizerClubId !== 'string' || !draft.organizerClubId.trim())) {
    fail('Organizer club required');
  }
  const description = validateOptionalText(draft.description, 'Description', MAX_DESCRIPTION_LENGTH);
  const sport = validateOptionalText(draft.sport, 'Sport', MAX_SHORT_FIELD_LENGTH);
  const season = validateOptionalText(draft.season, 'Season', MAX_SHORT_FIELD_LENGTH);
  const status = draft.status ?? 'draft';
  const visibility = draft.visibility ?? 'private';
  if (!statuses.has(status)) fail('Invalid competition status');
  if (!visibilities.has(visibility)) fail('Invalid competition visibility');
  return { name, description, sport, season, status, visibility };
}

function validatePatch(patch) {
  if (!patch || typeof patch !== 'object' || Object.keys(patch).length === 0) {
    fail('Competition patch required');
  }
  const next = {};
  if ('name' in patch) next.name = validateText(patch.name, 'Name', MAX_NAME_LENGTH);
  if ('description' in patch) next.description = validateOptionalText(patch.description, 'Description', MAX_DESCRIPTION_LENGTH);
  if ('sport' in patch) next.sport = validateOptionalText(patch.sport, 'Sport', MAX_SHORT_FIELD_LENGTH);
  if ('season' in patch) next.season = validateOptionalText(patch.season, 'Season', MAX_SHORT_FIELD_LENGTH);
  if ('status' in patch) {
    if (!statuses.has(patch.status)) fail('Invalid competition status');
    next.status = patch.status;
  }
  if ('visibility' in patch) {
    if (!visibilities.has(patch.visibility)) fail('Invalid competition visibility');
    next.visibility = patch.visibility;
  }
  return next;
}

function requestKey(accountId, requestId) {
  if (typeof requestId !== 'string' || !requestId.trim() || requestId.length > 120) {
    fail('Request ID required');
  }
  return `${accountId}:${requestId}`;
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
    fail('Invalid competition cursor');
  }
  return cursor.slice(6);
}

function snapshotRecord(input) {
  const normalized = validateDraft(input);
  if (typeof input.id !== 'string' || !input.id.trim()) fail('Snapshot competition ID required');
  if (typeof input.createdBy !== 'string' || !input.createdBy.trim()) fail('Snapshot creator required');
  if (!Number.isInteger(input.revision) || input.revision < 0) fail('Snapshot revision invalid');
  if (typeof input.createdAt !== 'string' || typeof input.updatedAt !== 'string') {
    fail('Snapshot timestamps required');
  }
  if (typeof input.organizerClubId !== 'string' || !input.organizerClubId.trim()) {
    fail('Snapshot organizer club required');
  }
  return {
    id: input.id,
    ...normalized,
    organizerClubId: input.organizerClubId,
    createdBy: input.createdBy,
    revision: input.revision,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

function canonical(value) {
  return JSON.stringify(value);
}

function validateSnapshot(input) {
  if (!input || input.schemaVersion !== 1) fail('Unsupported competition snapshot');
  if (!Number.isInteger(input.nextSequence) || input.nextSequence < 0) fail('Snapshot sequence invalid');
  if (!Array.isArray(input.competitions) || input.competitions.length > MAX_SNAPSHOT_ROWS) {
    fail('Snapshot competition limit exceeded');
  }
  if (!Array.isArray(input.requests) || input.requests.length > MAX_REQUEST_LEDGER_ROWS) {
    fail('Snapshot request limit exceeded');
  }
  const competitions = input.competitions.map(snapshotRecord);
  const ids = new Set();
  for (const row of competitions) {
    if (ids.has(row.id)) fail('Snapshot contains duplicate competition IDs');
    ids.add(row.id);
  }
  const requestKeys = new Set();
  const requests = input.requests.map(request => {
    if (!request || typeof request.key !== 'string' || !request.key.trim()) {
      fail('Snapshot request key required');
    }
    if (typeof request.fingerprint !== 'string' || !request.fingerprint.trim()) {
      fail('Snapshot request fingerprint required');
    }
    if (requestKeys.has(request.key)) fail('Snapshot contains duplicate request IDs');
    requestKeys.add(request.key);
    return {
      key: request.key,
      fingerprint: request.fingerprint,
      result: snapshotRecord(request.result),
    };
  });
  return { schemaVersion: 1, nextSequence: input.nextSequence, competitions, requests };
}

function sortedSnapshot(snapshot) {
  return {
    schemaVersion: 1,
    nextSequence: snapshot.nextSequence,
    competitions: [...snapshot.competitions].sort((a, b) => a.id.localeCompare(b.id)),
    requests: [...snapshot.requests].sort((a, b) => a.key.localeCompare(b.key)),
  };
}

export function createFixtureCompetitionService({ initial = [] } = {}) {
  const rows = new Map();
  const requests = new Map();
  let sequence = 0;

  for (const input of initial) {
    const normalized = validateDraft(input);
    const id = input.id ?? `competition-${++sequence}`;
    const timestamp = input.createdAt ?? new Date(0 + sequence * 1000).toISOString();
    rows.set(id, {
      id,
      ...normalized,
      organizerClubId: input.organizerClubId,
      createdBy: input.createdBy ?? 'fixture-seed',
      revision: input.revision ?? 0,
      createdAt: timestamp,
      updatedAt: input.updatedAt ?? timestamp,
    });
  }

  function getRow(id) {
    const row = rows.get(id);
    if (!row) fail('Competition not found');
    return row;
  }

  function rememberOrReplay(key, fingerprint, result) {
    const previous = requests.get(key);
    if (previous) {
      if (previous.fingerprint !== fingerprint) fail('Request ID was already used with different input');
      return clone(previous.result);
    }
    requests.set(key, { fingerprint, result: clone(result) });
    return clone(result);
  }

  return {
    async list(actor, options = {}) {
      const limit = options.limit ?? 20;
      if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) fail('Limit must be between 1 and 50');
      const cursorId = decodeCursor(options.cursor);
      const visible = ordered([...rows.values()].filter(row =>
        (!options.clubId || row.organizerClubId === options.clubId) && canRead(actor, row)));
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

    async create(actor, draft, requestId) {
      requireActor(actor);
      const normalized = validateDraft(draft);
      if (!isAdmin(actor, draft.organizerClubId)) fail('Not authorized');
      const key = requestKey(actor.accountId, requestId);
      const fingerprint = JSON.stringify({ operation: 'create', draft: normalized, organizerClubId: draft.organizerClubId });
      const prior = requests.get(key);
      if (prior) {
        if (prior.fingerprint !== fingerprint) fail('Request ID was already used with different input');
        return clone(prior.result);
      }
      const id = `competition-${++sequence}`;
      const timestamp = new Date(1_000_000 + sequence * 1000).toISOString();
      const row = {
        id,
        ...normalized,
        organizerClubId: draft.organizerClubId,
        createdBy: actor.accountId,
        revision: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      rows.set(id, row);
      return rememberOrReplay(key, fingerprint, row);
    },

    async update(actor, id, patch, expectedRevision, requestId) {
      requireActor(actor);
      const row = getRow(id);
      if (!canWrite(actor, row)) fail('Not authorized');
      if (!Number.isInteger(expectedRevision) || expectedRevision < 0) fail('Revision required');
      const normalizedPatch = validatePatch(patch);
      const key = requestKey(actor.accountId, requestId);
      const fingerprint = JSON.stringify({ operation: 'update', id, patch: normalizedPatch, expectedRevision });
      const prior = requests.get(key);
      if (prior) {
        if (prior.fingerprint !== fingerprint) fail('Request ID was already used with different input');
        return clone(prior.result);
      }
      if (row.revision !== expectedRevision) fail('Stale competition revision');
      Object.assign(row, normalizedPatch, { revision: row.revision + 1, updatedAt: new Date().toISOString() });
      return rememberOrReplay(key, fingerprint, row);
    },

    async exportSnapshot() {
      const snapshot = {
        schemaVersion: 1,
        nextSequence: sequence,
        competitions: [...rows.values()].map(clone),
        requests: [...requests.entries()].map(([key, value]) => ({
          key,
          fingerprint: value.fingerprint,
          result: clone(value.result),
        })),
      };
      return clone(sortedSnapshot(snapshot));
    },

    async importSnapshot(snapshot) {
      const validated = sortedSnapshot(validateSnapshot(snapshot));
      const nextRows = new Map(validated.competitions.map(row => [row.id, clone(row)]));
      const nextRequests = new Map(validated.requests.map(request => [
        request.key,
        { fingerprint: request.fingerprint, result: clone(request.result) },
      ]));
      // Commit only after every row and request has passed validation.
      rows.clear();
      for (const [id, row] of nextRows) rows.set(id, row);
      requests.clear();
      for (const [key, request] of nextRequests) requests.set(key, request);
      sequence = validated.nextSequence;
    },

    async reconcileSnapshot(snapshot) {
      const expected = sortedSnapshot(validateSnapshot(snapshot));
      const actual = await this.exportSnapshot();
      const actualRows = new Map(actual.competitions.map(row => [row.id, row]));
      const expectedRows = new Map(expected.competitions.map(row => [row.id, row]));
      const missingIds = expected.competitions
        .filter(row => !actualRows.has(row.id))
        .map(row => row.id);
      const unexpectedIds = actual.competitions
        .filter(row => !expectedRows.has(row.id))
        .map(row => row.id);
      const changedIds = expected.competitions
        .filter(row => actualRows.has(row.id) && canonical(actualRows.get(row.id)) !== canonical(row))
        .map(row => row.id);
      const requestLedgerEqual = canonical(actual.requests) === canonical(expected.requests);
      const sequenceEqual = actual.nextSequence === expected.nextSequence;
      return {
        equal: missingIds.length === 0 && unexpectedIds.length === 0 &&
          changedIds.length === 0 && requestLedgerEqual && sequenceEqual,
        missingIds,
        unexpectedIds,
        changedIds,
        requestLedgerEqual,
        sequenceEqual,
      };
    },
  };
}

// Selection is deliberately explicit. There is no Supabase fallback.
export function selectCompetitionService(mode, { fixture, icp } = {}) {
  if (mode === 'fixture' && fixture) return fixture;
  if (mode === 'icp' && icp) return icp;
  throw new Error('Local competition service is not configured. No fallback is permitted.');
}
