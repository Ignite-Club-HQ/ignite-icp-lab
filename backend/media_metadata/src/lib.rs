use candid::Principal;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Asset {
    pub id: String,
    pub owner: Principal,
    pub club_id: String,
    pub team_id: Option<String>,
    pub mime: String,
    pub size_bytes: u64,
    pub checksum: String,
    pub visibility: String,
    pub expires_at_ms: u64,
    pub version: u64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Capability {
    pub asset_id: String,
    pub owner: Principal,
    pub action: String,
    pub scope: String,
    pub expires_at_ms: u64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MediaMetadataDomain {
    governor: Principal,
    assets: Vec<Asset>,
    capabilities: Vec<Capability>,
}

impl MediaMetadataDomain {
    pub fn new(governor: Principal) -> Self {
        Self {
            governor,
            assets: vec![],
            capabilities: vec![],
        }
    }

    pub fn upload_asset(
        &mut self,
        actor: Principal,
        club_id: &str,
        team_id: Option<&str>,
        mime: &str,
        size_bytes: u64,
        checksum: &str,
        visibility: &str,
        expires_at_ms: u64,
    ) -> Result<Asset, String> {
        if actor == Principal::anonymous() {
            return Err("Authenticated user required".into());
        }
        if mime.trim().is_empty() || checksum.trim().is_empty() || visibility.trim().is_empty() {
            return Err("Invalid asset metadata".into());
        }
        let asset = Asset {
            id: format!("asset-{}-{}", club_id, self.assets.len() + 1),
            owner: actor,
            club_id: club_id.to_string(),
            team_id: team_id.map(str::to_string),
            mime: mime.to_string(),
            size_bytes,
            checksum: checksum.to_string(),
            visibility: visibility.to_string(),
            expires_at_ms,
            version: 1,
        };
        self.assets.push(asset.clone());
        Ok(asset)
    }

    pub fn issue_capability(
        &mut self,
        actor: Principal,
        asset_id: &str,
        action: &str,
        scope: &str,
        expires_at_ms: u64,
    ) -> Result<Capability, String> {
        self.issue_capability_for(actor, actor, asset_id, action, scope, expires_at_ms)
    }

    pub fn issue_capability_for(
        &mut self,
        actor: Principal,
        holder: Principal,
        asset_id: &str,
        action: &str,
        scope: &str,
        expires_at_ms: u64,
    ) -> Result<Capability, String> {
        if actor == Principal::anonymous() {
            return Err("Authenticated user required".into());
        }
        if holder == Principal::anonymous() {
            return Err("Invalid capability holder".into());
        }
        if action.trim().is_empty() || scope.trim().is_empty() || expires_at_ms == 0 {
            return Err("Invalid capability fields".into());
        }
        let asset = self
            .assets
            .iter()
            .find(|entry| entry.id == asset_id)
            .ok_or("Asset not found")?;
        if asset.owner != actor && actor != self.governor {
            return Err("Asset owner required".into());
        }
        let capability = Capability {
            asset_id: asset_id.to_string(),
            owner: holder,
            action: action.to_string(),
            scope: scope.to_string(),
            expires_at_ms,
        };
        self.capabilities.push(capability.clone());
        Ok(capability)
    }

    pub fn can_view_asset(&self, actor: Principal, asset_id: &str) -> bool {
        self.can_view_asset_at(actor, asset_id, 1)
    }

    pub fn can_view_asset_at(&self, actor: Principal, asset_id: &str, now_ms: u64) -> bool {
        let asset = match self.assets.iter().find(|entry| entry.id == asset_id) {
            Some(asset) => asset,
            None => return false,
        };
        if actor == asset.owner || actor == self.governor {
            return true;
        }
        if asset.visibility == "public" {
            return true;
        }
        self.capabilities.iter().any(|cap| {
            cap.asset_id == asset_id
                && cap.owner == actor
                && cap.action == "view"
                && cap.expires_at_ms > now_ms
        })
    }

    pub fn delete_asset(&mut self, actor: Principal, asset_id: &str) -> Result<Asset, String> {
        if actor == Principal::anonymous() {
            return Err("Authenticated user required".into());
        }
        let idx = self
            .assets
            .iter()
            .position(|entry| entry.id == asset_id)
            .ok_or("Asset not found")?;
        let asset = self.assets[idx].clone();
        if asset.owner != actor && actor != self.governor {
            return Err("Asset owner required".into());
        }
        self.assets.remove(idx);
        self.capabilities.retain(|cap| cap.asset_id != asset_id);
        Ok(asset)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn owner_can_upload_and_view_asset() {
        let governor = Principal::from_slice(&[1u8; 29]);
        let owner = Principal::from_slice(&[2u8; 29]);
        let mut domain = MediaMetadataDomain::new(governor);
        let asset = domain
            .upload_asset(
                owner,
                "club-1",
                None,
                "image/jpeg",
                80,
                "abc123",
                "private",
                9_999_999,
            )
            .unwrap();
        assert!(domain.can_view_asset(owner, &asset.id));
    }

    #[test]
    fn capability_boundaries_are_scoped_to_one_asset() {
        let governor = Principal::from_slice(&[1u8; 29]);
        let owner = Principal::from_slice(&[2u8; 29]);
        let outsider = Principal::from_slice(&[3u8; 29]);
        let mut domain = MediaMetadataDomain::new(governor);
        let asset = domain
            .upload_asset(
                owner,
                "club-1",
                None,
                "image/png",
                50,
                "hash-1",
                "private",
                9_999_999,
            )
            .unwrap();
        domain
            .issue_capability(owner, &asset.id, "view", "asset:scope", 9_999_999)
            .unwrap();
        assert!(domain.can_view_asset(owner, &asset.id));
        assert!(!domain.can_view_asset(outsider, &asset.id));
    }

    #[test]
    fn expired_capabilities_are_rejected_at_view_boundary() {
        let governor = Principal::from_slice(&[1u8; 29]);
        let owner = Principal::from_slice(&[2u8; 29]);
        let viewer = Principal::from_slice(&[3u8; 29]);
        let mut domain = MediaMetadataDomain::new(governor);
        let asset = domain
            .upload_asset(
                owner,
                "club-1",
                None,
                "image/png",
                50,
                "hash-2",
                "private",
                9_999_999,
            )
            .unwrap();
        domain
            .issue_capability_for(owner, viewer, &asset.id, "view", "asset:scope", 100)
            .unwrap();
        assert!(domain.can_view_asset_at(viewer, &asset.id, 99));
        assert!(!domain.can_view_asset_at(viewer, &asset.id, 100));
        assert!(domain
            .issue_capability(owner, &asset.id, "", "asset:scope", 200)
            .is_err());
    }
}
