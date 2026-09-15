use candid::Principal;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Competition {
    pub id: String,
    pub club_id: String,
    pub name: String,
    pub season: String,
    pub version: u64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RoleGrant {
    pub account: Principal,
    pub role: String,
    pub club_id: String,
    pub competition_id: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct JoinToken {
    pub token: String,
    pub competition_id: String,
    pub club_id: String,
    pub used: bool,
    pub expiry_ms: u64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CompetitionDomain {
    governor: Principal,
    competitions: Vec<Competition>,
    roles: Vec<RoleGrant>,
    tokens: Vec<JoinToken>,
}

impl CompetitionDomain {
    pub fn new(governor: Principal) -> Self {
        Self {
            governor,
            competitions: vec![],
            roles: vec![],
            tokens: vec![],
        }
    }

    fn has_role(&self, actor: Principal, role: &str, club_id: &str, competition_id: &str) -> bool {
        self.roles.iter().any(|grant| {
            grant.account == actor
                && grant.role == role
                && grant.club_id == club_id
                && grant.competition_id == competition_id
        })
    }

    pub fn create_competition(
        &mut self,
        actor: Principal,
        club_id: &str,
        name: &str,
        season: &str,
    ) -> Result<Competition, String> {
        if actor == Principal::anonymous() {
            return Err("Authenticated user required".into());
        }
        let allowed =
            actor == self.governor || self.has_role(actor, "club_admin", club_id, "global");
        if !allowed {
            return Err("Club admin required".into());
        }
        if club_id.trim().is_empty() || name.trim().is_empty() || season.trim().is_empty() {
            return Err("Invalid competition fields".into());
        }
        if self
            .competitions
            .iter()
            .any(|entry| entry.club_id == club_id && entry.name == name && entry.season == season)
        {
            return Err("Competition already exists".into());
        }
        let competition = Competition {
            id: format!("comp-{}-{}", club_id, self.competitions.len() + 1),
            club_id: club_id.to_string(),
            name: name.to_string(),
            season: season.to_string(),
            version: 1,
        };
        self.competitions.push(competition.clone());
        Ok(competition)
    }

    pub fn grant_role(
        &mut self,
        actor: Principal,
        principal: Principal,
        role: &str,
        club_id: &str,
        competition_id: &str,
    ) -> Result<(), String> {
        if actor == Principal::anonymous() {
            return Err("Authenticated user required".into());
        }
        if actor != self.governor {
            return Err("Governor required".into());
        }
        if principal == Principal::anonymous() {
            return Err("Invalid principal".into());
        }
        if !self
            .competitions
            .iter()
            .any(|entry| entry.id == competition_id && entry.club_id == club_id)
            && competition_id != "global"
        {
            return Err("Competition not found".into());
        }
        if self.roles.iter().any(|grant| {
            grant.account == principal
                && grant.role == role
                && grant.club_id == club_id
                && grant.competition_id == competition_id
        }) {
            return Err("Duplicate role".into());
        }
        self.roles.push(RoleGrant {
            account: principal,
            role: role.to_string(),
            club_id: club_id.to_string(),
            competition_id: competition_id.to_string(),
        });
        Ok(())
    }

    pub fn create_join_token(
        &mut self,
        actor: Principal,
        club_id: &str,
        competition_id: &str,
        expiry_ms: u64,
    ) -> Result<JoinToken, String> {
        if actor == Principal::anonymous() {
            return Err("Authenticated user required".into());
        }
        if !self
            .competitions
            .iter()
            .any(|entry| entry.id == competition_id && entry.club_id == club_id)
        {
            return Err("Competition not found".into());
        }
        if expiry_ms == 0 {
            return Err("Token expiry required".into());
        }
        let allowed = actor == self.governor
            || self.has_role(actor, "club_admin", club_id, competition_id)
            || self.has_role(actor, "competition_admin", club_id, competition_id);
        if !allowed {
            return Err("Competition admin required".into());
        }
        let token = JoinToken {
            token: format!("join-{}-{}", competition_id, self.tokens.len() + 1),
            competition_id: competition_id.to_string(),
            club_id: club_id.to_string(),
            used: false,
            expiry_ms,
        };
        self.tokens.push(token.clone());
        Ok(token)
    }

    pub fn redeem_join_token(&mut self, actor: Principal, token: &str) -> Result<String, String> {
        if actor == Principal::anonymous() {
            return Err("Authenticated user required".into());
        }
        let idx = self
            .tokens
            .iter()
            .position(|entry| entry.token == token)
            .ok_or("Token not found")?;
        let competition_id = self.tokens[idx].competition_id.clone();
        if self.tokens[idx].used {
            return Err("Token already used".into());
        }
        if self.tokens[idx].expiry_ms <= 0 {
            return Err("Token expired".into());
        }
        self.tokens[idx].used = true;
        Ok(competition_id)
    }

    pub fn list_competitions(&self, club_id: Option<&str>) -> Vec<Competition> {
        self.competitions
            .iter()
            .filter(|entry| club_id.map_or(true, |id| entry.club_id == id))
            .cloned()
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn governor_can_create_competition() {
        let governor = Principal::from_slice(&[1u8; 29]);
        let mut domain = CompetitionDomain::new(governor);
        let competition = domain
            .create_competition(governor, "club-1", "Spring League", "2026")
            .unwrap();
        assert_eq!(competition.club_id, "club-1");
        assert_eq!(domain.list_competitions(Some("club-1")).len(), 1);
    }

    #[test]
    fn join_token_is_replay_protected() {
        let governor = Principal::from_slice(&[1u8; 29]);
        let user = Principal::from_slice(&[2u8; 29]);
        let mut domain = CompetitionDomain::new(governor);
        domain
            .create_competition(governor, "club-1", "Spring League", "2026")
            .unwrap();
        let token = domain
            .create_join_token(governor, "club-1", "comp-club-1-1", 9_999_999)
            .unwrap();
        assert_eq!(
            domain.redeem_join_token(user, &token.token).unwrap(),
            "comp-club-1-1"
        );
        assert!(domain.redeem_join_token(user, &token.token).is_err());
    }

    #[test]
    fn join_token_creation_is_fenced_to_competition_admins() {
        let governor = Principal::from_slice(&[1u8; 29]);
        let outsider = Principal::from_slice(&[3u8; 29]);
        let mut domain = CompetitionDomain::new(governor);
        domain
            .create_competition(governor, "club-1", "Spring League", "2026")
            .unwrap();
        assert_eq!(
            domain.create_join_token(outsider, "club-1", "comp-club-1-1", 9_999_999),
            Err("Competition admin required".into())
        );
        assert_eq!(
            domain.create_join_token(governor, "club-1", "comp-club-1-1", 0),
            Err("Token expiry required".into())
        );
        let token = domain
            .create_join_token(governor, "club-1", "comp-club-1-1", 9_999_999)
            .unwrap();
        assert_eq!(token.competition_id, "comp-club-1-1");
    }
}
