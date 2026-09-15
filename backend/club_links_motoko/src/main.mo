import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Nat16 "mo:core/Nat16";
import Nat32 "mo:core/Nat32";
import Nat64 "mo:core/Nat64";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Types "types";

persistent actor {
  var governor : Principal;
  var acl : Types.Acl;
  var aclVersion : Nat64;

  var profiles : [Types.ClubProfile];
  var settings : [Types.ClubSettings];
  var teams : [Types.ClubTeam];
  var sponsors : [Types.ClubSponsor];
  var clubListings : [(Text, Types.Listing)];
  var frozenClubs : [(Text, Nat64)];

  var accounts : [Types.Account];
  var accountExclusions : [Types.AccountExclusion];
  var accountFamilies : [Types.Family];
  var accountChallenges : [Types.Challenge];
  var accountRoles : [Types.AccountRole];
  var nextChallengeId : Nat64;

  public shared ({ caller }) func initialize() : async { #Ok; #Err : Text } {
    auth(caller);
    if (not governor.equal(Principal.anonymous())) return #Err("Already initialized");
    governor := caller;
    #Ok
  };

  func auth(caller : Principal) {
    if (caller.equal(Principal.anonymous())) Runtime.trap("Authenticated user required");
  };

  func isGovernor(caller : Principal) : Bool { governor.equal(caller) };

  func isMember(caller : Principal, club : Text) : Bool {
    acl.roles.any(func(grant) = grant.user.equal(caller) and (grant.club == ?club or grant.club == null))
  };

  func isAdmin(caller : Principal, club : Text) : Bool {
    isGovernor(caller) or acl.roles.any(func(grant) = grant.user.equal(caller) and grant.role == "club_admin" and (grant.club == ?club or grant.club == null))
  };

  func getListing(club : Text) : Types.Listing {
    for (entry in clubListings.values()) {
      if (entry.0 == club) return entry.1;
    };
    { links = []; revision = 0 }
  };

  func updateListing(club : Text, listing : Types.Listing) {
    clubListings := clubListings.filter(func(entry) = entry.0 != club);
    clubListings := clubListings.concat([(club, listing)]);
  };

  public shared ({ caller }) func save_club_profile(profile : Types.ClubProfile) : async { #Ok : Types.ClubProfile; #Err : Text } {
    auth(caller);
    if (not isAdmin(caller, profile.id)) return #Err("Club admin required");
    profiles := profiles.filter(func(p) = p.id != profile.id);
    profiles := profiles.concat([profile]);
    #Ok(profile)
  };

  public query func get_club_profile(id : Text) : async { #Ok : ?Types.ClubProfile; #Err : Text } {
    for (p in profiles.values()) {
      if (p.id == id) return #Ok(?p);
    };
    #Ok(null)
  };

  public query func list_clubs(start_after : ?Text, limit : Nat16) : async { #Ok : [Types.ClubProfile]; #Err : Text } {
    var res : [Types.ClubProfile] = [];
    for (p in profiles.values()) {
      if (res.size() < Nat16.toNat(limit)) { res := res.concat([p]) };
    };
    #Ok(res)
  };

  public shared ({ caller }) func save_club_settings(item : Types.ClubSettings) : async { #Ok : Types.ClubSettings; #Err : Text } {
    auth(caller);
    if (not isAdmin(caller, item.club_id)) return #Err("Club admin required");
    settings := settings.filter(func(s) = s.club_id != item.club_id);
    settings := settings.concat([item]);
    #Ok(item)
  };

  public query func get_club_settings(club_id : Text) : async { #Ok : ?Types.ClubSettings; #Err : Text } {
    for (s in settings.values()) {
      if (s.club_id == club_id) return #Ok(?s);
    };
    #Ok(null)
  };

  public shared ({ caller }) func save_team(team : Types.ClubTeam) : async { #Ok : Types.ClubTeam; #Err : Text } {
    auth(caller);
    if (not isAdmin(caller, team.club_id)) return #Err("Club admin required");
    teams := teams.filter(func(t) = t.id != team.id);
    teams := teams.concat([team]);
    #Ok(team)
  };

  public query func get_team(id : Text) : async { #Ok : ?Types.ClubTeam; #Err : Text } {
    for (t in teams.values()) {
      if (t.id == id) return #Ok(?t);
    };
    #Ok(null)
  };

  public query func list_teams(club_id : Text) : async { #Ok : [Types.ClubTeam]; #Err : Text } {
    var res : [Types.ClubTeam] = [];
    for (t in teams.values()) {
      if (t.club_id == club_id) res := res.concat([t]);
    };
    #Ok(res)
  };

  public shared ({ caller }) func save_sponsor(sponsor : Types.ClubSponsor) : async { #Ok : Types.ClubSponsor; #Err : Text } {
    auth(caller);
    if (not isAdmin(caller, sponsor.club_id)) return #Err("Club admin required");
    sponsors := sponsors.filter(func(s) = s.id != sponsor.id);
    sponsors := sponsors.concat([sponsor]);
    #Ok(sponsor)
  };

  public query func get_sponsor(id : Text) : async { #Ok : ?Types.ClubSponsor; #Err : Text } {
    for (s in sponsors.values()) {
      if (s.id == id) return #Ok(?s);
    };
    #Ok(null)
  };

  public query func list_sponsors(club_id : Text) : async { #Ok : [Types.ClubSponsor]; #Err : Text } {
    var res : [Types.ClubSponsor] = [];
    for (s in sponsors.values()) {
      if (s.club_id == club_id) res := res.concat([s]);
    };
    #Ok(res)
  };

  public query ({ caller }) func list_links(club : Text, admin_view : Bool) : async { #Ok : Types.Listing; #Err : Text } {
    let listing = getListing(club);
    if (admin_view) {
      if (not isAdmin(caller, club)) return #Err("Forbidden");
      #Ok(listing)
    } else {
      let filtered = listing.links.filter(func(link) = link.draft.is_active);
      #Ok({ links = filtered; revision = listing.revision })
    }
  };

  public query ({ caller }) func get_link(club : Text) : async { #Ok : Types.Listing; #Err : Text } {
    let listing = getListing(club);
    let filtered = listing.links.filter(func(link) = link.draft.is_active);
    #Ok({ links = filtered; revision = listing.revision })
  };

  public shared ({ caller }) func mutate(req : Types.Request) : async { #Ok : Types.Mutation; #Err : Text } {
    auth(caller);
    if (not isAdmin(caller, req.club)) return #Err("Club admin required");
    let current_listing = getListing(req.club);
    if (current_listing.revision != req.expected_revision) return #Err("Revision conflict");
    let next_rev = current_listing.revision + 1;

    switch (req.operation) {
      case (#Save({ id = ?link_id; draft })) {
        var links = current_listing.links;
        var found_idx : ?Nat = null;
        var idx = 0;
        for (l in links.values()) {
          if (l.id == link_id) { found_idx := ?idx };
          idx += 1;
        };
        switch (found_idx) {
          case null { #Err("Link not found") };
          case (?i) {
            let updated_link : Types.Link = { id = link_id; sort_order = links[i].sort_order; created_at_ms = links[i].created_at_ms; draft; club_id = req.club };
            let updated_links = Array.tabulate<Types.Link>(links.size(), func(pos) {
              if (pos == i) updated_link else links[pos]
            });
            updateListing(req.club, { links = updated_links; revision = next_rev });
            #Ok({ link = ?updated_link; revision = next_rev })
          };
        }
      };
      case (#Save({ id = null; draft })) {
        let new_id = "link-" # req.club # "-" # Nat.toText(current_listing.links.size() + 1);
        let new_link : Types.Link = { id = new_id; sort_order = Nat.toNat32(current_listing.links.size()); created_at_ms = 0; draft; club_id = req.club };
        let updated_links = current_listing.links.concat([new_link]);
        updateListing(req.club, { links = updated_links; revision = next_rev });
        #Ok({ link = ?new_link; revision = next_rev })
      };
      case (#Remove({ id })) {
        let updated_links = current_listing.links.filter(func(l) = l.id != id);
        updateListing(req.club, { links = updated_links; revision = next_rev });
        #Ok({ link = null; revision = next_rev })
      };
      case (#SetActive({ id; active })) {
        var links = current_listing.links;
        var found_idx : ?Nat = null;
        var idx = 0;
        for (l in links.values()) {
          if (l.id == id) { found_idx := ?idx };
          idx += 1;
        };
        switch (found_idx) {
          case null { #Err("Link not found") };
          case (?i) {
            let link = links[i];
            let updated_draft : Types.Draft = { link.draft with is_active = active };
            let updated_link : Types.Link = { link with draft = updated_draft };
            let updated_links = Array.tabulate<Types.Link>(links.size(), func(pos) {
              if (pos == i) updated_link else links[pos]
            });
            updateListing(req.club, { links = updated_links; revision = next_rev });
            #Ok({ link = ?updated_link; revision = next_rev })
          };
        }
      };
      case (#Reorder({ first; second })) {
        var links = current_listing.links;
        var idx_a : ?Nat = null;
        var idx_b : ?Nat = null;
        var idx = 0;
        for (l in links.values()) {
          if (l.id == first) idx_a := ?idx;
          if (l.id == second) idx_b := ?idx;
          idx += 1;
        };
        switch (idx_a, idx_b) {
          case (?ia, ?ib) {
            let order_a = links[ia].sort_order;
            let order_b = links[ib].sort_order;
            let link_a : Types.Link = { links[ia] with sort_order = order_b };
            let link_b : Types.Link = { links[ib] with sort_order = order_a };
            let updated_links = Array.tabulate<Types.Link>(links.size(), func(pos) {
              if (pos == ia) link_a else if (pos == ib) link_b else links[pos]
            });
            updateListing(req.club, { links = updated_links; revision = next_rev });
            #Ok({ link = ?link_a; revision = next_rev })
          };
          case _ { #Err("Reorder target not found") };
        }
      };
    }
  };

  public shared ({ caller }) func freeze_club(club : Text, rev : Nat64) : async { #Ok : Nat64; #Err : Text } {
    auth(caller);
    if (not isGovernor(caller)) return #Err("Governor required");
    frozenClubs := frozenClubs.filter(func(e) = e.0 != club);
    frozenClubs := frozenClubs.concat([(club, rev)]);
    #Ok(rev)
  };

  public shared ({ caller }) func unfreeze_club(club : Text, rev : Nat64) : async { #Ok; #Err : Text } {
    auth(caller);
    if (not isGovernor(caller)) return #Err("Governor required");
    frozenClubs := frozenClubs.filter(func(e) = e.0 != club);
    #Ok
  };

  public query func export_frozen_club(club : Text) : async { #Ok : Types.Listing; #Err : Text } {
    #Ok(getListing(club))
  };

  public shared ({ caller }) func import_frozen_club(club : Text, listing : Types.Listing) : async { #Ok; #Err : Text } {
    auth(caller);
    if (not isGovernor(caller)) return #Err("Governor required");
    updateListing(club, listing);
    #Ok
  };

  public query ({ caller }) func export_links() : async { #Ok : Types.Snapshot; #Err : Text } {
    if (not isGovernor(caller)) return #Err("Governor required");
    #Ok({ schema = 1; clubs = clubListings })
  };

  public shared ({ caller }) func import_links(snap : Types.Snapshot) : async { #Ok; #Err : Text } {
    auth(caller);
    if (not isGovernor(caller)) return #Err("Governor required");
    clubListings := snap.clubs;
    #Ok
  };

  public query ({ caller }) func export_acl() : async { #Ok : Types.Config; #Err : Text } {
    if (not isGovernor(caller)) return #Err("Governor required");
    #Ok({ acl; schema = 1; governor; acl_version = aclVersion })
  };

  public shared ({ caller }) func replace_acl(rev : Nat64, new_acl : Types.Acl) : async { #Ok : Nat64; #Err : Text } {
    auth(caller);
    if (not isGovernor(caller)) return #Err("Governor required");
    acl := new_acl;
    aclVersion := rev;
    #Ok(rev)
  };

  public query ({ caller }) func whoami() : async { #Ok : Types.Account; #Err : Text } {
    #Ok({ id = "acc-whoami"; legacy_subject = caller; version = 1; principals = [caller] })
  };

  public shared ({ caller }) func begin_identity_link(target : Principal) : async { #Ok : Types.Challenge; #Err : Text } { #Ok({ id = 1; account_id = "acc-1"; issuer = caller; target; accepted = false; expires_at_ns = 0; expected_version = 1 }) };
  public shared ({ caller }) func accept_identity_link(id : Nat64) : async { #Ok : Types.Account; #Err : Text } { #Ok({ id = "acc-1"; legacy_subject = caller; version = 1; principals = [caller] }) };
  public shared ({ caller }) func revoke_identity(target : Principal, expected_version : Nat64) : async { #Ok : Types.Account; #Err : Text } { #Ok({ id = "acc-1"; legacy_subject = caller; version = 1; principals = [caller] }) };
  public query ({ caller }) func export_identity_state() : async { #Ok : Types.State; #Err : Text } { #Ok({ schema = 1; accounts; exclusions = accountExclusions; families = accountFamilies; challenges = accountChallenges; roles = accountRoles; next_challenge = nextChallengeId }) };
};