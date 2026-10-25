import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { env, isDemo } from './env';
import { createDemoClient } from './demo/client';
import type { Database } from './database.types';

/**
 * Client Supabase unique. La clé anon est publique par design : la sécurité repose sur la RLS.
 * Session persistée dans AsyncStorage (les jetons dépassent la limite de 2 ko de SecureStore).
 */
const realClient = () =>
  createClient<Database>(env.supabaseUrl || 'http://127.0.0.1:54321', env.supabaseAnonKey || 'anon-key-missing', {
    auth: {
      storage: Platform.OS === 'web' && typeof window === 'undefined' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
      flowType: 'pkce',
    },
  });

export const supabase: SupabaseClient<Database> = isDemo ? (createDemoClient() as unknown as SupabaseClient<Database>) : realClient();

// Rafraîchit le jeton seulement quand l'app est au premier plan (recommandation Supabase pour RN).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });
}
