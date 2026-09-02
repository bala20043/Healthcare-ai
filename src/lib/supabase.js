import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Client Configuration
 *
 * IMPORTANT: Google OAuth Setup
 * For Google Sign-In to work, you must configure the redirect/site URL
 * in the Supabase Dashboard:
 *   1. Go to Authentication > URL Configuration
 *   2. Set "Site URL" to your deployed URL (e.g., http://localhost:5173 for dev)
 *   3. Add any additional redirect URLs to "Redirect URLs"
 *   4. Enable Google provider under Authentication > Providers > Google
 *   5. Add your Google OAuth Client ID and Secret
 *
 * These are manual dashboard steps outside the codebase.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase environment variables. ' +
    'Copy .env.example to .env and fill in your Supabase project URL and anon key.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
