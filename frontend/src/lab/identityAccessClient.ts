import type { _SERVICE } from './bindings/identity_access/declarations/identity_access.did.js';

export type IdentityAccessClient = ReturnType<typeof createIdentityAccessClient>;

export function createIdentityAccessClient(actor: _SERVICE) {
  let disposed = false;
  const live = () => { if (disposed) throw new Error('Identity changed; operation discarded'); };
  const call = async <T>(operation: () => Promise<{ Ok: T } | { Err: string }>) => {
    live();
    const result = await operation();
    live();
    if ('Err' in result) throw new Error(result.Err);
    return result.Ok;
  };
  return {
    whoami: () => call(() => actor.whoami()),
    access: (club?: string, team?: string, child?: string) => call(() => actor.access(club ? [club] : [], team ? [team] : [], child ? [child] : [])),
    checkFieldAccess: (accountId: string, section: string) => call(() => actor.check_field_access(accountId, section)),
    beginLink: (target: Parameters<_SERVICE['begin_link']>[0]) => call(() => actor.begin_link(target)),
    acceptLink: (id: bigint) => call(() => actor.accept_link(id)),
    revoke: (principal: Parameters<_SERVICE['revoke']>[0], expectedVersion: bigint) => call(() => actor.revoke(principal, expectedVersion)),
    dispose() { disposed = true; },
  };
}
