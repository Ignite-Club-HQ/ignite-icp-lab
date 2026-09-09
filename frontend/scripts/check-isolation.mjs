import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
for (const name of fs.readdirSync(root)) assert(!name.startsWith('.env'), 'Environment files are forbidden in the frontend');
for (const key of Object.keys(process.env)) assert(!/SUPABASE|FIREBASE|STRIPE_SECRET|GOOGLE_APPLICATION_CREDENTIALS/.test(key), 'Production integration environment variable present');
const pkg=JSON.parse(read('package.json'));
for (const key of ['preinstall','install','postinstall','prepare','prebuild','postbuild','deploy']) assert(!pkg.scripts[key], 'Unexpected lifecycle/deployment script');
assert(!fs.existsSync(path.join(root,'public/sw.js')), 'Service workers are forbidden');
assert(!read('src/main.tsx').includes('from "./App'), 'Production bootstrap must stay disconnected');
assert(read('src/main.tsx').includes('installNetworkGuard();'), 'Missing network guard');
assert(read('src/integrations/supabase/client.ts').includes('new Proxy(disabled'), 'Supabase fail-closed stub missing');
const allowed=JSON.parse(read('lab-runtime-files.json'));
for (const p of allowed) {
  const text=read(p);
  assert(!/@supabase|@capacitor|@capgo|from ['"]firebase|integrations\/supabase/.test(text), `Forbidden integration in ${p}`);
  assert(!/import\.meta\.env|process\.env/.test(text), `Runtime environment access in ${p}`);
  assert(!/\.supabase\.(co|com)|\beyJ[\w-]+\.[\w-]+\.[\w-]+/.test(text), `Credential or production endpoint in ${p}`);
}
assert(read('index.html').includes("connect-src 'self'"), 'Missing restrictive CSP');
assert(read('vite.config.ts').includes("target: 'http://127.0.0.1:4943'"), 'Local ICP proxy must stay fixed');
console.log('Lab isolation checks passed: allowlisted runtime, blocked integrations, no environment configuration.');
