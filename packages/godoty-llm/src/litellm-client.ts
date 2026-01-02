import type { SupabaseClient } from '@supabase/supabase-js';

interface LiteLLMConfig {
  baseUrl: string;
  apiKey?: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
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
  private supabase: SupabaseClient | null = null;

  constructor(config: LiteLLMConfig, supabase?: SupabaseClient) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey || null;
    this.supabase = supabase || null;
  }

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  async getModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data.map((m: { id: string }) => m.id);
  }

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
    
    await this.trackUsage(request.model, result.usage);
    
    return result;
  }

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

  async createVisionCompletion(
    model: string,
    textPrompt: string,
    images: string[],
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
    if (!this.supabase) return;

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

export class LiteLLMError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'LiteLLMError';
  }
}

export type { ChatMessage, ChatCompletionRequest, ChatCompletionResponse, Tool, ToolCall, ContentPart };
