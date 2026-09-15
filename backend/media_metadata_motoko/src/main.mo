import Array "mo:core/Array";
import Char "mo:core/Char";
import Nat "mo:core/Nat";
import Nat64 "mo:core/Nat64";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import Types "types";

persistent actor {
  var governor : Principal;
  var assets : [Types.Asset];
  var capabilities : [Types.Capability];

  public shared ({ caller }) func initialize() : async { #Ok; #Err : Text } {
    auth(caller);
    if (not governor.equal(Principal.anonymous())) return #Err("Already initialized");
    governor := caller;
    #Ok
  };

  func auth(caller : Principal) {
    if (caller.equal(Principal.anonymous())) Runtime.trap("Authenticated caller required");
  };

  func valid(value : Text) : Bool { value != "" and value.size() <= 128 };

  func isGovernor(caller : Principal) : Bool { governor.equal(caller) };

  func validCapabilityAction(action : Text) : Bool { action == "upload" or action == "download" or action == "delete" };

  func validMime(mime : Text) : Bool {
    mime.size() <= 128 and Text.contains(mime, #text "/") and Iter.all(Text.toIter(mime), func(character) = not Char.isWhitespace(character))
  };

  func validPurpose(purpose : Text) : Bool { purpose != "" and purpose.size() <= 128 };

  public shared ({ caller }) func register_asset(
    club_id : Text,
    kind : Text,
    mime : Text,
    checksum : Text,
    storage_path : Text,
    visibility : Text,
    expires_at_ms : Nat64,
  ) : async { #Ok : Types.Asset; #Err : Text } {
    auth(caller);
    if (not valid(club_id) or not valid(kind) or not validMime(mime) or not valid(checksum) or not valid(storage_path) or not valid(visibility)) return #Err("Invalid asset");
    let encrypted = kind == "child_photo" or kind == "minor_media";
    if (encrypted and visibility == "public") return #Err("Child-sensitive media cannot be public");
    if (expires_at_ms <= 0) return #Err("Asset expiry must be in the future");
    let asset : Types.Asset = {
      id = "asset-" # club_id # "-" # Nat.toText(assets.size() + 1);
      club_id;
      owner = caller;
      kind;
      mime;
      checksum;
      storage_path;
      visibility;
      content_length = 0;
      encrypted;
      child_sensitive = encrypted;
      retention_until_ms = expires_at_ms;
      deleted = false;
      expires_at_ms;
    };
    assets := assets.concat([asset]);
    #Ok(asset)
  };

  public shared ({ caller }) func issue_capability(asset_id : Text, action : Text, purpose : Text, expires_at_ms : Nat64) : async { #Ok : Types.Capability; #Err : Text } {
    auth(caller);
    if (not validCapabilityAction(action) or not validPurpose(purpose) or expires_at_ms <= 1) return #Err("Invalid or expired capability");
    var found_asset : ?Types.Asset = null;
    for (a in assets.values()) {
      if (a.id == asset_id) { found_asset := ?a };
    };
    switch (found_asset) {
      case null { #Err("Asset not found") };
      case (?asset) {
        if (not asset.owner.equal(caller)) return #Err("Asset owner required");
        let capability : Types.Capability = { asset_id; action; owner = caller; allowed = true; purpose; expires_at_ms };
        capabilities := capabilities.concat([capability]);
        #Ok(capability)
      };
    }
  };

  public query ({ caller }) func get_asset(asset_id : Text) : async ?Types.Asset {
    for (a in assets.values()) {
      if (a.id == asset_id and (isGovernor(caller) or a.owner.equal(caller))) return ?a;
    };
    null
  };

  public shared ({ caller }) func delete_asset(asset_id : Text) : async { #Ok : Types.Asset; #Err : Text } {
    auth(caller);
    var found_idx : ?Nat = null;
    var idx = 0;
    for (a in assets.values()) {
      if (a.id == asset_id) { found_idx := ?idx };
      idx += 1;
    };
    switch (found_idx) {
      case null { #Err("Asset not found") };
      case (?i) {
        let asset = assets[i];
        if (not asset.owner.equal(caller)) return #Err("Asset owner required");
        let updated : Types.Asset = { asset with deleted = true; retention_until_ms = 0 };
        assets := Array.tabulate<Types.Asset>(assets.size(), func(position) {
          if (position == i) updated else assets[position]
        });
        capabilities := capabilities.filter(func(cap) = cap.asset_id != asset_id);
        #Ok(updated)
      };
    }
  };

  public query ({ caller }) func export_state() : async { #Ok : Types.State; #Err : Text } {
    if (not isGovernor(caller)) return #Err("Governor only");
    #Ok({ schema = 1; governor; assets; capabilities })
  };
};