use candid::Principal;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Event {
    pub id: String,
    pub club_id: String,
    pub team_id: Option<String>,
    pub title: String,
    pub description: String,
    pub starts_at_ms: u64,
    pub ends_at_ms: u64,
    pub revision: u64,
    pub creator: Principal,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RoleGrant {
    pub account: Principal,
    pub role: String,
    pub club_id: String,
    pub team_id: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EventDomain {
    governor: Principal,
    roles: Vec<RoleGrant>,
    events: Vec<Event>,
}

impl EventDomain {
    pub fn new(governor: Principal) -> Self {
        Self {
            governor,
            roles: vec![],
            events: vec![],
        }
    }

    pub fn grant_role(
        &mut self,
        actor: Principal,
        principal: Principal,
        role: &str,
        club_id: &str,
        team_id: Option<&str>,
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
        self.roles.push(RoleGrant {
            account: principal,
            role: role.to_string(),
            club_id: club_id.to_string(),
            team_id: team_id.map(str::to_string),
        });
        Ok(())
    }

    fn has_role(&self, actor: Principal, role: &str, club_id: &str, team_id: Option<&str>) -> bool {
        self.roles.iter().any(|grant| {
            grant.account == actor
                && grant.role == role
                && grant.club_id == club_id
                && grant.team_id.as_deref() == team_id
        })
    }

    pub fn create_event(
        &mut self,
        actor: Principal,
        club_id: &str,
        team_id: Option<&str>,
        title: &str,
        description: &str,
        starts_at_ms: u64,
        ends_at_ms: u64,
    ) -> Result<Event, String> {
        if actor == Principal::anonymous() {
            return Err("Authenticated user required".into());
        }
        if starts_at_ms >= ends_at_ms {
            return Err("Event window invalid".into());
        }
        let team_allowed = team_id.map_or(false, |team| {
            self.has_role(actor, "team_admin", club_id, Some(team))
                || self.has_role(actor, "coach", club_id, Some(team))
        });
        let allowed = actor == self.governor
            || self.has_role(actor, "club_admin", club_id, None)
            || team_allowed;
        if !allowed {
            return Err("Club or team admin required".into());
        }
        let event = Event {
            id: format!("evt-{}-{}", club_id, self.events.len() + 1),
            club_id: club_id.to_string(),
            team_id: team_id.map(str::to_string),
            title: title.to_string(),
            description: description.to_string(),
            starts_at_ms,
            ends_at_ms,
            revision: 1,
            creator: actor,
        };
        self.events.push(event.clone());
        Ok(event)
    }

    pub fn update_event(
        &mut self,
        actor: Principal,
        event_id: &str,
        title: &str,
        description: &str,
        starts_at_ms: u64,
        ends_at_ms: u64,
    ) -> Result<Event, String> {
        let expected_revision = self
            .events
            .iter()
            .find(|event| event.id == event_id)
            .map(|event| event.revision)
            .ok_or("Event not found")?;
        self.update_event_if_revision(
            actor,
            event_id,
            expected_revision,
            title,
            description,
            starts_at_ms,
            ends_at_ms,
        )
    }

    pub fn update_event_if_revision(
        &mut self,
        actor: Principal,
        event_id: &str,
        expected_revision: u64,
        title: &str,
        description: &str,
        starts_at_ms: u64,
        ends_at_ms: u64,
    ) -> Result<Event, String> {
        if actor == Principal::anonymous() {
            return Err("Authenticated user required".into());
        }
        let index = self
            .events
            .iter()
            .position(|event| event.id == event_id)
            .ok_or("Event not found")?;
        let event = &self.events[index];
        if event.revision != expected_revision {
            return Err("Stale event revision".into());
        }
        let team_allowed = event.team_id.as_deref().map_or(false, |team| {
            self.has_role(actor, "team_admin", &event.club_id, Some(team))
                || self.has_role(actor, "coach", &event.club_id, Some(team))
        });
        let allowed = actor == self.governor
            || self.has_role(actor, "club_admin", &event.club_id, None)
            || team_allowed
            || event.creator == actor;
        if !allowed {
            return Err("Event management forbidden".into());
        }
        if starts_at_ms >= ends_at_ms {
            return Err("Event window invalid".into());
        }
        let updated = Event {
            id: event.id.clone(),
            club_id: event.club_id.clone(),
            team_id: event.team_id.clone(),
            title: title.to_string(),
            description: description.to_string(),
            starts_at_ms,
            ends_at_ms,
            revision: event.revision + 1,
            creator: event.creator,
        };
        self.events[index] = updated.clone();
        Ok(updated)
    }

    pub fn list_events(&self, club_id: Option<&str>, team_id: Option<&str>) -> Vec<Event> {
        self.events
            .iter()
            .filter(|event| {
                (club_id.map_or(true, |id| event.club_id == id))
                    && (team_id.map_or(true, |id| event.team_id.as_deref() == Some(id)))
            })
            .cloned()
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn governor_can_create_event_in_club() {
        let governor = Principal::from_slice(&[1u8; 29]);
        let mut domain = EventDomain::new(governor);
        let created = domain
            .create_event(
                governor,
                "club-1",
                None,
                "Spring Cup",
                "Open tournament",
                1_000,
                2_000,
            )
            .unwrap();
        assert_eq!(created.club_id, "club-1");
        assert_eq!(domain.list_events(Some("club-1"), None).len(), 1);
    }

    #[test]
    fn club_admin_role_is_checked_for_event_update() {
        let governor = Principal::from_slice(&[1u8; 29]);
        let admin = Principal::from_slice(&[2u8; 29]);
        let outsider = Principal::from_slice(&[3u8; 29]);
        let mut domain = EventDomain::new(governor);
        domain
            .grant_role(governor, admin, "club_admin", "club-1", None)
            .unwrap();
        let created = domain
            .create_event(admin, "club-1", None, "Training", "Skills session", 10, 20)
            .unwrap();
        let updated = domain
            .update_event(admin, &created.id, "Updated", "Changed", 11, 21)
            .unwrap();
        assert_eq!(updated.title, "Updated");
        assert!(domain
            .update_event(outsider, &created.id, "Nope", "Not allowed", 12, 22)
            .is_err());
    }

    #[test]
    fn stale_event_updates_are_rejected_without_mutation() {
        let governor = Principal::from_slice(&[1u8; 29]);
        let mut domain = EventDomain::new(governor);
        let created = domain
            .create_event(
                governor,
                "club-1",
                None,
                "Training",
                "Skills session",
                10,
                20,
            )
            .unwrap();
        let updated = domain
            .update_event_if_revision(governor, &created.id, 1, "Updated", "Changed", 11, 21)
            .unwrap();
        assert_eq!(updated.revision, 2);
        let stale =
            domain.update_event_if_revision(governor, &created.id, 1, "Stale", "Rejected", 12, 22);
        assert_eq!(stale, Err("Stale event revision".into()));
        assert_eq!(domain.list_events(Some("club-1"), None)[0].title, "Updated");
        assert_eq!(domain.list_events(Some("club-1"), None)[0].revision, 2);
    }
}
