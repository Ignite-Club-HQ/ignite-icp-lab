// Local authenticated identity binding harness. It mirrors a generated
// Candid actor boundary while using the synthetic identity/access service.
// It is not a deployed identity canister and is outside the lab runtime.

import {
  createLocalActorTransport,
  LOCAL_ACTOR_CONFIGS,
} from './localActorTransport.mjs';

const clone = value => structuredClone(value);

function failure(error) {
  return { Err: error instanceof Error ? error.message : String(error) };
}

function success(value) {
  return { Ok: clone(value) };
}

function requireIdentity(identity) {
  if (!identity?.principalText?.trim() || !identity?.accountId?.trim()) {
    throw new Error('Authenticated principal and account required');
  }
}

function accountToWire(account) {
  return {
    account_id: account.accountId,
    principal_text: account.principalText,
  };
}

function authorizationToWire(authorization) {
  return {
    account_id: authorization.accountId,
    principal_text: authorization.principalText,
    app_admin: authorization.appAdmin,
    admin_club_ids: [...authorization.adminClubIds],
    member_club_ids: [...authorization.memberClubIds],
  };
}

function profileToWire(profile) {
  return {
    account_id: profile.accountId,
    display_name: profile.displayName,
    profile_visibility: profile.profileVisibility,
  };
}

function accessToWire(access) {
  return {
    account_id: access.accountId,
    club_id: access.clubId,
    is_app_admin: access.isAppAdmin,
    is_club_admin: access.isClubAdmin,
    is_admin: access.isAdmin,
    is_member: access.isMember,
    excluded: access.excluded,
    direct_club_role: access.directClubRole,
    team_role: access.teamRole,
    parent_of_child: access.parentOfChild,
    guardian_of_child: access.guardianOfChild,
  };
}

/**
 * The actor has an implicit authenticated principal. It asks the
 * provider-neutral service for all authority decisions; no role or account
 * argument is accepted from the caller.
 */
export function createSyntheticAuthenticatedIdentityFactory({
  service,
  transportFactory = createLocalActorTransport,
}) {
  if (!service ||
      typeof service.resolveAccount !== 'function' ||
      typeof service.resolveAuthorization !== 'function') {
    throw new Error('Identity binding requires provider-neutral identity access');
  }

  return {
    async connect(identity) {
      requireIdentity(identity);
      const account = await service.resolveAccount(identity.principalText);
      if (account.accountId !== identity.accountId) {
        throw new Error('Identity is not registered for this synthetic canister');
      }
      const principalText = account.principalText;
      const transport = transportFactory({
        config: LOCAL_ACTOR_CONFIGS.identity,
        dispatch: async ({ method, args }) => {
          try {
            switch (method) {
              case 'resolve_account':
                return success(accountToWire(await service.resolveAccount(principalText)));
              case 'resolve_authorization':
                return success(authorizationToWire(
                  await service.resolveAuthorization(principalText),
                ));
              case 'get_profile':
                return success(profileToWire(
                  await service.getProfile(principalText, args.account_id),
                ));
              case 'get_club_access':
                return success(accessToWire(
                  await service.getClubAccess(principalText, args.club_id),
                ));
              case 'can_access_child':
                return success(await service.canAccessChild(principalText, args.child_id));
              default:
                throw new Error(`Unknown identity actor method: ${method}`);
            }
          } catch (error) {
            return failure(error);
          }
        },
      });
      return {
        resolve_account: () => transport.call('resolve_account', null),
        resolve_authorization: () => transport.call('resolve_authorization', null),
        get_profile: request => transport.call('get_profile', request),
        get_club_access: request => transport.call('get_club_access', request),
        can_access_child: request => transport.call('can_access_child', request),
      };
    },
  };
}

function unwrap(result) {
  if ('Err' in result) throw new Error(`Identity canister error: ${result.Err}`);
  return result.Ok;
}

function requireBoundPrincipal(principalText, identity) {
  if (principalText !== identity.principalText) {
    throw new Error('Authenticated identity mismatch');
  }
}

function accountFromWire(account) {
  return {
    accountId: account.account_id,
    principalText: account.principal_text,
  };
}

function authorizationFromWire(authorization) {
  return {
    accountId: authorization.account_id,
    principalText: authorization.principal_text,
    appAdmin: authorization.app_admin,
    adminClubIds: authorization.admin_club_ids,
    memberClubIds: authorization.member_club_ids,
  };
}

function profileFromWire(profile) {
  return {
    accountId: profile.account_id,
    displayName: profile.display_name,
    profileVisibility: profile.profile_visibility,
  };
}

function accessFromWire(access) {
  return {
    accountId: access.account_id,
    clubId: access.club_id,
    isAppAdmin: access.is_app_admin,
    isClubAdmin: access.is_club_admin,
    isAdmin: access.is_admin,
    isMember: access.is_member,
    excluded: access.excluded,
    directClubRole: access.direct_club_role,
    teamRole: access.team_role,
    parentOfChild: access.parent_of_child,
    guardianOfChild: access.guardian_of_child,
  };
}

/**
 * Adapt one identity-bound actor to the provider-neutral identity service.
 * This instance is identity-scoped and must be discarded on identity change.
 */
export function createAuthenticatedIdentityAccessService(factory, identity) {
  requireIdentity(identity);
  let actorPromise;
  const actor = () => actorPromise ??= factory.connect(identity);
  return {
    async resolveAccount(principalText) {
      requireBoundPrincipal(principalText, identity);
      return accountFromWire(unwrap(await (await actor()).resolve_account()));
    },
    async resolveAuthorization(principalText) {
      requireBoundPrincipal(principalText, identity);
      return authorizationFromWire(unwrap(await (await actor()).resolve_authorization()));
    },
    async getProfile(principalText, requestedAccountId) {
      requireBoundPrincipal(principalText, identity);
      return profileFromWire(unwrap(await (await actor()).get_profile({
        account_id: requestedAccountId,
      })));
    },
    async getClubAccess(principalText, clubId) {
      requireBoundPrincipal(principalText, identity);
      return accessFromWire(unwrap(await (await actor()).get_club_access({
        club_id: clubId,
      })));
    },
    async canAccessChild(principalText, childId) {
      requireBoundPrincipal(principalText, identity);
      return unwrap(await (await actor()).can_access_child({ child_id: childId }));
    },
  };
}
