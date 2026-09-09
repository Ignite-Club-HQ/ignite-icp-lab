// Fail closed for every unported caller. No SDK, endpoint, token or auth storage.
const disabled = () => { throw new Error('Supabase is disabled in ignite-icp-lab. Port this feature to a local service.'); };
export const supabase: any = new Proxy(disabled, { get: disabled, apply: disabled });
