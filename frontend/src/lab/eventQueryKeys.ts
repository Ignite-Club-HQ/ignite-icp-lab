/**
 * Canonical cache identities for event data and event-derived UI surfaces.
 *
 * Adapted from the bundle's refactored `eventQueryKeys` helper, which
 * replaced scattered literal React Query key arrays (duplicated across the
 * event pages) with one shared factory. A typo in a hand-written key array
 * silently breaks cache invalidation; centralizing the keys here removes
 * that duplication risk. This module has no provider or Supabase/ICP edge —
 * it only names cache entries.
 */
export const eventKeys = {
  lists: () => ['events'] as const,
  upcoming: () => ['upcoming-events'] as const,
  teamNext: () => ['team-next-event'] as const,
  home: (userId?: string | null) =>
    userId
      ? (['user-memberships-and-events', userId] as const)
      : (['user-memberships-and-events'] as const),

  detail: (eventId: string) => ['event', eventId] as const,
  rsvps: (eventId: string) => ['event-rsvps', eventId] as const,
  goingRsvps: (eventId: string) => ['event-rsvps-going', eventId] as const,
  groups: (eventId: string) => ['event-groups', eventId] as const,
  duties: (eventId: string) => ['event-duties', eventId] as const,
  payments: (eventId: string) => ['event-payments', eventId] as const,
  recentReminders: (eventId: string) => ['event-recent-reminders', eventId] as const,

  pitchLinked: (eventId: string) => ['pitch-linked-event', eventId] as const,
  pitchGoingRsvps: (eventId?: string | null) =>
    eventId
      ? (['pitch-board-going-rsvps', eventId] as const)
      : (['pitch-board-going-rsvps'] as const),
  pitchTeamMembers: (teamId?: string | null, eventId?: string | null) =>
    teamId && eventId
      ? (['team-members-for-pitch', teamId, eventId] as const)
      : (['team-members-for-pitch'] as const),
};
