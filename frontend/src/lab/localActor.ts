import { Actor, HttpAgent } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { idlFactory } from './bindings/declarations/club_links.did.js';
import type { _SERVICE } from './bindings/declarations/club_links.did.js';
import { syntheticIdentity } from './syntheticIdentities.mjs';

export interface LocalConfig { canisterId: string; rootKey: string; network: 'local' }
export function validateLocalConfig(value: LocalConfig): LocalConfig {
  if (value?.network !== 'local' || !/^[0-9a-f]{266}$/i.test(value.rootKey)) throw new Error('Local ICP configuration is missing or invalid');
  const id = Principal.fromText(value.canisterId);
  if (id.isAnonymous() || id.toText() === 'aaaaa-aa') throw new Error('Invalid local canister ID');
  return value;
}
export async function createLocalActor(config: LocalConfig, persona: string, origin: string, transport: typeof fetch = globalThis.fetch) {
  validateLocalConfig(config);
  const base = new URL(origin);
  if (!['http:', 'https:'].includes(base.protocol) || base.origin !== origin) throw new Error('Invalid lab origin');
  // The current SDK resolves absolute /api paths. Rewrite every call to the fixed same-origin
  // lab proxy, including Codespaces custom domains. Never allow the SDK's mainnet default host.
  const localFetch: typeof fetch = (input, init) => {
    const target = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, origin);
    const base = new URL(origin);
    if (target.origin !== base.origin || !/^\/api\/(v2|v3|v4)\//.test(target.pathname) || target.username || target.password || target.hash || !['http:', 'https:'].includes(target.protocol)) {
      throw new Error('Non-local ICP request blocked');
    }
    target.pathname = `/icp${target.pathname}`;
    return transport(target, { ...init, credentials: 'omit', redirect: 'error', cache: 'no-store' });
  };
  const agent = await HttpAgent.create({
    host: origin, identity: syntheticIdentity(persona),
    rootKey: Uint8Array.from(config.rootKey.match(/../g)!, b => parseInt(b,16)),
    shouldFetchRootKey: false, shouldSyncTime: false, useQueryNonces: true,
    fetch: localFetch, retryTimes: 1,
  });
  // Raw generated Candid declarations use the core Actor API, not bindgen's wrapper API.
  return Actor.createActor<_SERVICE>(idlFactory, { agent, canisterId: config.canisterId });
}
export async function connectLocalActor(persona: string) {
  return (await connectLocalActorWithConfig(persona)).actor;
}

export async function connectLocalActorWithConfig(persona: string): Promise<{ actor: _SERVICE; canisterId: Principal }> {
  const response = await fetch('/icp/api/v2/lab-config', { cache: 'no-store' });
  if (!response.ok) throw new Error('Local ICP is not configured. Start and deploy the local canister.');
  const config = validateLocalConfig(await response.json());
  return { actor: await createLocalActor(config, persona, location.origin), canisterId: Principal.fromText(config.canisterId) };
}
