import type {
  IdentityAccessDecision,
  IdentityAccessService,
  IdentityAccount,
  SyntheticProfile,
} from "./IdentityAccessService";

export type IdentityDomainResult<T> = { Ok: T } | { Err: string };

export interface IdentityAccountWire {
  account_id: string;
  principal_text: string;
}

export interface IdentityAuthorizationWire {
  account_id: string;
  principal_text: string;
  app_admin: boolean;
  admin_club_ids: string[];
  member_club_ids: string[];
}

export interface IdentityProfileWire {
  account_id: string;
  display_name: string;
  profile_visibility: string;
}

export interface IdentityAccessWire {
  account_id: string;
  club_id: string;
  is_app_admin: boolean;
  is_club_admin: boolean;
  is_admin: boolean;
  is_member: boolean;
  excluded: boolean;
  direct_club_role: boolean;
  team_role: boolean;
  parent_of_child: boolean;
  guardian_of_child: boolean;
}

/**
 * Candid-shaped identity actor. The caller principal is implicit in actor
 * creation; requests never contain a client-supplied user ID or role.
 */
export interface IdentityAccessActor {
  resolve_account(): Promise<IdentityDomainResult<IdentityAccountWire>>;
  resolve_authorization(): Promise<IdentityDomainResult<IdentityAuthorizationWire>>;
  get_profile(
    request: { account_id: string },
  ): Promise<IdentityDomainResult<IdentityProfileWire>>;
  get_club_access(
    request: { club_id: string },
  ): Promise<IdentityDomainResult<IdentityAccessWire>>;
  can_access_child(
    request: { child_id: string },
  ): Promise<IdentityDomainResult<boolean>>;
}

export interface IdentityAccessActorFactory {
  connect(identity: { principalText: string; accountId: string }): Promise<IdentityAccessActor>;
}

export interface BoundIdentityAccessService extends IdentityAccessService {
  resolveAuthorization(principalText: string): Promise<{
    accountId: string;
    principalText: string;
    appAdmin: boolean;
    adminClubIds: readonly string[];
    memberClubIds: readonly string[];
  }>;
}

export type IdentityBindingDomainTypes = {
  account: IdentityAccount;
  profile: SyntheticProfile;
  access: IdentityAccessDecision;
};
