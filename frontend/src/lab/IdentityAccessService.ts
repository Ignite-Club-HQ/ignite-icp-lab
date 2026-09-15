export type IdentityRole =
  | "app_admin"
  | "club_admin"
  | "team_admin"
  | "coach"
  | "player"
  | "member";

export interface IdentityAccount {
  accountId: string;
  principalText: string;
}

export interface IdentityAuthorization {
  accountId: string;
  principalText: string;
  appAdmin: boolean;
  adminClubIds: readonly string[];
  memberClubIds: readonly string[];
}

export interface SyntheticProfile {
  accountId: string;
  displayName: string;
  profileVisibility: "public" | "members" | "private";
}

export interface IdentityAccessDecision {
  accountId: string;
  clubId: string;
  isAppAdmin: boolean;
  isClubAdmin: boolean;
  isAdmin: boolean;
  isMember: boolean;
  excluded: boolean;
  directClubRole: boolean;
  teamRole: boolean;
  parentOfChild: boolean;
  guardianOfChild: boolean;
}

/**
 * Provider-neutral identity/access seam. Principals identify authenticated
 * callers; stable account IDs remain separate domain identifiers. The
 * implementation must resolve roles and relationships server-side.
 */
export interface IdentityAccessService {
  resolveAccount(principalText: string): Promise<IdentityAccount>;
  resolveAuthorization(principalText: string): Promise<IdentityAuthorization>;
  getProfile(
    principalText: string,
    requestedAccountId: string,
  ): Promise<SyntheticProfile>;
  getClubAccess(
    principalText: string,
    clubId: string,
  ): Promise<IdentityAccessDecision>;
  canAccessChild(principalText: string, childId: string): Promise<boolean>;
}
