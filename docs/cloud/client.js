import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

// Browser code is public. Never permit a server-side secret/service_role key here.
export function isPublicSupabaseKey(key) {
  if (typeof key !== 'string') return false;
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
  const parts=key.split('.');
  if (parts.length!==3 || !parts.every(part=>/^[A-Za-z0-9_-]+$/.test(part))) return false;
  try {
    const payload=JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
    return payload.role==='anon';
  } catch { return false; }
}
export const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(SUPABASE_URL)
  && isPublicSupabaseKey(SUPABASE_PUBLISHABLE_KEY);
export const configError = configured ? '' : 'Die Kontenfunktion ist noch nicht mit einem gültigen Supabase-Projekt verbunden. Trage nur die Projekt-URL und den Publishable- bzw. anon-Key in cloud/config.js ein (keinen Secret-Key).';

let instance;
export async function getClient() {
  if (!configured) throw new Error(configError);
  if (!instance) {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    instance = createClient(SUPABASE_URL.replace(/\/$/, ''), SUPABASE_PUBLISHABLE_KEY, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true, flowType: 'pkce' }
    });
  }
  return instance;
}
export function baseUrl(file) { return new URL(file, import.meta.url).href; }
