import { createClient } from '@supabase/supabase-js';

// Read Supabase credentials from environment variables
export const SUPABASE_URL = 'https://ttfwcadegttbvtksindn.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0ZndjYWRlZ3R0YnZ0a3NpbmRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNzk1ODAsImV4cCI6MjA4Mzk1NTU4MH0.v5iNq9z2H2doIAJXAo9A54O3yGiSTWtajCnPn_Bq9UM';

// Robust check for configuration
const isConfigured =
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  SUPABASE_URL.startsWith('http');

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  })
  : null;
export const isSupabaseReady = isConfigured;

// Mock user for testing if Supabase is not ready
const MOCK_USER = {
  id: 'mock-user-id',
  email: 'ryan@grafydesign.com',
  user_metadata: {
    full_name: '라이언 그래피',
    avatar_url: 'https://ui-avatars.com/api/?name=Ryan+Grafy&background=random'
  }
};

export const signInWithGoogle = async () => {
  if (!supabase || !isSupabaseReady) {
    console.warn("Supabase is not configured. Falling back to Mock Login for testing.");
    return { data: { user: MOCK_USER, session: { user: MOCK_USER } }, error: null };
  }

  const redirectUrl = window.location.origin;
  console.log("Supabase Auth Redirecting to:", redirectUrl);

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent select_account'
        }
      }
    });
    return { data, error };
  } catch (e) {
    console.error("Login failed, using mock as fallback:", e);
    return { data: { user: MOCK_USER, session: { user: MOCK_USER } }, error: null };
  }
};

export const signOut = async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
};