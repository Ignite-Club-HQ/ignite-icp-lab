import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'lab-runtime-files.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const forbiddenPatterns = [
  /import\.meta\.env\.[A-Z0-9_]+/i,
  /process\.env\.[A-Z0-9_]+/i,
  /VITE_SUPABASE_[A-Z0-9_]+/i,
  /SUPABASE_[A-Z0-9_]+_KEY/i,
  /STRIPE_(SECRET|WEBHOOK_SECRET|API_KEY)/i,
  /RESEND_API_KEY/i,
  /VAPID_PRIVATE_KEY/i,
  /FCM_(SERVICE_ACCOUNT|.*KEY)/i,
  /GOOGLE_APPLICATION_CREDENTIALS|GOOGLE_CLIENT_SECRET|GOOGLE_CLIENT_ID/i,
  /SENDGRID_API_KEY|TWILIO_AUTH_TOKEN|AUTH0_CLIENT_SECRET|OPENAI_API_KEY|GEMINI_API_KEY|LOVABLE_API_KEY/i,
  /NETLIFY_[A-Z0-9_]+/i,
  /\.supabase\.(co|com)/i,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/i,
  /service-role|master key|secret key/i,
];

let failed = false;

for (const rel of manifest) {
  const filePath = path.resolve(root, rel);
  if (!fs.existsSync(filePath)) continue;

  const text = fs.readFileSync(filePath, 'utf8');
  const matches = forbiddenPatterns
    .filter(pattern => pattern.test(text))
    .map(pattern => pattern.toString());

  if (matches.length > 0) {
    console.error(`Forbidden secret or production env reference in ${rel}: ${matches.join(', ')}`);
    failed = true;
  }
}

if (failed) {
  console.error('Production secret guard failed.');
  process.exit(1);
}

console.log('Production secret guard passed: no production secret references detected in the deployable runtime bundle.');
