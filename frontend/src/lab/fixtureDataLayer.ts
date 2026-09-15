/**
 * Fixture data layer for ICP mode.
 * 
 * When using ICP auth mode in the lab, pages cannot hit Supabase.
 * This layer returns synthetic data so pages render without crashes.
 * 
 * In production hybrid mode, real ICP canisters would replace these fixtures.
 */

export interface FixtureUser {
  id: string;
  email: string;
  display_name: string;
}

export interface FixtureClub {
  id: string;
  name: string;
  logo_url: string | null;
  sport: string | null;
  is_pro: boolean;
  created_by: string | null;
  deleted_at: string | null;
}

export interface FixtureTeam {
  id: string;
  club_id: string;
  name: string;
  is_pro: boolean;
  deleted_at: string | null;
  clubs?: {
    id: string;
    name: string;
    is_pro: boolean;
    sport: string | null;
    class_mode_enabled?: boolean;
    bot_user_id?: string | null;
  };
}

export interface FixtureEvent {
  id: string;
  team_id: string;
  club_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  location: string | null;
  sport: string | null;
  created_by: string | null;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
}

export interface FixtureNotification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
  related_id: string | null;
}

export interface FixtureGroupMessage {
  id: string;
  text: string;
  image_url: string | null;
  created_at: string;
  author_id: string;
  group_id: string;
  reply_to_id: string | null;
  author: { display_name: string | null; avatar_url: string | null };
}

export function getLocalLabClubList(): FixtureClub[] {
  return getFixtureUserClubs('icp-member');
}

export function getLocalLabClubDetail(clubId: string): FixtureClub | null {
  return getFixtureClubDetail(clubId);
}

export function getLocalLabTeamList(): FixtureTeam[] {
  return getFixtureUserTeams('icp-member');
}

export function getLocalLabTeamDetail(teamId: string): FixtureTeam | null {
  return getFixtureTeamDetail(teamId);
}

export function getLocalLabEventList() {
  return getFixtureUpcomingEvents('icp-member').map((event) => ({
    ...event,
    type: 'game' as const,
    event_date: event.start_at,
    teams: { name: 'ICP Test Team', default_match_arrival_minutes: 30 },
    clubs: { name: 'ICP Test Club', sport: 'soccer' },
    is_cancelled: false,
    is_recurring: false,
    parent_event_id: null,
    opponent: 'Local ICP Challenge',
    address: 'Local ICP Network',
    suburb: 'Lab',
    location_name: 'Lab pitch',
    start_time: '18:00',
    mini_league_id: null,
    team_id: 'team-icp-001',
    club_id: 'club-icp-001',
  }));
}

export function getLocalLabMessagesSnapshot(userId: string) {
  const club = getLocalLabClubDetail('club-icp-001');
  const team = getLocalLabTeamDetail('team-icp-001');
  return {
    userId,
    adminClubs: club ? [club] : [],
    memberClubs: club ? [{ ...club, logo_url: null, description: 'Lab club detail' }] : [],
    latestClubMessages: {
      'club-icp-001': { text: 'Local ICP club update', author: 'Local ICP', created_at: new Date().toISOString() },
    },
    teams: team ? [{
      ...team,
      club_id: 'club-icp-001',
      name: 'ICP Test Team',
      logo_url: null,
      clubs: {
        id: 'club-icp-001',
        name: 'ICP Test Club',
        logo_url: null,
        sport: 'soccer',
        deleted_at: null,
        purged_at: null,
      },
    }] : [],
    latestTeamMessages: {
      'team-icp-001': { text: 'Local ICP team update', author: 'Local ICP', created_at: new Date().toISOString() },
    },
  };
}

export function getLocalLabNotifications(userId: string): FixtureNotification[] {
  const now = new Date();
  return [
    {
      id: 'notification-icp-001',
      user_id: userId,
      type: 'event_reminder',
      message: 'ICP Lab Test Match is scheduled for tomorrow.',
      read: false,
      created_at: now.toISOString(),
      related_id: 'event-icp-001',
    },
    {
      id: 'notification-icp-002',
      user_id: userId,
      type: 'membership_approved',
      message: 'Your membership in ICP Test Club is active.',
      read: true,
      created_at: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
      related_id: 'club-icp-001',
    },
  ];
}

