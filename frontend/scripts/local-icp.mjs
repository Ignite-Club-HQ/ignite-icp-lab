// Fixed local-only orchestration. No arbitrary CLI flags or target URLs accepted.
import { execFileSync } from 'node:child_process';
import { createPrivateKey } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { lifecycle, requireOwnedNetwork } from './local-lifecycle.mjs';
import { parse } from 'yaml';
import { IDL } from '@icp-sdk/core/candid';
import { init } from '../src/lab/bindings/declarations/club_links.did.js';
import { syntheticIdentity, syntheticAcl } from '../src/lab/syntheticIdentities.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const local = path.join(root, '.local-icp');
fs.mkdirSync(local, { recursive: true });
const env = { PATH: process.env.PATH, DO_NOT_TRACK: '1',
  XDG_CONFIG_HOME: path.join(local, 'config'), XDG_CACHE_HOME: path.join(local, 'cache'),
  XDG_DATA_HOME: path.join(local, 'share'),
  CARGO_HOME: process.env.CARGO_HOME, RUSTUP_HOME: process.env.RUSTUP_HOME, TMPDIR: '/tmp',
  ICP_PROJECT_ROOT: root };
for (const key of Object.keys(env)) if (!env[key]) delete env[key];
function icp(args, capture = false) { return execFileSync('icp', ['--project-root-override', root, ...args], { cwd: root, env, stdio: capture ? ['ignore','pipe','inherit'] : 'inherit', encoding: 'utf8' }); }
function prepare() {
  fs.writeFileSync(path.join(local, 'init.bin'), new Uint8Array(IDL.encode(init({ IDL }), [syntheticIdentity('governor').getPrincipal(), syntheticAcl()])));
  const identityInit = IDL.Record({ governor: IDL.Principal });
  fs.writeFileSync(path.join(local, 'identity-init.bin'), new Uint8Array(IDL.encode([identityInit], [{ governor: syntheticIdentity('governor').getPrincipal() }])));
  fs.writeFileSync(path.join(local, 'events-domain-init.bin'), new Uint8Array(IDL.encode([IDL.Record({ governor: IDL.Principal })], [{ governor: syntheticIdentity('governor').getPrincipal() }])));
  fs.writeFileSync(path.join(local, 'competition-domain-init.bin'), new Uint8Array(IDL.encode([IDL.Record({ governor: IDL.Principal })], [{ governor: syntheticIdentity('governor').getPrincipal() }])));
  fs.writeFileSync(path.join(local, 'messaging-domain-init.bin'), new Uint8Array(IDL.encode([IDL.Record({ governor: IDL.Principal })], [{ governor: syntheticIdentity('governor').getPrincipal() }])));
  fs.writeFileSync(path.join(local, 'media-metadata-init.bin'), new Uint8Array(IDL.encode([IDL.Record({ governor: IDL.Principal })], [{ governor: syntheticIdentity('governor').getPrincipal() }])));
  fs.writeFileSync(path.join(local, 'placement-registry-init.bin'), new Uint8Array(IDL.encode([IDL.Record({ governor: IDL.Principal })], [{ governor: syntheticIdentity('governor').getPrincipal() }])));
  fs.writeFileSync(path.join(local, 'shard-router-init.bin'), new Uint8Array(IDL.encode([IDL.Record({ governor: IDL.Principal })], [{ governor: syntheticIdentity('governor').getPrincipal() }])));
  const pem = path.join(local, 'governor.pem');
  if (!fs.existsSync(pem)) {
    const key = createPrivateKey({ key: Buffer.concat([Buffer.from('302e020100300506032b657004220420','hex'), Buffer.alloc(32,1)]), format: 'der', type: 'pkcs8' });
    fs.writeFileSync(pem, key.export({ format: 'pem', type: 'pkcs8' }), { mode: 0o600 });
  }
}
function identity() {
  const names = icp(['identity','list'], true);
  if (!names.includes('ignite-lab-governor')) icp(['identity','import','ignite-lab-governor','--from-pem',path.join(local,'governor.pem'),'--storage','plaintext']);
}
function resetLocalLabState() {
  for (const file of [
    path.join(root, '.icp/cache/mappings/local.ids.json'),
    path.join(local, 'public.json'),
    path.join(local, 'resume-network.json'),
    path.join(local, 'latest-backup.json'),
  ]) {
    try { fs.rmSync(file, { force: true }); } catch {}
  }
  try { icp(['network', 'stop', 'local']); } catch {}
  try {
    execFileSync('pkill', ['-f', 'pocket-ic.*4943'], { cwd: root, env, stdio: 'ignore' });
  } catch {}
}
function isLocalNetworkRunning() {
  try {
    const status = JSON.parse(icp(['network','status','local','--json'], true));
    return !!status?.managed;
  } catch {
    return false;
  }
}
function publicConfig() {
  requireOwnedNetwork(root);
  const status = JSON.parse(icp(['network','status','local','--json'], true));
  if (!status.managed || status.root_key_source !== 'managed' || !['http://localhost:4943/','http://127.0.0.1:4943/'].includes(status.api_url)) throw new Error('Not the expected loopback network');
  const mapping = JSON.parse(fs.readFileSync(path.join(root,'.icp/cache/mappings/local.ids.json'),'utf8'));
  const clubLinksId = mapping.club_domain;
  const canisterIds = Object.fromEntries(Object.entries(mapping).filter(([, value]) => typeof value === 'string' && value.length > 0));
  const data = { network: 'local', canisterId: clubLinksId, identityAccessCanisterId: mapping.identity_access, canisterIds, rootKey: status.root_key };
  if (!data.canisterId || !data.identityAccessCanisterId || !/^[0-9a-f]{266}$/i.test(data.rootKey)) throw new Error('Missing local binding');
  fs.writeFileSync(path.join(local,'public.json'), JSON.stringify(data,null,2)+'\n');
  return data;
}
const project=parse(fs.readFileSync(path.join(root,'icp.yaml'),'utf8'));
const network=project.networks?.find(n=>n.name==='local');
const environment=project.environments?.find(e=>e.name==='local');
if (network?.mode!=='managed' || network.gateway?.bind!=='127.0.0.1' || network.gateway?.port!==4943 || environment?.network!=='local') throw new Error('Local target configuration changed; refusing lifecycle action');
prepare();
const flow=lifecycle({root,local,icp,publicConfig});
const action = process.argv[2];
if (process.argv.length !== 3) throw new Error('One local action required');
const lock=path.join(local,'lifecycle.lock');
fs.mkdirSync(lock); // Concurrent lifecycle actions fail closed, never break a possibly live lock.
try { switch (action) {
  case 'prepare': break;
  case 'start': identity(); flow.start(); break;
  case 'stop': await flow.stop(); break;
  case 'restart': await flow.stop(); flow.start(); break;
  case 'backup': flow.backup(); break;
  case 'verify-backup': flow.verify(); console.log('Full backup checksums verified.'); break;
  case 'full-restore-probe': flow.probe(); break;
  case 'status': icp(['network','status','local','--json']); break;
  case 'connect': publicConfig(); break;
  case 'restore-probe': {
    publicConfig();
    const id = icp(['canister','create','--detached','-n','local','--identity','ignite-lab-governor','--quiet'],true).trim();
    if (!/^[a-z0-9-]+$/.test(id)) throw new Error('Invalid local probe ID');
    icp(['canister','install',id,'-n','local','--identity','ignite-lab-governor','--mode','install','--wasm','target/wasm32-unknown-unknown/release/club_links.wasm','--args-file',path.join(local,'init.bin'),'--args-format','bin']);
    fs.writeFileSync(path.join(local,'restore-probe.json'),JSON.stringify({ canisterId: id })+'\n');
    break;
  }
  case 'deploy':
  case 'upgrade': {
    identity();
    if (!isLocalNetworkRunning()) {
      icp(['network', 'start', 'local', '-d']);
    }
    const mappingPath = path.join(root, '.icp/cache/mappings/local.ids.json');
    const publicPath = path.join(local, 'public.json');
    const staleState = fs.existsSync(mappingPath) || fs.existsSync(publicPath);
    if (staleState) {
      resetLocalLabState();
      icp(['network', 'start', 'local', '-d']);
    }
    if (fs.existsSync(mappingPath)) flow.backup();
    icp(['deploy','-e','local','--identity','ignite-lab-governor', ...(action === 'upgrade' ? ['--mode','upgrade','--no-create','--args','()'] : [])]);
    publicConfig();
    break;
  }
  default: throw new Error('Allowed actions: prepare, start, stop, restart, backup, verify-backup, full-restore-probe, status, deploy, upgrade, connect, restore-probe');
}
} finally { fs.rmdirSync(lock); }
