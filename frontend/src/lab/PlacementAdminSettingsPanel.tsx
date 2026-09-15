import { useState } from 'react';
import type { PlacementAdminController } from './placementAdminSettings';
import { detectDeviceCountry } from './deviceCountry';

export function PlacementAdminSettingsPanel({ controller }: { controller: PlacementAdminController }) {
  const [settings, setSettings] = useState(controller.settings());
  const [message, setMessage] = useState('');
  const [country, setCountry] = useState('AU');
  const [backend, setBackend] = useState<'icp' | 'supabase'>('supabase');
  const [clubId, setClubId] = useState('hybrid-au');
  const deviceCountry = detectDeviceCountry();

  const selected = settings.countries.find(item => item.country === country);
  const selectedTarget = selected?.policies.find(item => item.backend === backend && item.enabled);

  function assign() {
    try {
      if (!selectedTarget) throw new Error(`No approved ${backend} target for ${country}`);
      controller.assignClub({ clubId, country, backend, targetAlias: selectedTarget.targetAlias, version: selectedTarget.version });
      setSettings(controller.settings());
      setMessage(`${clubId} is assigned to ${country} · ${backend} · ${selectedTarget.targetAlias} ${selectedTarget.version}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Assignment rejected');
    }
  }

  return <section aria-label="Placement settings" className="rounded-lg border p-5">
    <div className="flex items-center justify-between gap-4">
      <div><h2 className="text-xl font-semibold">Placement settings</h2><p className="text-sm text-muted-foreground">App-admin control plane · country policy always wins over club selection.</p>{deviceCountry && <p className="text-xs text-muted-foreground">Device locale suggests {deviceCountry}; this is advisory only.</p>}</div>
      <span className="text-xs text-muted-foreground">Synthetic lab</span>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-4">
      <label className="text-sm">Club ID<input className="mt-1 w-full rounded border p-2" value={clubId} onChange={event => setClubId(event.target.value)} /></label>
      <label className="text-sm">Country<select className="mt-1 w-full rounded border p-2" value={country} onChange={event => setCountry(event.target.value)}>{settings.countries.map(item => <option key={item.country}>{item.country}</option>)}</select></label>
      <label className="text-sm">Backend<select className="mt-1 w-full rounded border p-2" value={backend} onChange={event => setBackend(event.target.value as 'icp' | 'supabase')}><option value="supabase">Supabase</option><option value="icp">ICP</option></select></label>
      <button className="self-end rounded border px-3 py-2 text-sm font-medium" type="button" onClick={assign}>Assign approved target</button>
    </div>
    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
      {settings.countries.map(policy => <div className="rounded border p-3" key={policy.country}><strong>{policy.country}</strong><p className="text-muted-foreground">Allowed: {policy.allowedBackends.join(', ') || 'none'}</p>{policy.policies.map(target => <p key={`${policy.country}-${target.backend}`}>{target.backend}: {target.enabled ? `${target.targetAlias} · ${target.version}` : 'disabled'}</p>)}</div>)}
    </div>
    {message && <p className="mt-3 text-sm" role="status">{message}</p>}
  </section>;
}