export function getLocalLabGroup(groupId: string, userId: string) {
  if (groupId !== 'group-icp-001') return null;
  return {
    id: groupId,
    name: 'ICP Test Team Chat',
    club_id: 'club-icp-001',
    team_id: 'team-icp-001',
    mini_league_id: null,
    allowed_roles: ['club_admin', 'team_admin', 'coach', 'player', 'parent'],
    created_by: userId,
    membership_mode: 'members',
    category: 'team',
    join_policy: 'invite_only',
    allow_forwarding: false,
  };
}

export function getLocalLabGroupMessages(groupId: string, userId: string): FixtureGroupMessage[] {
  if (groupId !== 'group-icp-001') return [];
  return [{
    id: 'group-message-icp-001',
    text: 'Welcome to the local ICP team chat.',
    image_url: null,
    created_at: new Date().toISOString(),
    author_id: userId,
    group_id: groupId,
    reply_to_id: null,
    author: { display_name: 'Local ICP Member', avatar_url: null },
  }];
}

export interface FixtureThreadMessage {
  id: string;
  author_id: string;
  text: string;
  image_url: string | null;
  reply_to_id: string | null;
  created_at: string;
  edited_at: string | null;
  is_club_announcement: boolean;
  club_announcement_name: string | null;
  is_system_message: boolean;
  profiles: { display_name: string | null; avatar_url: string | null } | null;
  reactions: { id: string; user_id: string; reaction_type: string }[];
  reply_to: { text: string; profiles: { display_name: string | null } | null } | null;
}

function buildThreadMessage(
  id: string,
  text: string,
  userId: string,
  scope: Record<string, string>,
): FixtureThreadMessage & Record<string, unknown> {
  return {
    id,
    author_id: userId,
    text,
    image_url: null,
    reply_to_id: null,
    created_at: new Date().toISOString(),
    edited_at: null,
    is_club_announcement: false,
    club_announcement_name: null,
    is_system_message: false,
    profiles: { display_name: 'Local ICP Member', avatar_url: null },
    reactions: [],
    reply_to: null,
    ...scope,
  };
}

/** Synthetic team-chat thread header for the lab. */
export function getLocalLabChatTeam(teamId: string) {
  if (teamId !== 'team-icp-001') return null;
  return {
    id: teamId,
    name: 'ICP Test Team',
    logo_url: null,
    club_id: 'club-icp-001',
    level_age: null,
    team_type: 'mixed',
    clubs: { id: 'club-icp-001', name: 'ICP Test Club', logo_url: null, sport: 'soccer', is_pro: false },
  };
}

export function getLocalLabTeamMessages(teamId: string, userId: string) {
  if (teamId !== 'team-icp-001') return [];
  return [buildThreadMessage('team-message-icp-001', 'Welcome to the local ICP team chat.', userId, { team_id: teamId })];
}

/** Synthetic club-chat thread header for the lab. */
export function getLocalLabChatClub(clubId: string) {
  if (clubId !== 'club-icp-001') return null;
  return {
    id: clubId,
    name: 'ICP Test Club',
    logo_url: null,
    sport: 'soccer',
    is_pro: false,
    deleted_at: null,
  };
}

export function getLocalLabClubMessages(clubId: string, userId: string) {
  if (clubId !== 'club-icp-001') return [];
  return [buildThreadMessage('club-message-icp-001', 'Welcome to the local ICP club chat.', userId, { club_id: clubId })];
}

/** Synthetic direct-message thread for the lab. */
export function getLocalLabDirectMessages(conversationId: string, userId: string) {
  if (conversationId !== 'dm-icp-001') return [];
  return [buildThreadMessage('dm-message-icp-001', 'Local ICP direct message thread.', userId, { conversation_id: conversationId })];
}

export function getLocalLabDirectConversation(conversationId: string, userId: string) {
  if (conversationId !== 'dm-icp-001') return null;
  return {
    id: conversationId,
    user1_id: userId,
    user2_id: 'icp-peer',
    club_id: 'club-icp-001',
    created_at: new Date().toISOString(),
  };
}

