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
    name: row.name,
    listed_on_marketplace: row.listedOnMarketplace,
    created_by: row.createdBy,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function fromWire(row) {
  return {
    id: row.id,
    name: row.name,
    listedOnMarketplace: row.listed_on_marketplace,
    createdBy: row.created_by,
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
 * identity/access service and the read-only club directory service. The
 * caller supplies only a principal and account ID; membership/admin status
 * is resolved server-side, never trusted from request input.
 */
export function createSyntheticAuthenticatedClubFactory({
  service,
  identityAccess,
  transportFactory = createLocalActorTransport,
}) {
  if (!service || !identityAccess ||
      typeof identityAccess.resolveAccount !== 'function' ||
      typeof identityAccess.resolveAuthorization !== 'function') {
    throw new Error('Authenticated club factory requires service and identity access');
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
        config: LOCAL_ACTOR_CONFIGS.club,
        dispatch: async ({ method, args }) => {
          try {
            switch (method) {
              case 'list_clubs':
                return success(toPage(await service.list(serverActor, {
                  cursor: fromOption(args.cursor) ?? undefined,
                  limit: args.limit,
                })));
              case 'get_club':
                return success(toWire(await service.get(serverActor, args.club_id)));
              default:
                throw new Error(`Unknown club actor method: ${method}`);
            }
          } catch (error) {
            return failure(error);
          }
        },
      });
      return {
        list_clubs: request => transport.call('list_clubs', request),
        get_club: request => transport.call('get_club', request),
      };
    },
  };
}

function unwrap(result) {
  if ('Err' in result) throw new Error(`Club canister error: ${result.Err}`);
  return result.Ok;
}

function assertBoundActor(actor, identity) {
  if (!actor || actor.accountId !== identity.accountId) {
    throw new Error('Authenticated club identity mismatch');
  }
}

/**
 * Adapt a bound authenticated actor to the provider-neutral service. The
 * actor is cached only within this identity-scoped instance.
 */
export function createAuthenticatedClubService(factory, identity) {
  requireIdentity(identity);
  let actorPromise;
  const actor = () => actorPromise ??= factory.connect(identity);
  return {
    async list(caller, options = {}) {
      assertBoundActor(caller, identity);
      const result = unwrap(await (await actor()).list_clubs({
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
      return fromWire(unwrap(await (await actor()).get_club({ club_id: id })));
    },
  };
}
