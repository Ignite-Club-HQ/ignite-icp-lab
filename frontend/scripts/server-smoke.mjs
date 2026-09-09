import assert from 'node:assert/strict';
const base='http://127.0.0.1:5180';
const root=await fetch(base); assert.equal(root.status,200);
assert(root.headers.get('content-security-policy').includes("connect-src 'self'"));
const html=await root.text(); assert(!/<script[^>]*>\s*[^<\s]/.test(html), 'Unexpected inline executable script');
const main=await fetch(base+'/src/main.tsx'); assert.equal(main.status,200);
const blocked=await fetch(base+'/src/App.tsx'); assert.equal(blocked.status,500);
const local=await fetch(base+'/icp/api/v2/status'); assert.equal(local.status,500);
console.log('Dev server smoke passed: CSP present, main served, unported App blocked, absent ICP fails locally.');
