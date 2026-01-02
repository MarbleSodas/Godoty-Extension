# Godoty Backend Services

> LiteLLM Proxy and Supabase Integration for AI and Account Management

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [LiteLLM Integration](#litellm-integration)
4. [Supabase Integration](#supabase-integration)
5. [Authentication Flow](#authentication-flow)
6. [API Endpoints](#api-endpoints)
7. [Database Schema](#database-schema)
8. [Configuration](#configuration)
9. [Security](#security)
10. [Error Handling](#error-handling)

---

## Overview

Godoty uses a custom backend infrastructure for AI model access and user management:

| Service | Purpose | URL |
|---------|---------|-----|
| **LiteLLM Proxy** | Unified LLM API gateway | `https://litellm-production-150c.up.railway.app` |
| **Supabase** | Authentication & database | `https://kbnaymejrngxhpigwphh.supabase.co` |

### Benefits

- **LiteLLM**: Single API for 100+ LLM providers (OpenAI, Anthropic, Gemini, etc.)
- **Supabase**: Managed auth, real-time database, and row-level security
- **Cost Tracking**: Monitor token usage per user
- **Rate Limiting**: Control API access per tier

---

## Architecture

### Complete System Architecture with Backend Services

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    CLOUD SERVICES                                    │
│                                                                                      │
│  ┌─────────────────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │         LITELLM PROXY               │  │           SUPABASE                   │  │
│  │  litellm-production-150c.up.        │  │  kbnaymejrngxhpigwphh.supabase.co   │  │
│  │  railway.app                        │  │                                      │  │
│  │                                     │  │  ┌─────────────────────────────────┐│  │
│  │  ┌─────────────────────────────┐   │  │  │          AUTH                    ││  │
│  │  │     Model Router            │   │  │  │  - Email/Password                ││  │
│  │  │  - OpenAI                   │   │  │  │  - OAuth (GitHub, Google)        ││  │
│  │  │  - Anthropic                │   │  │  │  - Magic Link                    ││  │
│  │  │  - Google Gemini            │   │  │  │  - JWT Tokens                    ││  │
│  │  │  - Local Models             │   │  │  └─────────────────────────────────┘│  │
│  │  └─────────────────────────────┘   │  │                                      │  │
│  │                                     │  │  ┌─────────────────────────────────┐│  │
│  │  ┌─────────────────────────────┐   │  │  │        DATABASE                  ││  │
│  │  │     Usage Tracking          │   │  │  │  - User profiles                 ││  │
│  │  │  - Token counting           │   │  │  │  - Usage records                 ││  │
│  │  │  - Cost calculation         │   │  │  │  - Preferences                   ││  │
│  │  │  - Rate limiting            │   │  │  │  - API keys                      ││  │
│  │  └─────────────────────────────┘   │  │  └─────────────────────────────────┘│  │
│  │                                     │  │                                      │  │
│  │  ┌─────────────────────────────┐   │  │  ┌─────────────────────────────────┐│  │
│  │  │     API Key Management      │   │  │  │      REALTIME                    ││  │
│  │  │  - Virtual keys per user    │   │  │  │  - Usage updates                 ││  │
│  │  │  - Spend limits             │   │  │  │  - Quota notifications           ││  │
│  │  │  - Model access control     │   │  │  └─────────────────────────────────┘│  │
│  │  └─────────────────────────────┘   │  │                                      │  │
│  └─────────────────────────────────────┘  └─────────────────────────────────────┘  │
│                     │                                      │                         │
│                     │ HTTPS                                │ HTTPS                   │
│                     │                                      │                         │
└─────────────────────┼──────────────────────────────────────┼─────────────────────────┘
                      │                                      │
                      │                                      │
┌─────────────────────┼──────────────────────────────────────┼─────────────────────────┐
│                     │         VS CODE EXTENSION            │                         │
│                     │                                      │                         │
│  ┌──────────────────┴──────────────────────────────────────┴──────────────────────┐ │
│  │                           GODOTY EXTENSION                                      │ │
│  │                                                                                 │ │
│  │  ┌───────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                         AUTH SERVICE                                       │ │ │
│  │  │                                                                            │ │ │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │ │ │
│  │  │  │   Supabase   │  │    Token     │  │   Session    │  │    User      │  │ │ │
│  │  │  │    Client    │  │   Manager    │  │   Storage    │  │   Profile    │  │ │ │
│  │  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │ │ │
│  │  └───────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                                 │ │
│  │  ┌───────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                         LLM SERVICE                                        │ │ │
│  │  │                                                                            │ │ │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │ │ │
│  │  │  │   LiteLLM    │  │    Model     │  │    Usage     │  │   Streaming  │  │ │ │
│  │  │  │    Client    │  │   Selector   │  │   Tracker    │  │   Handler    │  │ │ │
│  │  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │ │ │
│  │  └───────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                                 │ │
│  │  ┌───────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                       KILO CODE CORE (Modified)                            │ │ │
│  │  │                                                                            │ │ │
│  │  │  Uses LLM Service instead of direct provider APIs                          │ │ │
│  │  │  Uses Auth Service for user context                                        │ │ │
│  │  └───────────────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                          │                                           │
│                                          │ WebSocket                                 │
│                                          │                                           │
└──────────────────────────────────────────┼───────────────────────────────────────────┘
                                           │
                                           │
┌──────────────────────────────────────────┼───────────────────────────────────────────┐
│                                   GODOT EDITOR                                        │
│                                          │                                            │
│  ┌───────────────────────────────────────┴─────────────────────────────────────────┐ │
│  │                          GODOTY BRIDGE PLUGIN                                    │ │
│  │                          (No auth required - local only)                         │ │
│  └──────────────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

---

## LiteLLM Integration

### Configuration

```typescript
// Environment variables
const LITELLM_CONFIG = {
  baseUrl: process.env.VITE_LITELLM_URL || 'https://litellm-production-150c.up.railway.app',
  defaultModel: 'gpt-4o',
  timeout: 120000,
  maxRetries: 3
};
```

### LiteLLM Client Implementation

```typescript
// packages/godoty-llm/src/litellm-client.ts

import { SupabaseClient } from '@supabase/supabase-js';

interface LiteLLMConfig {
  baseUrl: string;
  apiKey?: string;  // Virtual key from LiteLLM
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;  // base64 data URL or http URL
  };
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: Tool[];
}

interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: 'stop' | 'tool_calls' | 'length';
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class LiteLLMClient {
  private baseUrl: string;
  private apiKey: string | null = null;
  private supabase: SupabaseClient;

  constructor(config: LiteLLMConfig, supabase: SupabaseClient) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey || null;
    this.supabase = supabase;
  }

  /**
   * Set the API key (virtual key from LiteLLM)
   * Called after user authentication
   */
  setApiKey(key: string): void {
    this.apiKey = key;
  }

  /**
   * Get available models from LiteLLM
   */
  async getModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data.map((m: any) => m.id);
  }

  /**
   * Create a chat completion
   */
  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new LiteLLMError(error.error?.message || 'Request failed', response.status);
    }

    const result = await response.json();
    
    // Track usage in Supabase
    await this.trackUsage(request.model, result.usage);
    
    return result;
  }

  /**
   * Create a streaming chat completion
   */
  async *createChatCompletionStream(
    request: ChatCompletionRequest
  ): AsyncGenerator<string, void, unknown> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...request, stream: true })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new LiteLLMError(error.error?.message || 'Request failed', response.status);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';
    let totalTokens = { prompt: 0, completion: 0 };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            // Track usage at end of stream
            await this.trackUsage(request.model, {
              prompt_tokens: totalTokens.prompt,
              completion_tokens: totalTokens.completion,
              total_tokens: totalTokens.prompt + totalTokens.completion
            });
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
            // Accumulate token counts if provided
            if (parsed.usage) {
              totalTokens.prompt = parsed.usage.prompt_tokens || totalTokens.prompt;
              totalTokens.completion += parsed.usage.completion_tokens || 0;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  /**
   * Create completion with vision (images)
   */
  async createVisionCompletion(
    model: string,
    textPrompt: string,
    images: string[],  // base64 data URLs
    systemPrompt?: string
  ): Promise<ChatCompletionResponse> {
    const messages: ChatMessage[] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    const userContent: ContentPart[] = [
      { type: 'text', text: textPrompt }
    ];

    for (const image of images) {
      userContent.push({
        type: 'image_url',
        image_url: { url: image }
      });
    }

    messages.push({ role: 'user', content: userContent });

    return this.createChatCompletion({
      model,
      messages,
      max_tokens: 4096
    });
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  private async trackUsage(model: string, usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  }): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return;

      await this.supabase.from('usage_records').insert({
        user_id: user.id,
        model,
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.warn('Failed to track usage:', error);
    }
  }
}

class LiteLLMError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'LiteLLMError';
  }
}
```

### Model Configuration

```typescript
// packages/godoty-llm/src/models.ts

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  supportsVision: boolean;
  supportsTools: boolean;
  costPer1kInput: number;   // USD
  costPer1kOutput: number;  // USD
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  // OpenAI
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    supportsVision: true,
    supportsTools: true,
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    contextWindow: 128000,
    supportsVision: true,
    supportsTools: true,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006
  },
  // Anthropic
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    supportsVision: true,
    supportsTools: true,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    contextWindow: 200000,
    supportsVision: true,
    supportsTools: true,
    costPer1kInput: 0.0008,
    costPer1kOutput: 0.004
  },
  // Google
  {
    id: 'gemini/gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    contextWindow: 1000000,
    supportsVision: true,
    supportsTools: true,
    costPer1kInput: 0.0,
    costPer1kOutput: 0.0
  },
  {
    id: 'gemini/gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    contextWindow: 2000000,
    supportsVision: true,
    supportsTools: true,
    costPer1kInput: 0.00125,
    costPer1kOutput: 0.005
  }
];

// Models recommended for Godot development (vision support required)
export const GODOT_RECOMMENDED_MODELS = AVAILABLE_MODELS.filter(
  m => m.supportsVision && m.supportsTools
);
```

---

## Supabase Integration

### Configuration

```typescript
// Environment variables
const SUPABASE_CONFIG = {
  url: process.env.VITE_SUPABASE_URL || 'https://kbnaymejrngxhpigwphh.supabase.co',
  anonKey: process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_crqwAKS-G2fVqkyOTr95lQ_SQu-vaj3'
};
```

### Supabase Client Implementation

```typescript
// packages/godoty-auth/src/supabase-client.ts

import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { Database } from './database.types';

const SUPABASE_URL = 'https://kbnaymejrngxhpigwphh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_crqwAKS-G2fVqkyOTr95lQ_SQu-vaj3';

export class GodotyAuthClient {
  private supabase: SupabaseClient<Database>;
  private currentUser: User | null = null;
  private currentSession: Session | null = null;

  constructor() {
    this.supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,  // VS Code extension doesn't use URLs
        storage: {
          getItem: (key) => this.getStoredItem(key),
          setItem: (key, value) => this.setStoredItem(key, value),
          removeItem: (key) => this.removeStoredItem(key)
        }
      }
    });

    // Listen for auth state changes
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.currentSession = session;
      this.currentUser = session?.user || null;
      this.onAuthStateChange(event, session);
    });
  }

  /**
   * Get the Supabase client instance
   */
  getClient(): SupabaseClient<Database> {
    return this.supabase;
  }

  /**
   * Sign up with email and password
   */
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

    // Create user profile
    if (data.user) {
      await this.createUserProfile(data.user);
    }

    return { user: data.user, error: null };
  }

  /**
   * Sign in with email and password
   */
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

  /**
   * Sign in with OAuth provider
   */
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

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(url: string): Promise<{ user: User | null; error: Error | null }> {
    // Extract tokens from URL
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

    // Create or update user profile
    if (data.user) {
      await this.createUserProfile(data.user);
    }

    return { user: data.user, error: null };
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }

  /**
   * Get current user
   */
  getUser(): User | null {
    return this.currentUser;
  }

  /**
   * Get current session
   */
  getSession(): Session | null {
    return this.currentSession;
  }

  /**
   * Get user's LiteLLM API key
   */
  async getLiteLLMApiKey(): Promise<string | null> {
    const user = this.getUser();
    if (!user) return null;

    const { data, error } = await this.supabase
      .from('user_api_keys')
      .select('litellm_key')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      // Generate new key if none exists
      return this.generateLiteLLMApiKey();
    }

    return data.litellm_key;
  }

  /**
   * Generate a new LiteLLM API key for the user
   */
  private async generateLiteLLMApiKey(): Promise<string | null> {
    const user = this.getUser();
    if (!user) return null;

    // Call LiteLLM to generate a virtual key
    const response = await fetch('https://litellm-production-150c.up.railway.app/key/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LITELLM_MASTER_KEY}`
      },
      body: JSON.stringify({
        user_id: user.id,
        team_id: 'godoty-users',
        max_budget: 10,  // $10 default budget
        models: ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet-20241022', 'gemini/gemini-2.0-flash']
      })
    });

    if (!response.ok) {
      console.error('Failed to generate LiteLLM key');
      return null;
    }

    const { key } = await response.json();

    // Store the key in Supabase
    await this.supabase.from('user_api_keys').upsert({
      user_id: user.id,
      litellm_key: key,
      created_at: new Date().toISOString()
    });

    return key;
  }

  /**
   * Get user profile with usage stats
   */
  async getUserProfile(): Promise<UserProfile | null> {
    const user = this.getUser();
    if (!user) return null;

    const { data, error } = await this.supabase
      .from('user_profiles')
      .select(`
        *,
        usage_summary:usage_records(
          total_tokens:total_tokens.sum(),
          total_cost:cost.sum()
        )
      `)
      .eq('user_id', user.id)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: UserPreferences): Promise<void> {
    const user = this.getUser();
    if (!user) throw new Error('Not authenticated');

    await this.supabase
      .from('user_profiles')
      .update({ preferences })
      .eq('user_id', user.id);
  }

  private async createUserProfile(user: User): Promise<void> {
    const { error } = await this.supabase.from('user_profiles').upsert({
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

    if (error) {
      console.error('Failed to create user profile:', error);
    }
  }

  // Storage implementation for VS Code extension context
  private getStoredItem(key: string): string | null {
    // Will be implemented to use VS Code's SecretStorage
    return globalThis.__godotyStorage?.get(key) || null;
  }

  private setStoredItem(key: string, value: string): void {
    globalThis.__godotyStorage?.set(key, value);
  }

  private removeStoredItem(key: string): void {
    globalThis.__godotyStorage?.delete(key);
  }

  private onAuthStateChange(event: string, session: Session | null): void {
    // Emit event to VS Code extension
    globalThis.__godotyAuthEmitter?.fire({ event, session });
  }
}

// Type definitions
interface UserProfile {
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

interface UserPreferences {
  defaultModel: string;
  theme: 'light' | 'dark' | 'auto';
  autoConnect: boolean;
  godotPath?: string;
}
```

---

## Authentication Flow

### Flow Diagram

```
┌─────────────┐                    ┌─────────────┐                    ┌─────────────┐
│   VS Code   │                    │  Supabase   │                    │   LiteLLM   │
│  Extension  │                    │    Auth     │                    │    Proxy    │
└──────┬──────┘                    └──────┬──────┘                    └──────┬──────┘
       │                                  │                                  │
       │  1. User clicks "Sign In"        │                                  │
       │──────────────────────────────────>                                  │
       │                                  │                                  │
       │  2. Return OAuth URL             │                                  │
       │<──────────────────────────────────                                  │
       │                                  │                                  │
       │  3. Open browser for OAuth       │                                  │
       │─────────────────────────────────────────────────────────>           │
       │                                  │                                  │
       │  4. User authenticates           │                                  │
       │                                  │                                  │
       │  5. Callback with tokens         │                                  │
       │<──────────────────────────────────                                  │
       │                                  │                                  │
       │  6. Exchange tokens for session  │                                  │
       │──────────────────────────────────>                                  │
       │                                  │                                  │
       │  7. Session established          │                                  │
       │<──────────────────────────────────                                  │
       │                                  │                                  │
       │  8. Request LiteLLM virtual key  │                                  │
       │─────────────────────────────────────────────────────────────────────>
       │                                  │                                  │
       │  9. Generate key for user        │                                  │
       │<─────────────────────────────────────────────────────────────────────
       │                                  │                                  │
       │  10. Store key in Supabase       │                                  │
       │──────────────────────────────────>                                  │
       │                                  │                                  │
       │  11. Ready to use AI             │                                  │
       │                                  │                                  │
```

### VS Code Extension Auth Integration

```typescript
// apps/vscode-extension/src/auth/auth-provider.ts

import * as vscode from 'vscode';
import { GodotyAuthClient } from '@godoty/auth';

export class GodotyAuthProvider implements vscode.AuthenticationProvider {
  static readonly id = 'godoty';
  static readonly label = 'Godoty';

  private authClient: GodotyAuthClient;
  private sessionChangeEmitter = new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();

  constructor(private context: vscode.ExtensionContext) {
    this.authClient = new GodotyAuthClient();
    
    // Set up storage bridge
    globalThis.__godotyStorage = {
      get: (key: string) => context.secrets.get(key),
      set: (key: string, value: string) => context.secrets.store(key, value),
      delete: (key: string) => context.secrets.delete(key)
    };

    // Set up auth event bridge
    globalThis.__godotyAuthEmitter = {
      fire: (event: any) => this.handleAuthEvent(event)
    };
  }

  get onDidChangeSessions(): vscode.Event<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent> {
    return this.sessionChangeEmitter.event;
  }

  async getSessions(): Promise<vscode.AuthenticationSession[]> {
    const session = this.authClient.getSession();
    if (!session) return [];

    const user = this.authClient.getUser();
    if (!user) return [];

    return [{
      id: session.access_token,
      accessToken: session.access_token,
      account: {
        id: user.id,
        label: user.email || 'Godoty User'
      },
      scopes: ['godoty']
    }];
  }

  async createSession(scopes: string[]): Promise<vscode.AuthenticationSession> {
    // Show login options
    const choice = await vscode.window.showQuickPick([
      { label: '$(github) Sign in with GitHub', provider: 'github' },
      { label: '$(mail) Sign in with Google', provider: 'google' },
      { label: '$(key) Sign in with Email', provider: 'email' }
    ], {
      title: 'Sign in to Godoty',
      placeHolder: 'Choose a sign-in method'
    });

    if (!choice) {
      throw new Error('Sign in cancelled');
    }

    if (choice.provider === 'email') {
      return this.signInWithEmail();
    }

    return this.signInWithOAuth(choice.provider as 'github' | 'google');
  }

  async removeSession(sessionId: string): Promise<void> {
    await this.authClient.signOut();
    this.sessionChangeEmitter.fire({
      added: [],
      removed: [sessionId],
      changed: []
    });
  }

  private async signInWithEmail(): Promise<vscode.AuthenticationSession> {
    const email = await vscode.window.showInputBox({
      prompt: 'Enter your email',
      placeHolder: 'email@example.com',
      validateInput: (value) => {
        if (!value.includes('@')) return 'Please enter a valid email';
        return null;
      }
    });

    if (!email) throw new Error('Sign in cancelled');

    const password = await vscode.window.showInputBox({
      prompt: 'Enter your password',
      password: true
    });

    if (!password) throw new Error('Sign in cancelled');

    const { user, error } = await this.authClient.signIn(email, password);

    if (error) {
      // Try to sign up if sign in fails
      const signUp = await vscode.window.showQuickPick(['Yes', 'No'], {
        placeHolder: 'Account not found. Create a new account?'
      });

      if (signUp === 'Yes') {
        const { user: newUser, error: signUpError } = await this.authClient.signUp(email, password);
        if (signUpError) throw signUpError;
        if (!newUser) throw new Error('Failed to create account');
        
        vscode.window.showInformationMessage('Account created! Please check your email to verify.');
      } else {
        throw error;
      }
    }

    const session = this.authClient.getSession();
    if (!session || !user) throw new Error('Failed to get session');

    return {
      id: session.access_token,
      accessToken: session.access_token,
      account: {
        id: user.id,
        label: user.email || 'Godoty User'
      },
      scopes: ['godoty']
    };
  }

  private async signInWithOAuth(provider: 'github' | 'google'): Promise<vscode.AuthenticationSession> {
    const { url, error } = await this.authClient.signInWithOAuth(provider);

    if (error || !url) {
      throw error || new Error('Failed to get OAuth URL');
    }

    // Open browser for OAuth
    await vscode.env.openExternal(vscode.Uri.parse(url));

    // Wait for callback (handled by URI handler)
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('OAuth timeout'));
      }, 120000);

      const disposable = vscode.window.registerUriHandler({
        handleUri: async (uri) => {
          clearTimeout(timeout);
          disposable.dispose();

          try {
            const { user, error } = await this.authClient.handleOAuthCallback(uri.toString());
            if (error || !user) throw error || new Error('OAuth failed');

            const session = this.authClient.getSession();
            if (!session) throw new Error('No session');

            resolve({
              id: session.access_token,
              accessToken: session.access_token,
              account: {
                id: user.id,
                label: user.email || 'Godoty User'
              },
              scopes: ['godoty']
            });
          } catch (e) {
            reject(e);
          }
        }
      });
    });
  }

  private handleAuthEvent(event: { event: string; session: any }): void {
    if (event.event === 'SIGNED_IN') {
      this.sessionChangeEmitter.fire({
        added: [event.session?.access_token],
        removed: [],
        changed: []
      });
    } else if (event.event === 'SIGNED_OUT') {
      this.sessionChangeEmitter.fire({
        added: [],
        removed: ['current'],
        changed: []
      });
    }
  }
}
```

---

## API Endpoints

### LiteLLM Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chat/completions` | POST | Chat completion (OpenAI compatible) |
| `/models` | GET | List available models |
| `/key/generate` | POST | Generate virtual API key |
| `/key/info` | GET | Get key info and usage |
| `/spend/logs` | GET | Get spending logs |

### Supabase Tables

| Table | Description |
|-------|-------------|
| `user_profiles` | User profile and preferences |
| `user_api_keys` | LiteLLM virtual keys |
| `usage_records` | Token usage tracking |
| `conversations` | Chat history (optional) |

---

## Database Schema

### Supabase Schema (SQL)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{
    "defaultModel": "gpt-4o-mini",
    "theme": "auto",
    "autoConnect": true
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User API keys table
CREATE TABLE user_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  litellm_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- Usage records table
CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  cost DECIMAL(10, 6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_usage_records_user_id ON usage_records(user_id);
CREATE INDEX idx_usage_records_created_at ON usage_records(created_at);

-- Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own API keys"
  ON user_api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own API keys"
  ON user_api_keys FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own usage"
  ON usage_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON usage_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to calculate cost based on model
CREATE OR REPLACE FUNCTION calculate_token_cost()
RETURNS TRIGGER AS $$
DECLARE
  cost_per_1k_input DECIMAL(10, 6);
  cost_per_1k_output DECIMAL(10, 6);
BEGIN
  -- Model pricing (update as needed)
  CASE NEW.model
    WHEN 'gpt-4o' THEN
      cost_per_1k_input := 0.005;
      cost_per_1k_output := 0.015;
    WHEN 'gpt-4o-mini' THEN
      cost_per_1k_input := 0.00015;
      cost_per_1k_output := 0.0006;
    WHEN 'claude-3-5-sonnet-20241022' THEN
      cost_per_1k_input := 0.003;
      cost_per_1k_output := 0.015;
    WHEN 'claude-3-5-haiku-20241022' THEN
      cost_per_1k_input := 0.0008;
      cost_per_1k_output := 0.004;
    ELSE
      cost_per_1k_input := 0.001;
      cost_per_1k_output := 0.002;
  END CASE;

  NEW.cost := (NEW.prompt_tokens * cost_per_1k_input / 1000) +
              (NEW.completion_tokens * cost_per_1k_output / 1000);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_cost
  BEFORE INSERT ON usage_records
  FOR EACH ROW
  EXECUTE FUNCTION calculate_token_cost();

-- View for usage summary
CREATE VIEW user_usage_summary AS
SELECT
  user_id,
  DATE_TRUNC('day', created_at) as date,
  SUM(prompt_tokens) as total_prompt_tokens,
  SUM(completion_tokens) as total_completion_tokens,
  SUM(total_tokens) as total_tokens,
  SUM(cost) as total_cost,
  COUNT(*) as request_count
FROM usage_records
GROUP BY user_id, DATE_TRUNC('day', created_at);
```

---

## Configuration

### Environment Variables

```bash
# .env file for development

# LiteLLM Configuration
VITE_LITELLM_URL=https://litellm-production-150c.up.railway.app
LITELLM_MASTER_KEY=sk-your-master-key  # Server-side only, for key generation

# Supabase Configuration
VITE_SUPABASE_URL=https://kbnaymejrngxhpigwphh.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_crqwAKS-G2fVqkyOTr95lQ_SQu-vaj3

# Optional: Local development overrides
# VITE_LITELLM_URL=http://localhost:4000
# VITE_SUPABASE_URL=http://localhost:54321
```

### VS Code Extension Settings

```json
{
  "godoty.backend.litellmUrl": {
    "type": "string",
    "default": "https://litellm-production-150c.up.railway.app",
    "description": "LiteLLM proxy server URL"
  },
  "godoty.backend.supabaseUrl": {
    "type": "string",
    "default": "https://kbnaymejrngxhpigwphh.supabase.co",
    "description": "Supabase project URL"
  },
  "godoty.auth.autoSignIn": {
    "type": "boolean",
    "default": true,
    "description": "Automatically sign in on extension activation"
  },
  "godoty.usage.showCostEstimates": {
    "type": "boolean",
    "default": true,
    "description": "Show estimated costs in the UI"
  }
}
```

---

## Security

### Security Measures

| Area | Measure |
|------|---------|
| **API Keys** | Stored in VS Code SecretStorage (encrypted) |
| **Network** | All connections use HTTPS |
| **Supabase RLS** | Row-level security on all tables |
| **LiteLLM Keys** | Virtual keys with spend limits |
| **Tokens** | JWT with short expiry, auto-refresh |

### Secret Storage

```typescript
// Secure storage implementation
class SecureStorage {
  constructor(private secrets: vscode.SecretStorage) {}

  async storeCredentials(key: string, value: string): Promise<void> {
    await this.secrets.store(key, value);
  }

  async getCredentials(key: string): Promise<string | undefined> {
    return this.secrets.get(key);
  }

  async deleteCredentials(key: string): Promise<void> {
    await this.secrets.delete(key);
  }
}
```

### Rate Limiting

LiteLLM provides built-in rate limiting per virtual key:

```json
{
  "key": "sk-godoty-user-xxx",
  "max_budget": 10.0,
  "rate_limit": {
    "requests_per_minute": 60,
    "tokens_per_minute": 100000
  }
}
```

---

## Error Handling

### Error Types

```typescript
// packages/godoty-auth/src/errors.ts

export class GodotyAuthError extends Error {
  constructor(
    message: string,
    public code: AuthErrorCode,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'GodotyAuthError';
  }
}

export enum AuthErrorCode {
  NOT_AUTHENTICATED = 'NOT_AUTHENTICATED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED'
}

export class LiteLLMError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorType?: string
  ) {
    super(message);
    this.name = 'LiteLLMError';
  }
}
```

### Error Recovery

```typescript
// Automatic session refresh
async function withAuth<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof GodotyAuthError && error.code === AuthErrorCode.SESSION_EXPIRED) {
      // Try to refresh session
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        // Force re-login
        await vscode.commands.executeCommand('godoty.signIn');
        throw new GodotyAuthError('Please sign in again', AuthErrorCode.NOT_AUTHENTICATED);
      }
      // Retry original operation
      return fn();
    }
    throw error;
  }
}
```

---

## Usage Tracking UI

### Status Bar Integration

```typescript
// Show usage in VS Code status bar
class UsageStatusBar {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'godoty.showUsage';
  }

  async update(): Promise<void> {
    const profile = await authClient.getUserProfile();
    if (!profile) {
      this.statusBarItem.hide();
      return;
    }

    const usage = profile.usage_summary;
    const cost = usage?.total_cost?.toFixed(4) || '0.00';
    
    this.statusBarItem.text = `$(pulse) $${cost}`;
    this.statusBarItem.tooltip = `Godoty Usage: ${usage?.total_tokens || 0} tokens ($${cost})`;
    this.statusBarItem.show();
  }
}
```

---

## Next Steps

1. See [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) for step-by-step setup
2. See [VSCODE_EXTENSION.md](VSCODE_EXTENSION.md) for extension integration details
3. See [API_REFERENCE.md](API_REFERENCE.md) for complete API documentation
