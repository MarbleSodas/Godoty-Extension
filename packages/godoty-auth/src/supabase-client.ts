import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kbnaymejrngxhpigwphh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_crqwAKS-G2fVqkyOTr95lQ_SQu-vaj3';

declare global {
  var __godotyStorage: {
    get: (key: string) => string | null | Promise<string | null>;
    set: (key: string, value: string) => void | Promise<void>;
    delete: (key: string) => void | Promise<void>;
  } | undefined;
  var __godotyAuthEmitter: {
    fire: (event: { event: string; session: Session | null }) => void;
  } | undefined;
}

export interface UserProfile {
  user_id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  preferences: UserPreferences;
  created_at: string;
  usage_summary?: {
    total_tokens: number;
    total_cost: number;
  };
}

export interface UserPreferences {
  defaultModel: string;
  theme: 'light' | 'dark' | 'auto';
  autoConnect: boolean;
  godotPath?: string;
}

export class GodotyAuthClient {
  private supabase: SupabaseClient;
  private currentUser: User | null = null;
  private currentSession: Session | null = null;

  constructor(url?: string, anonKey?: string) {
    this.supabase = createClient(
      url || SUPABASE_URL,
      anonKey || SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          storage: {
            getItem: (key) => this.getStoredItem(key),
            setItem: (key, value) => this.setStoredItem(key, value),
            removeItem: (key) => this.removeStoredItem(key)
          }
        }
      }
    );

    this.supabase.auth.onAuthStateChange((event, session) => {
      this.currentSession = session;
      this.currentUser = session?.user || null;
      this.onAuthStateChange(event, session);
    });
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  async signUp(email: string, password: string): Promise<{ user: User | null; error: Error | null }> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          source: 'godoty-extension'
        }
      }
    });

    if (error) {
      return { user: null, error };
    }

    if (data.user) {
      await this.createUserProfile(data.user);
    }

    return { user: data.user, error: null };
  }

  async signIn(email: string, password: string): Promise<{ user: User | null; error: Error | null }> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { user: null, error };
    }

    return { user: data.user, error: null };
  }

  async signInWithOAuth(provider: 'github' | 'google'): Promise<{ url: string | null; error: Error | null }> {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: 'vscode://godoty.godoty/auth/callback',
        skipBrowserRedirect: true
      }
    });

    if (error) {
      return { url: null, error };
    }

    return { url: data.url, error: null };
  }

  async handleOAuthCallback(url: string): Promise<{ user: User | null; error: Error | null }> {
    const hashParams = new URLSearchParams(url.split('#')[1]);
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (!accessToken) {
      return { user: null, error: new Error('No access token in callback') };
    }

    const { data, error } = await this.supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || ''
    });

    if (error) {
      return { user: null, error };
    }

    if (data.user) {
      await this.createUserProfile(data.user);
    }

    return { user: data.user, error: null };
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }

  getUser(): User | null {
    return this.currentUser;
  }

  getSession(): Session | null {
    return this.currentSession;
  }

  async getLiteLLMApiKey(): Promise<string | null> {
    const user = this.getUser();
    if (!user) return null;

    const { data, error } = await this.supabase
      .from('user_api_keys')
      .select('litellm_key')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return null;
    }

    return data.litellm_key;
  }

  async getUserProfile(): Promise<UserProfile | null> {
    const user = this.getUser();
    if (!user) return null;

    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) return null;
    return data;
  }

  async updatePreferences(preferences: UserPreferences): Promise<void> {
    const user = this.getUser();
    if (!user) throw new Error('Not authenticated');

    await this.supabase
      .from('user_profiles')
      .update({ preferences })
      .eq('user_id', user.id);
  }

  private async createUserProfile(user: User): Promise<void> {
    await this.supabase.from('user_profiles').upsert({
      user_id: user.id,
      email: user.email,
      display_name: user.user_metadata?.full_name || user.email?.split('@')[0],
      avatar_url: user.user_metadata?.avatar_url,
      created_at: new Date().toISOString(),
      preferences: {
        defaultModel: 'gpt-4o-mini',
        theme: 'auto',
        autoConnect: true
      }
    });
  }

  private getStoredItem(key: string): string | null {
    const result = globalThis.__godotyStorage?.get(key);
    if (result instanceof Promise) {
      return null;
    }
    return result || null;
  }

  private setStoredItem(key: string, value: string): void {
    globalThis.__godotyStorage?.set(key, value);
  }

  private removeStoredItem(key: string): void {
    globalThis.__godotyStorage?.delete(key);
  }

  private onAuthStateChange(event: string, session: Session | null): void {
    globalThis.__godotyAuthEmitter?.fire({ event, session });
  }
}
