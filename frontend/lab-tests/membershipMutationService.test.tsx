import { describe, expect, it } from 'vitest';

type MembershipMutation = {
  actorClubId: string;
  targetClubId: string;
  action: 'invite' | 'approve' | 'promote';
  memberId: string;
};

function applyMembershipMutation(mutation: MembershipMutation) {
  if (mutation.actorClubId !== mutation.targetClubId) {
    return { ok: false, reason: 'cross-club-mutation' } as const;
  }
  return { ok: true, memberId: mutation.memberId, action: mutation.action } as const;
}

describe('membership mutation service', () => {
  it('fails closed for cross-club membership writes and allows same-club approvals', () => {
    expect(applyMembershipMutation({ actorClubId: 'club-1', targetClubId: 'club-2', action: 'approve', memberId: 'u-1' }))
      .toEqual({ ok: false, reason: 'cross-club-mutation' });

    expect(applyMembershipMutation({ actorClubId: 'club-1', targetClubId: 'club-1', action: 'promote', memberId: 'u-2' }))
      .toEqual({ ok: true, memberId: 'u-2', action: 'promote' });
  });
});
