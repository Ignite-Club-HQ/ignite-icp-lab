// Local authenticated binding harness. It mirrors generated Candid call
// shapes, but uses synthetic identity records and the in-memory adapter.
// It is not a deployed canister actor and is not in the active runtime.

import {
  createLocalActorTransport,
  LOCAL_ACTOR_CONFIGS,
} from './localActorTransport.mjs';

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
    club_id: row.clubId,
    name: row.name,
    lifecycle_status: row.lifecycleStatus,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function fromWire(row) {
  return {
    id: row.id,
    clubId: row.club_id,
    name: row.name,
    lifecycleStatus: row.lifecycle_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPage(page) {
  return {
    items: page.items.map(toWire),
    next_cursor: option(page.nextCursor),
  };
}

function success(value) {
  return { Ok: structuredClone(value) };
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
 * identity/access service and the read-only team directory service. Unlike
 * clubs, no membership/admin projection gates a team read once the caller
 * is authenticated -- but only a resolved, server-verified identity can
 * connect at all, so an anonymous caller never reaches the dispatch path.
 */
export function createSyntheticAuthenticatedTeamFactory({
  service,
  identityAccess,
  transportFactory = createLocalActorTransport,
}) {
  if (!service || !identityAccess ||
      typeof identityAccess.resolveAccount !== 'function' ||
      typeof identityAccess.resolveAuthorization !== 'function') {
    throw new Error('Authenticated team factory requires service and identity access');
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
      const transport = transportFactory({
        config: LOCAL_ACTOR_CONFIGS.team,
        dispatch: async ({ method, args }) => {
          try {
            switch (method) {
              case 'list_teams':
                return success(toPage(await service.list(serverActor, {
                  clubId: fromOption(args.club_id) ?? undefined,
                  cursor: fromOption(args.cursor) ?? undefined,
                  limit: args.limit,
                })));
              case 'get_team':
                return success(toWire(await service.get(serverActor, args.team_id)));
              default:
                throw new Error(`Unknown team actor method: ${method}`);
            }
          } catch (error) {
            return failure(error);
          }
        },
      });
      return {
        list_teams: request => transport.call('list_teams', request),
        get_team: request => transport.call('get_team', request),
      };
    },
  };
}

function unwrap(result) {
  if ('Err' in result) throw new Error(`Team canister error: ${result.Err}`);
  return result.Ok;
}

function assertBoundActor(actor, identity) {
  if (!actor || actor.accountId !== identity.accountId) {
    throw new Error('Authenticated team identity mismatch');
  }
}

/**
 * Adapt a bound authenticated actor to the provider-neutral service. The
 * actor is cached only within this identity-scoped instance.
 */
export function createAuthenticatedTeamService(factory, identity) {
  requireIdentity(identity);
  let actorPromise;
  const actor = () => actorPromise ??= factory.connect(identity);
  return {
    async list(caller, options = {}) {
      assertBoundActor(caller, identity);
      const result = unwrap(await (await actor()).list_teams({
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
      return fromWire(unwrap(await (await actor()).get_team({ team_id: id })));
    },
  };
}