/** Synthetic broadcast thread for the lab. */
export function getLocalLabBroadcast(broadcastId: string, userId: string) {
  if (broadcastId !== 'broadcast-icp-001') return null;
  return {
    id: broadcastId,
    name: 'ICP Lab Broadcast',
    club_id: 'club-icp-001',
    team_id: null,
    created_by: userId,
    allow_replies: false,
  };
}

export function getLocalLabBroadcastMessages(broadcastId: string, userId: string) {
  if (broadcastId !== 'broadcast-icp-001') return [];
  return [buildThreadMessage('broadcast-message-icp-001', 'Local ICP broadcast announcement.', userId, { broadcast_id: broadcastId })];
}

/** Synthetic profile record for profile/account/edit-profile surfaces. */
export function getLocalLabProfile(userId: string) {
  return {
    id: userId,
    display_name: 'Local ICP Member',
    avatar_url: null,
    bio: 'Synthetic lab identity. No production data.',
    phone: null,
    email: 'local-member@icp.lab.invalid',
    date_of_birth: null,
    created_at: new Date(0).toISOString(),
    notification_preferences: null,
  };
}

/** Synthetic children records for the parent/guardian surfaces. */
export function getLocalLabChildren(userId: string) {
  return [{
    id: 'child-icp-001',
    parent_id: userId,
    name: 'ICP Lab Child',
    display_name: 'ICP Lab Child',
    date_of_birth: null,
    avatar_url: null,
    team_id: 'team-icp-001',
    club_id: 'club-icp-001',
    created_at: new Date(0).toISOString(),
  }];
}

/** Synthetic media gallery items. */
export function getLocalLabMediaItems(clubId: string) {
  return [{
    id: 'media-icp-001',
    club_id: clubId,
    team_id: 'team-icp-001',
    event_id: null,
    url: null,
    image_url: null,
    caption: 'Synthetic lab media placeholder',
    created_at: new Date(0).toISOString(),
    uploaded_by: 'icp-member',
  }];
}

/** Synthetic vault items. */
export function getLocalLabVaultItems(clubId: string) {
  return [{
    id: 'vault-icp-001',
    club_id: clubId,
    team_id: null,
    title: 'Local ICP lab document',
    description: 'Synthetic vault entry. Not persisted.',
    file_url: null,
    file_type: 'text/plain',
    folder_id: null,
    created_at: new Date(0).toISOString(),
    created_by: 'icp-member',
  }];
}

/** Synthetic club news posts. */
export function getLocalLabNewsPosts(clubId: string) {
  return [{
    id: 'news-icp-001',
    club_id: clubId,
    title: 'Local ICP lab news',
    content: 'Synthetic news post rendered from the local lab fixture layer.',
    image_url: null,
    published_at: new Date(0).toISOString(),
    author_id: 'icp-member',
    target_team_ids: [] as string[],
    is_important: false,
    attachments: [],
  }];
}

export function getLocalLabNewsPost(postId: string) {
  return getLocalLabNewsPosts('club-icp-001').find((post) => post.id === postId) ?? null;
}

/** Synthetic leaderboard rows. */
export function getLocalLabLeaderboard(clubId: string) {
  return [
    { user_id: 'icp-member', display_name: 'Local ICP Member', avatar_url: null, points: 120, rank: 1, club_id: clubId, is_viewer: true, hidden: false },
    { user_id: 'icp-peer', display_name: 'Local ICP Peer', avatar_url: null, points: 80, rank: 2, club_id: clubId, is_viewer: false, hidden: false },
  ];
}

/** Synthetic rewards catalogue. */
export function getLocalLabRewards(clubId: string) {
  return [{
    id: 'reward-icp-001',
    club_id: clubId,
    name: 'Local ICP lab reward',
    description: 'Synthetic reward. Redemption is disabled in the lab.',
    points_required: 50,
    reward_type: 'general' as const,
    is_active: true,
    is_default: true,
    logo_url: null,
    qr_code_url: null,
    show_qr_code: false,
    sponsor_id: null,
    created_at: new Date(0).toISOString(),
  }];
}

