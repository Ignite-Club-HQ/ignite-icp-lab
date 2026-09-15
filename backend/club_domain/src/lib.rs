use candid::Principal;

const MAX_FIELD_BYTES: usize = 128;

fn valid_field(value: &str) -> bool {
    !value.trim().is_empty() && value.len() <= MAX_FIELD_BYTES
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Club {
    pub id: String,
    pub name: String,
    pub owner: Principal,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RoleGrant {
    pub account: Principal,
    pub role: String,
    pub club: String,
    pub team: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Team {
    pub id: String,
    pub club: String,
    pub name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ClubDomain {
    governor: Principal,
    clubs: Vec<Club>,
    teams: Vec<Team>,
    roles: Vec<RoleGrant>,
}

impl ClubDomain {
    pub fn new(governor: Principal) -> Self {
        Self {
            governor,
            clubs: vec![],
            teams: vec![],
            roles: vec![],
        }
    }

    pub fn create_club(
        &mut self,
        actor: Principal,
        club_id: &str,
        name: &str,
    ) -> Result<Club, String> {
        if actor == Principal::anonymous() {
            return Err("Authenticated user required".into());
        }
        if self.governor != actor {
            return Err("Club governor required".into());
        }
        if !valid_field(club_id) || !valid_field(name) {
            return Err("Invalid club fields".into());
        }
        if self.clubs.iter().any(|club| club.id == club_id) {
            return Err("Club already exists".into());
        }
        let club = Club {
            id: club_id.to_string(),
            name: name.to_string(),
            owner: actor,
        };
        self.clubs.push(club.clone());
        Ok(club)
    }

    pub fn create_team(
        &mut self,
        actor: Principal,
        team_id: &str,
        club_id: &str,
        name: &str,
    ) -> Result<Team, String> {
        if actor == Principal::anonymous() {
            return Err("Authenticated user required".into());
        }
        if !self.can_manage_club(actor, club_id) {
            return Err("Club admin required".into());
        }
        if !self.clubs.iter().any(|club| club.id == club_id) {
            return Err("Unknown club".into());
        }
        if !valid_field(team_id) || !valid_field(name) {
            return Err("Invalid team fields".into());
        }
        if self.teams.iter().any(|team| team.id == team_id) {
            return Err("Team already exists".into());
        }
        let team = Team {
            id: team_id.to_string(),
            club: club_id.to_string(),
            name: name.to_string(),
        };
        self.teams.push(team.clone());
        Ok(team)
    }

    pub fn grant_role(
        &mut self,
        actor: Principal,
        account: Principal,
        role: &str,
        club_id: &str,
        team_id: Option<&str>,
    ) -> Result<(), String> {
        if actor == Principal::anonymous() {
            return Err("Authenticated user required".into());
        }
        if !self.can_manage_club(actor, club_id) {
            return Err("Club admin required".into());
        }
        if account == Principal::anonymous()
            || !valid_field(role)
            || !valid_field(club_id)
            || team_id.is_some_and(|id| !valid_field(id))
        {
            return Err("Invalid role grant".into());
        }
        if !self.clubs.iter().any(|club| club.id == club_id) {
            return Err("Unknown club".into());
        }
        if team_id.is_some_and(|id| {
            !self
                .teams
                .iter()
                .any(|team| team.id == id && team.club == club_id)
        }) {
            return Err("Team does not belong to club".into());
        }
        if self.roles.iter().any(|grant| {
            grant.account == account
                && grant.role == role
                && grant.club == club_id
                && grant.team.as_deref() == team_id
        }) {
            return Err("Duplicate role".into());
        }
        self.roles.push(RoleGrant {
            account,
            role: role.to_string(),
            club: club_id.to_string(),
            team: team_id.map(str::to_string),
        });
        Ok(())
    }

    pub fn can_manage_club(&self, actor: Principal, club_id: &str) -> bool {
        if actor == Principal::anonymous() {
            return false;
        }
        if self.governor == actor {
            return true;
        }
        self.roles.iter().any(|grant| {
            grant.account == actor
                && grant.club == club_id
                && grant.role == "club_admin"
        })
    }

    pub fn can_view_club(&self, actor: Principal, club_id: &str) -> bool {
        if actor == Principal::anonymous() {
            return false;
        }
        self.clubs
            .iter()
            .any(|club| club.id == club_id && club.owner == actor)
            || self.can_manage_club(actor, club_id)
            || self.roles.iter().any(|grant| {
                grant.account == actor && grant.club == club_id
            })
    }

    pub fn can_view_team(&self, actor: Principal, team_id: &str) -> bool {
        if actor == Principal::anonymous() {
            return false;
        }
        let Some(team) = self.teams.iter().find(|team| team.id == team_id) else {
            return false;
        };
        self.can_manage_club(actor, &team.club)
            || self.roles.iter().any(|grant| {
                grant.account == actor
                    && grant.club == team.club
                    && grant.team.as_deref() == Some(team_id)
            })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn governor_can_create_and_manage_club() {
        let mut domain = ClubDomain::new(Principal::from_slice(&[1u8; 29]));
        let actor = Principal::from_slice(&[2u8; 29]);
        let club = domain
            .create_club(Principal::from_slice(&[1u8; 29]), "club-1", "Northside FC")
            .unwrap();
        assert_eq!(club.id, "club-1");
        assert!(domain.can_manage_club(Principal::from_slice(&[1u8; 29]), "club-1"));
        assert!(!domain.can_manage_club(actor, "club-1"));
    }

    #[test]
    fn club_admin_role_is_enforced() {
        let mut domain = ClubDomain::new(Principal::from_slice(&[1u8; 29]));
        let governor = Principal::from_slice(&[1u8; 29]);
        let admin = Principal::from_slice(&[3u8; 29]);
        let outsider = Principal::from_slice(&[4u8; 29]);
        domain
            .create_club(governor, "club-1", "Northside FC")
            .unwrap();
        domain
            .grant_role(governor, admin, "club_admin", "club-1", None)
            .unwrap();
        assert!(domain.can_manage_club(admin, "club-1"));
        assert!(!domain.can_manage_club(outsider, "club-1"));

        domain
            .grant_role(admin, outsider, "owner", "club-1", None)
            .unwrap();
        assert!(!domain.can_manage_club(outsider, "club-1"));
        assert_eq!(
            domain
                .create_team(outsider, "team-denied", "club-1", "Under 14")
                .unwrap_err(),
            "Club admin required"
        );
        assert!(domain
            .create_team(admin, "team-admin", "club-1", "Under 14")
            .is_ok());
    }

    #[test]
    fn team_and_role_relationships_cannot_cross_clubs() {
        let governor = Principal::from_slice(&[1u8; 29]);
        let admin = Principal::from_slice(&[3u8; 29]);
        let player = Principal::from_slice(&[5u8; 29]);
        let mut domain = ClubDomain::new(governor);
        domain
            .create_club(governor, "club-a", "Northside FC")
            .unwrap();
        domain
            .create_club(governor, "club-b", "Lakeside FC")
            .unwrap();
        domain
            .grant_role(governor, admin, "club_admin", "club-a", None)
            .unwrap();
        domain
            .create_team(admin, "team-a", "club-a", "Under 14")
            .unwrap();
        assert!(domain
            .create_team(admin, "team-b", "club-b", "Under 14")
            .is_err());
        assert!(domain
            .grant_role(admin, player, "player", "club-a", Some("team-b"))
            .is_err());
        assert!(domain
            .grant_role(admin, player, "player", "club-a", Some("team-a"))
            .is_ok());
        assert!(domain.can_view_club(player, "club-a"));
        assert!(domain.can_view_team(player, "team-a"));
        assert!(!domain.can_view_team(player, "team-b"));
    }

    #[test]
    fn team_creation_requires_an_existing_club() {
        let governor = Principal::from_slice(&[1u8; 29]);
        let mut domain = ClubDomain::new(governor);

        assert_eq!(
            domain
                .create_team(governor, "team-orphan", "club-missing", "Under 14")
                .unwrap_err(),
            "Unknown club"
        );
        assert!(!domain.can_view_team(governor, "team-orphan"));
    }

    #[test]
    fn member_read_access_is_scoped_to_its_club() {
        let governor = Principal::from_slice(&[1u8; 29]);
        let member = Principal::from_slice(&[6u8; 29]);
        let mut domain = ClubDomain::new(governor);
        domain
            .create_club(governor, "club-a", "Northside FC")
            .unwrap();
        domain
            .create_club(governor, "club-b", "Lakeside FC")
            .unwrap();
        domain
            .create_team(governor, "team-a", "club-a", "Under 14")
            .unwrap();
        domain
            .grant_role(governor, member, "member", "club-a", None)
            .unwrap();
        assert!(domain.can_view_club(member, "club-a"));
        assert!(!domain.can_view_club(member, "club-b"));
        assert!(!domain.can_view_team(member, "team-a"));
    }

    #[test]
    fn club_and_team_creation_require_bounded_fields() {
        let governor = Principal::from_slice(&[1u8; 29]);
        let mut domain = ClubDomain::new(governor);

        assert_eq!(
            domain
                .create_club(governor, "club-a", &"n".repeat(MAX_FIELD_BYTES + 1))
                .unwrap_err(),
            "Invalid club fields"
        );
        domain
            .create_club(governor, "club-a", "Northside FC")
            .unwrap();
        assert_eq!(
            domain
                .create_team(
                    governor,
                    &"t".repeat(MAX_FIELD_BYTES + 1),
                    "club-a",
                    "Under 14",
                )
                .unwrap_err(),
            "Invalid team fields"
        );
        assert_eq!(
            domain
                .create_team(
                    governor,
                    "team-a",
                    "club-a",
                    &"n".repeat(MAX_FIELD_BYTES + 1),
                )
                .unwrap_err(),
            "Invalid team fields"
        );
    }

    #[test]
    fn role_grants_reject_anonymous_and_unbounded_fields() {
        let governor = Principal::from_slice(&[1u8; 29]);
        let member = Principal::from_slice(&[6u8; 29]);
        let mut domain = ClubDomain::new(governor);
        domain
            .create_club(governor, "club-a", "Northside FC")
            .unwrap();
        domain
            .create_team(governor, "team-a", "club-a", "Under 14")
            .unwrap();

        assert_eq!(
            domain
                .grant_role(governor, Principal::anonymous(), "member", "club-a", None)
                .unwrap_err(),
            "Invalid role grant"
        );
        assert_eq!(
            domain
                .grant_role(governor, member, "", "club-a", None)
                .unwrap_err(),
            "Invalid role grant"
        );
        assert_eq!(
            domain
                .grant_role(
                    governor,
                    member,
                    &"r".repeat(MAX_FIELD_BYTES + 1),
                    "club-a",
                    None,
                )
                .unwrap_err(),
            "Invalid role grant"
        );
        assert_eq!(
            domain
                .grant_role(
                    governor,
                    member,
                    "player",
                    "club-a",
                    Some(&"t".repeat(MAX_FIELD_BYTES + 1)),
                )
                .unwrap_err(),
            "Invalid role grant"
        );
    }
}
