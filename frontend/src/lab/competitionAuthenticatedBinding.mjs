// Local authenticated binding harness. It mirrors generated Candid call
// shapes, but uses synthetic identity records and the in-memory adapter.
// It is not a deployed canister actor and is not in the active runtime.

import {
  createLocalActorTransport,
  LOCAL_ACTOR_CONFIGS,
} from './localActorTransport.mjs';

const clone = value => structuredClone(value);

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function option(value) {
  return value == null ? [] : [value];
}

function fromOption(value) {
  return value.length === 0 ? null : value[0];
}

function toWire(row) {
  return {
    id: row.id,
    name: row.name,
    description: option(row.description),
    organizer_club_id: row.organizerClubId,
    created_by: row.createdBy,
    sport: option(row.sport),
    season: option(row.season),
    status: row.status,
    visibility: row.visibility,
    revision: row.revision,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function toPage(page) {
  return {
    items: page.items.map(toWire),
    next_cursor: option(page.nextCursor),
  };
}

function snapshotToWire(snapshot) {
  return {
    schema_version: snapshot.schemaVersion,
    next_sequence: snapshot.nextSequence,
    competitions: snapshot.competitions.map(toWire),
    requests: snapshot.requests.map(request => ({
      key: request.key,
      fingerprint: request.fingerprint,
      result: toWire(request.result),
    })),
  };
}

function reconciliationToWire(reconciliation) {
  return {
    equal: reconciliation.equal,
    missing_ids: [...reconciliation.missingIds],
    unexpected_ids: [...reconciliation.unexpectedIds],
    changed_ids: [...reconciliation.changedIds],
    request_ledger_equal: reconciliation.requestLedgerEqual,
    sequence_equal: reconciliation.sequenceEqual,
  };
}

function fromCreate(request) {
  return {
    name: request.name,
    description: fromOption(request.description),
    organizerClubId: request.organizer_club_id,
    sport: fromOption(request.sport),
    season: fromOption(request.season),
    status: request.status,
    visibility: request.visibility,
  };
}

function fromPatch(patch) {
  const result = {};
  for (const [wireKey, domainKey] of [
    ['name', 'name'],
    ['description', 'description'],
    ['sport', 'sport'],
    ['season', 'season'],
    ['status', 'status'],
    ['visibility', 'visibility'],
  ]) {
    if (patch[wireKey].length > 0) result[domainKey] = patch[wireKey][0];
  }
  return result;
}

function success(value) {
  return { Ok: clone(value) };
}

function failure(error) {
  return { Err: errorMessage(error) };
}

function requireIdentity(identity) {
  if (!identity?.principalText?.trim() || !identity?.accountId?.trim()) {
    throw new Error('Authenticated principal and account required');
  }
}

/**
 * Build a synthetic authenticated actor factory backed by the provider-neutral
 * identity/access service. The caller supplies only a principal and account
 * ID; roles and memberships are resolved there, not trusted from frontend
 * input.
 */
export function createSyntheticAuthenticatedCompetitionFactory({
  service,
  identityAccess,
  transportFactory = createLocalActorTransport,
}) {
  if (!service || !identityAccess ||
      typeof identityAccess.resolveAccount !== 'function' ||
      typeof identityAccess.resolveAuthorization !== 'function') {
    throw new Error('Authenticated competition factory requires service and identity access');
  }

  return {
    async connect(identity) {
      requireIdentity(identity);
      const account = await identityAccess.resolveAccount(identity.principalText);
      if (account.accountId !== identity.accountId) {
        throw new Error('Identity is not registered for this synthetic canister');
      }
      const serverActor = await identityAccess.resolveAuthorization(identity.principalText);
      if (serverActor.accountId !== identity.accountId ||
          serverActor.principalText !== identity.principalText) {
        throw new Error('Identity authorization mismatch');
      }
      const requireDurableService = () => {
        if (typeof service.exportSnapshot !== 'function' ||
            typeof service.importSnapshot !== 'function' ||
            typeof service.reconcileSnapshot !== 'function') {
          throw new Error('Competition service does not support durability operations');
        }
      };
      const transport = transportFactory({
        config: LOCAL_ACTOR_CONFIGS.competition,
        dispatch: async ({ method, args }) => {
          try {
            switch (method) {
              case 'list_competitions':
                return success(toPage(await service.list(serverActor, {
                  clubId: fromOption(args.club_id) ?? undefined,
                  cursor: fromOption(args.cursor) ?? undefined,
                  limit: args.limit,
                })));
              case 'get_competition':
                return success(toWire(await service.get(serverActor, args.competition_id)));
              case 'create_competition':
                return success(toWire(await service.create(
                  serverActor,
                  fromCreate(args),
                  args.request_id,
                )));
              case 'update_competition':
                return success(toWire(await service.update(
                  serverActor,
                  args.competition_id,
                  fromPatch(args.patch),
                  args.expected_revision,
                  args.request_id,
                )));
              case 'export_snapshot':
                requireDurableService();
                return success(snapshotToWire(await service.exportSnapshot(serverActor)));
              case 'import_snapshot':
                requireDurableService();
                await service.importSnapshot(serverActor, fromSnapshotWire(args.snapshot));
                return success(null);
              case 'reconcile_snapshot':
                requireDurableService();
                return success(reconciliationToWire(
                  await service.reconcileSnapshot(serverActor, fromSnapshotWire(args.snapshot)),
                ));
              default:
                throw new Error(`Unknown competition actor method: ${method}`);
            }
          } catch (error) {
            return failure(error);
          }
        },
      });
      return {
        list_competitions: request => transport.call('list_competitions', request),
        get_competition: request => transport.call('get_competition', request),
        create_competition: request => transport.call('create_competition', request),
        update_competition: request => transport.call('update_competition', request),
        export_snapshot: () => transport.call('export_snapshot', {}),
        import_snapshot: request => transport.call('import_snapshot', request),
        reconcile_snapshot: request => transport.call('reconcile_snapshot', request),
      };
    },
  };
}

function unwrap(result) {
  if ('Err' in result) throw new Error(`Competition canister error: ${result.Err}`);
  return result.Ok;
}

function fromWire(row) {
  return {
    id: row.id,
    name: row.name,
    description: fromOption(row.description),
    organizerClubId: row.organizer_club_id,
    createdBy: row.created_by,
    sport: fromOption(row.sport),
    season: fromOption(row.season),
    status: row.status,
    visibility: row.visibility,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromSnapshotWire(wire) {
  return {
    schemaVersion: wire.schema_version,
    nextSequence: wire.next_sequence,
    competitions: wire.competitions.map(fromWire),
    requests: wire.requests.map(request => ({
      key: request.key,
      fingerprint: request.fingerprint,
      result: fromWire(request.result),
    })),
  };
}

function reconciliationFromWire(wire) {
  return {
    equal: wire.equal,
    missingIds: wire.missing_ids,
    unexpectedIds: wire.unexpected_ids,
    changedIds: wire.changed_ids,
    requestLedgerEqual: wire.request_ledger_equal,
    sequenceEqual: wire.sequence_equal,
  };
}

function assertBoundActor(actor, identity) {
  if (!actor || actor.accountId !== identity.accountId) {
    throw new Error('Authenticated competition identity mismatch');
  }
}

function toCreateRequest(draft, requestId) {
  return {
    request_id: requestId,
    name: draft.name,
    description: option(draft.description),
    organizer_club_id: draft.organizerClubId,
    sport: option(draft.sport),
    season: option(draft.season),
    status: draft.status ?? 'draft',
    visibility: draft.visibility ?? 'private',
  };
}

function toPatchRequest(id, patch, expectedRevision, requestId) {
  const field = name => Object.hasOwn(patch, name) ? option(patch[name]) : [];
  return {
    competition_id: id,
    request_id: requestId,
    expected_revision: expectedRevision,
    patch: {
      name: field('name'),
      description: field('description'),
      sport: field('sport'),
      season: field('season'),
      status: field('status'),
      visibility: field('visibility'),
    },
  };
}

/**
 * Adapt a bound authenticated actor to the provider-neutral service. The
 * actor is cached only within this identity-scoped instance.
 */
export function createAuthenticatedCompetitionService(factory, identity) {
  requireIdentity(identity);
  let actorPromise;
  const actor = () => actorPromise ??= factory.connect(identity);
  return {
    async list(caller, options = {}) {
      assertBoundActor(caller, identity);
      const result = unwrap(await (await actor()).list_competitions({
        club_id: option(options.clubId),
        cursor: option(options.cursor),
        limit: options.limit ?? 20,
      }));
      return {
        items: result.items.map(fromWire),
        nextCursor: fromOption(result.next_cursor),
      };
    },
    async get(caller, id) {
      assertBoundActor(caller, identity);
      return fromWire(unwrap(await (await actor()).get_competition({ competition_id: id })));
    },
    async create(caller, draft, requestId) {
      assertBoundActor(caller, identity);
      return fromWire(unwrap(await (await actor()).create_competition(toCreateRequest(draft, requestId))));
    },
    async update(caller, id, patch, expectedRevision, requestId) {
      assertBoundActor(caller, identity);
      return fromWire(unwrap(await (await actor()).update_competition(
        toPatchRequest(id, patch, expectedRevision, requestId),
      )));
    },
    async exportSnapshot(caller) {
      assertBoundActor(caller, identity);
      return fromSnapshotWire(unwrap(await (await actor()).export_snapshot()));
    },
    async importSnapshot(caller, snapshot) {
      assertBoundActor(caller, identity);
      unwrap(await (await actor()).import_snapshot({ snapshot: snapshotToWire(snapshot) }));
    },
    async reconcileSnapshot(caller, snapshot) {
      assertBoundActor(caller, identity);
      return reconciliationFromWire(unwrap(await (await actor()).reconcile_snapshot({
        snapshot: snapshotToWire(snapshot),
      })));
    },
  };
}
