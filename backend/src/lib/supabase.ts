import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

// Polyfill minimal para ambientes Node.js antigos que não possuem WebSocket global
if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class {};
}

let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAdmin;
}