/** Synthetic redemption rows for the read-only rewards report. */
export function getLocalLabRewardRedemptions(clubId: string) {
  return [{
    id: 'redemption-icp-001',
    club_id: clubId,
    points_spent: 50,
    status: 'pending' as const,
    redeemed_at: new Date().toISOString(),
    child_id: null,
    user_id: 'icp-member',
    club_rewards: {
      id: 'reward-icp-001',
      name: 'Local ICP lab reward',
      reward_type: 'general',
    },
    children: null,
    profiles: { id: 'icp-member', display_name: 'Local ICP Member' },
  }];
}

/** Synthetic role assignments for the member roles surface. */
export function getLocalLabUserRoles(userId: string) {
  return [{
    id: 'role-icp-001',
    user_id: userId,
    role: 'club_admin',
    club_id: 'club-icp-001',
    team_id: null,
    created_at: new Date(0).toISOString(),
  }];
}

export function getLocalLabHomeSnapshot(userId: string) {
  const memberships = {
    clubIds: ['club-icp-001'],
    teamIds: ['team-icp-001'],
    clubAdminClubIds: ['club-icp-001'],
    leagueAdminClubIds: [],
    miniLeagueIds: [],
    isAppAdmin: false,
    roles: [{ role: 'club_admin', club_id: 'club-icp-001', team_id: null }],
  };

  return {
    memberships,
    events: getLocalLabEventList().map((event) => ({
      ...event,
      type: 'game' as const,
      title: event.title || 'ICP Lab Match',
      club_id: 'club-icp-001',
      team_id: 'team-icp-001',
    })),
    userId,
  };
}

/**
 * Return synthetic user clubs for the ICP lab.
 * In real hybrid mode, this would query a local canister.
 */
export function getFixtureUserClubs(userId: string): FixtureClub[] {
  return [
    {
      id: 'club-icp-001',
      name: 'ICP Test Club',
      logo_url: null,
      sport: 'soccer',
      is_pro: false,
      created_by: userId,
      deleted_at: null,
    },
  ];
}

/**
 * Return synthetic user teams for the ICP lab.
 */
export function getFixtureUserTeams(userId: string): FixtureTeam[] {
  return [
    {
      id: 'team-icp-001',
      club_id: 'club-icp-001',
      name: 'ICP Test Team',
      is_pro: false,
      deleted_at: null,
    },
  ];
}

/**
 * Return synthetic upcoming events for the ICP lab.
 */
export function getFixtureUpcomingEvents(userId: string): FixtureEvent[] {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  return [
    {
      id: 'event-icp-001',
      team_id: 'team-icp-001',
      club_id: 'club-icp-001',
      title: 'ICP Lab Test Match',
      description: 'Synthetic fixture event for local testing',
      start_at: tomorrow.toISOString(),
      end_at: new Date(tomorrow.getTime() + 90 * 60 * 1000).toISOString(),
      location: 'Local ICP Network',
      sport: 'soccer',
      created_by: userId,
      status: 'scheduled',
    },
  ];
}

/**
 * Return synthetic club pro status for the ICP lab.
 */
export function getFixtureClubProStatus(clubId: string): { is_pro: boolean; is_pro_football: boolean } {
  return {
    is_pro: false,
    is_pro_football: false,
  };
}

/**
 * Return a synthetic club detail for the ICP lab.
 */
export function getFixtureClubDetail(clubId: string): FixtureClub | null {
  if (clubId === 'club-icp-001') {
    return {
      id: clubId,
      name: 'ICP Test Club',
      logo_url: null,
      sport: 'soccer',
      is_pro: false,
      created_by: 'icp-admin',
      deleted_at: null,
    };
  }
  return null;
}

/**
 * Return a synthetic team detail for the ICP lab.
 */
export function getFixtureTeamDetail(teamId: string): FixtureTeam | null {
  if (teamId === 'team-icp-001') {
    return {
      id: teamId,
      club_id: 'club-icp-001',
      name: 'ICP Test Team',
      is_pro: false,
      deleted_at: null,
      clubs: {
        id: 'club-icp-001',
        name: 'ICP Test Club',
        is_pro: false,
        sport: 'soccer',
        class_mode_enabled: false,
        bot_user_id: null,
      },
    };
  }
  return null;
}
