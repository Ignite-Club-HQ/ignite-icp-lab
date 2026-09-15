export function resolveLocalAuthMode(search: string, localLabMode = true): boolean {
  if (!localLabMode) return false;
  const params = new URLSearchParams(search);
  const explicit = params.get('backend');
  if (explicit === 'supabase') return false;
  return true;
}
