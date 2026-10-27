import { createClient } from '@supabase/supabase-js';
import { getSession } from './api.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// A dedicated browser client, separate from the REST calls in api.js —
// this one exists only to carry the Realtime websocket. Its auth session is
// synced to whatever's in localStorage so Realtime's RLS checks
// (visit_logs/invoices/etc. gate on is_staff()) see the same identity as
// every REST call already does.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

let syncedToken = null;

export async function syncRealtimeAuth() {
  const session = getSession();
  const token = session?.accessToken ?? null;
  if (token === syncedToken) return;
  syncedToken = token;

  if (token && session?.refreshToken) {
    try {
      await supabase.auth.setSession({ access_token: token, refresh_token: session.refreshToken });
    } catch {
      // Ignore
    }
  } else {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
  }
}
