// Local authenticated identity binding harness. It mirrors a generated
// Candid actor boundary while using the synthetic identity/access service.
// It is not a deployed identity canister and is outside the lab runtime.

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
export function createSyntheticAuthenticatedIdentityFactory({ service }) {
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
      return {
        async resolve_account() {
          try {
            return success(accountToWire(await service.resolveAccount(principalText)));
          } catch (error) {
            return failure(error);
          }
        },
        async resolve_authorization() {
          try {
            return success(authorizationToWire(
              await service.resolveAuthorization(principalText),
            ));
          } catch (error) {
            return failure(error);
          }
        },
        async get_profile(request) {
          try {
            return success(profileToWire(
              await service.getProfile(principalText, request.account_id),
            ));
          } catch (error) {
            return failure(error);
          }
        },
        async get_club_access(request) {
          try {
            return success(accessToWire(
              await service.getClubAccess(principalText, request.club_id),
            ));
          } catch (error) {
            return failure(error);
          }
        },
        async can_access_child(request) {
          try {
            return success(await service.canAccessChild(principalText, request.child_id));
          } catch (error) {
            return failure(error);
          }
        },
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
