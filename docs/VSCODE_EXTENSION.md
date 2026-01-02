# Godoty VS Code Extension

> Kilo Code fork modifications for Godot integration

## Table of Contents

1. [Overview](#overview)
2. [Key Modifications](#key-modifications)
3. [Authentication Integration](#authentication-integration)
4. [LLM Integration](#llm-integration)
5. [Godot Mode](#godot-mode)
6. [MCP Server Management](#mcp-server-management)
7. [UI Components](#ui-components)
8. [Configuration](#configuration)

---

## Overview

The Godoty VS Code extension is a fork of Kilo Code with the following modifications:

1. **Custom Authentication**: Supabase-based auth instead of Kilo's auth
2. **Custom LLM Backend**: LiteLLM proxy instead of direct provider APIs
3. **Godot Mode**: Specialized mode for Godot development
4. **MCP Integration**: Built-in Godoty MCP server management
5. **Godot UI Panel**: Connection status and quick actions

---

## Key Modifications

### Modified Files

| Original File | Modification |
|---------------|--------------|
| `src/api/providers/*` | Replaced with LiteLLM client |
| `src/core/modes/*` | Added Godot mode |
| `src/extension.ts` | Added Godot initialization |
| `webview-ui/*` | Added Godot panel components |
| `package.json` | Added Godot configuration options |

### New Files

```
src/
├── godot/
│   ├── index.ts                    # Godot integration entry
│   ├── connection-manager.ts       # WebSocket connection management
│   ├── context-provider.ts         # Godot context for AI
│   ├── modes/
│   │   └── godot-mode.ts          # Godot-specific AI mode
│   └── providers/
│       ├── auth-provider.ts        # Supabase auth provider
│       └── llm-provider.ts         # LiteLLM provider
├── services/
│   ├── auth-service.ts             # Authentication service
│   └── llm-service.ts              # LLM service wrapper
webview-ui/
└── components/
    └── GodotPanel/
        ├── index.tsx               # Main panel component
        ├── ConnectionStatus.tsx    # Connection indicator
        ├── ViewportPreview.tsx     # Viewport preview
        └── QuickActions.tsx        # Quick action buttons
```

---

## Authentication Integration

### Auth Provider Implementation

```typescript
// src/godot/providers/auth-provider.ts

import * as vscode from 'vscode';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kbnaymejrngxhpigwphh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_crqwAKS-G2fVqkyOTr95lQ_SQu-vaj3';

export class GodotyAuthProvider implements vscode.AuthenticationProvider {
  static readonly id = 'godoty';
  static readonly label = 'Godoty';

  private supabase: SupabaseClient;
  private sessionChangeEmitter = new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();

  constructor(private context: vscode.ExtensionContext) {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: {
          getItem: async (key) => {
            return await context.secrets.get(key) || null;
          },
          setItem: async (key, value) => {
            await context.secrets.store(key, value);
          },
          removeItem: async (key) => {
            await context.secrets.delete(key);
          }
        }
      }
    });
  }

  get onDidChangeSessions() {
    return this.sessionChangeEmitter.event;
  }

  async getSessions(): Promise<vscode.AuthenticationSession[]> {
    const { data: { session } } = await this.supabase.auth.getSession();
    if (!session) return [];

    return [{
      id: session.access_token,
      accessToken: session.access_token,
      account: {
        id: session.user.id,
        label: session.user.email || 'Godoty User'
      },
      scopes: ['godoty']
    }];
  }

  async createSession(scopes: string[]): Promise<vscode.AuthenticationSession> {
    const choice = await vscode.window.showQuickPick([
      { label: '$(github) Sign in with GitHub', provider: 'github' as const },
      { label: '$(mail) Sign in with Google', provider: 'google' as const },
      { label: '$(key) Sign in with Email', provider: 'email' as const }
    ], {
      title: 'Sign in to Godoty'
    });

    if (!choice) throw new Error('Sign in cancelled');

    if (choice.provider === 'email') {
      return this.signInWithEmail();
    }

    return this.signInWithOAuth(choice.provider);
  }

  async removeSession(sessionId: string): Promise<void> {
    await this.supabase.auth.signOut();
    this.sessionChangeEmitter.fire({ added: [], removed: [sessionId], changed: [] });
  }

  private async signInWithEmail(): Promise<vscode.AuthenticationSession> {
    const email = await vscode.window.showInputBox({
      prompt: 'Enter your email',
      validateInput: (v) => v.includes('@') ? null : 'Invalid email'
    });
    if (!email) throw new Error('Cancelled');

    const password = await vscode.window.showInputBox({
      prompt: 'Enter your password',
      password: true
    });
    if (!password) throw new Error('Cancelled');

    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    return {
      id: data.session!.access_token,
      accessToken: data.session!.access_token,
      account: { id: data.user!.id, label: email },
      scopes: ['godoty']
    };
  }

  private async signInWithOAuth(provider: 'github' | 'google'): Promise<vscode.AuthenticationSession> {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: 'vscode://godoty.godoty/auth/callback',
        skipBrowserRedirect: true
      }
    });

    if (error) throw error;

    // Open browser
    await vscode.env.openExternal(vscode.Uri.parse(data.url!));

    // Wait for callback
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 120000);
      
      const handler = vscode.window.registerUriHandler({
        handleUri: async (uri) => {
          clearTimeout(timeout);
          handler.dispose();

          const { data: { session }, error } = await this.supabase.auth.getSession();
          if (error || !session) {
            reject(error || new Error('No session'));
            return;
          }

          resolve({
            id: session.access_token,
            accessToken: session.access_token,
            account: { id: session.user.id, label: session.user.email || 'User' },
            scopes: ['godoty']
          });
        }
      });
    });
  }

  async getLiteLLMApiKey(): Promise<string | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return null;

    const { data } = await this.supabase
      .from('user_api_keys')
      .select('litellm_key')
      .eq('user_id', user.id)
      .single();

    return data?.litellm_key || null;
  }
}
```

---

## LLM Integration

### LLM Service

```typescript
// src/services/llm-service.ts

import { GodotyAuthProvider } from '../godot/providers/auth-provider';

const LITELLM_URL = 'https://litellm-production-150c.up.railway.app';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

export interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export class LLMService {
  private apiKey: string | null = null;

  constructor(private authProvider: GodotyAuthProvider) {}

  async initialize(): Promise<void> {
    this.apiKey = await this.authProvider.getLiteLLMApiKey();
  }

  async chat(
    model: string,
    messages: ChatMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
      tools?: any[];
      stream?: boolean;
    } = {}
  ): Promise<any> {
    if (!this.apiKey) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${LITELLM_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        tools: options.tools,
        stream: options.stream ?? false
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'LLM request failed');
    }

    return response.json();
  }

  async *chatStream(
    model: string,
    messages: ChatMessage[],
    options: { temperature?: number; maxTokens?: number; tools?: any[] } = {}
  ): AsyncGenerator<string> {
    if (!this.apiKey) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${LITELLM_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        tools: options.tools,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error('LLM request failed');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {}
        }
      }
    }
  }

  async getModels(): Promise<string[]> {
    const response = await fetch(`${LITELLM_URL}/models`, {
      headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}
    });

    if (!response.ok) throw new Error('Failed to fetch models');

    const data = await response.json();
    return data.data.map((m: any) => m.id);
  }
}
```

---

## Godot Mode

### Mode Definition

```typescript
// src/godot/modes/godot-mode.ts

import { Mode } from '../../core/modes/types';

export const godotMode: Mode = {
  id: 'godot',
  name: 'Godot Developer',
  icon: '🎮',
  description: 'AI assistant specialized for Godot game development',
  
  systemPrompt: `You are an expert Godot game developer assistant integrated with the Godot Editor.

## Your Capabilities

You have access to these Godot-specific tools:
- **godot_capture_viewport**: Screenshot the 2D or 3D editor viewport
- **godot_capture_game**: Screenshot the running game
- **godot_get_docs**: Fetch documentation for any Godot class from the running editor
- **godot_get_scene**: Get the current scene tree structure
- **godot_get_selected**: Get currently selected nodes
- **godot_run_action**: Execute editor actions (run scene, select node, etc.)
- **godot_get_errors**: Get recent errors from the debugger

## Guidelines

1. **Use Tools Proactively**: When discussing visual issues, capture screenshots first. When writing code, fetch documentation first.

2. **Accurate Documentation**: Always use godot_get_docs before writing code that uses Godot APIs. This ensures you use the correct API for the user's Godot version.

3. **Visual Debugging**: For visual bugs, capture both the editor viewport and running game to compare intended vs actual behavior.

4. **GDScript Best Practices**:
   - Use type hints for better performance and clarity
   - Prefer signals over direct method calls for loose coupling
   - Use @export for inspector-editable properties
   - Follow the node composition pattern

5. **Scene Understanding**: Use godot_get_scene to understand the project structure before making recommendations.

## Workflow Examples

### Debugging a Visual Issue
1. godot_get_errors - Check for runtime errors
2. godot_capture_viewport / godot_capture_game - See the visual state
3. godot_get_scene - Understand scene structure
4. Analyze and provide solution

### Implementing a Feature
1. godot_get_scene - Understand existing structure
2. godot_get_docs - Fetch relevant class documentation
3. Generate accurate code
4. Explain the implementation

### Code Review
1. godot_get_docs - Verify API usage
2. Check for common issues (type hints, signals, etc.)
3. Suggest improvements`,

  tools: [
    'godot_capture_viewport',
    'godot_capture_game',
    'godot_get_docs',
    'godot_search_docs',
    'godot_get_scene',
    'godot_get_selected',
    'godot_get_node',
    'godot_run_action',
    'godot_get_errors'
  ],

  defaultModel: 'gpt-4o',
  recommendedModels: ['gpt-4o', 'claude-3-5-sonnet-20241022', 'gemini/gemini-2.0-flash'],

  mcpServers: ['godoty'],

  welcomeMessage: `# Welcome to Godoty! 🎮

I'm your AI-powered Godot development assistant. I can:

- 📸 **See your game** - Capture screenshots from the editor and running game
- 📚 **Access live docs** - Fetch accurate documentation from your Godot version
- 🔍 **Inspect scenes** - Analyze your scene tree and node properties
- 🐛 **Debug issues** - Check errors and help fix problems
- ▶️ **Control the editor** - Run scenes, select nodes, and more

**Get Started:**
- "Show me the current viewport"
- "Why is my player falling through the floor?"
- "Add double jump to my CharacterBody3D"
- "What's wrong with my UI layout?"

*Make sure the Godoty Bridge plugin is enabled in Godot!*`
};
```

---

## MCP Server Management

### Connection Manager

```typescript
// src/godot/connection-manager.ts

import * as vscode from 'vscode';
import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';

export class GodotConnectionManager {
  private mcpProcess: ChildProcess | null = null;
  private statusBarItem: vscode.StatusBarItem;
  private isConnected = false;

  constructor(private context: vscode.ExtensionContext) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'godoty.showConnectionMenu';
  }

  async start(): Promise<void> {
    // Start the MCP server
    const mcpPath = path.join(this.context.extensionPath, 'node_modules', '@godoty', 'mcp', 'dist', 'index.js');
    
    this.mcpProcess = spawn('node', [mcpPath], {
      env: {
        ...process.env,
        GODOT_WS_URL: `ws://127.0.0.1:${this.getPort()}`
      }
    });

    this.mcpProcess.on('error', (err) => {
      console.error('MCP server error:', err);
      this.updateStatus(false);
    });

    this.mcpProcess.on('exit', (code) => {
      console.log('MCP server exited with code:', code);
      this.updateStatus(false);
    });

    // Wait a bit then check connection
    setTimeout(() => this.checkConnection(), 2000);
  }

  async stop(): Promise<void> {
    if (this.mcpProcess) {
      this.mcpProcess.kill();
      this.mcpProcess = null;
    }
    this.updateStatus(false);
  }

  private async checkConnection(): Promise<void> {
    try {
      // Simple ping to check if Godot is connected
      const ws = new WebSocket(`ws://127.0.0.1:${this.getPort()}`);
      
      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => {
          ws.send(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping', params: {} }));
        };
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.result?.pong) {
            this.updateStatus(true);
            resolve();
          }
        };
        ws.onerror = reject;
        setTimeout(reject, 5000);
      });

      ws.close();
    } catch {
      this.updateStatus(false);
    }
  }

  private updateStatus(connected: boolean): void {
    this.isConnected = connected;
    
    if (connected) {
      this.statusBarItem.text = '$(plug) Godot Connected';
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.tooltip = 'Connected to Godot Editor';
    } else {
      this.statusBarItem.text = '$(debug-disconnect) Godot Disconnected';
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      this.statusBarItem.tooltip = 'Click to reconnect to Godot';
    }
    
    this.statusBarItem.show();
  }

  private getPort(): number {
    return vscode.workspace.getConfiguration('godoty').get('connection.port', 6550);
  }

  dispose(): void {
    this.stop();
    this.statusBarItem.dispose();
  }
}
```

---

## UI Components

### Godot Panel (React)

```tsx
// webview-ui/components/GodotPanel/index.tsx

import React, { useState, useEffect } from 'react';
import { ConnectionStatus } from './ConnectionStatus';
import { ViewportPreview } from './ViewportPreview';
import { QuickActions } from './QuickActions';
import { vscode } from '../../utilities/vscode';

interface GodotState {
  connected: boolean;
  godotVersion: string | null;
  currentScene: string | null;
  isGameRunning: boolean;
  lastError: string | null;
}

export const GodotPanel: React.FC = () => {
  const [state, setState] = useState<GodotState>({
    connected: false,
    godotVersion: null,
    currentScene: null,
    isGameRunning: false,
    lastError: null
  });

  const [viewportImage, setViewportImage] = useState<string | null>(null);

  useEffect(() => {
    // Listen for messages from extension
    const handler = (event: MessageEvent) => {
      const message = event.data;
      
      switch (message.type) {
        case 'godot-status':
          setState(message.data);
          break;
        case 'viewport-capture':
          setViewportImage(message.data.image);
          break;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleCaptureViewport = () => {
    vscode.postMessage({ type: 'capture-viewport' });
  };

  const handleRunScene = () => {
    vscode.postMessage({ type: 'run-action', action: 'run_scene' });
  };

  const handleStopScene = () => {
    vscode.postMessage({ type: 'run-action', action: 'stop_scene' });
  };

  return (
    <div className="godot-panel">
      <ConnectionStatus 
        connected={state.connected}
        godotVersion={state.godotVersion}
        currentScene={state.currentScene}
      />
      
      <QuickActions
        connected={state.connected}
        isGameRunning={state.isGameRunning}
        onCaptureViewport={handleCaptureViewport}
        onRunScene={handleRunScene}
        onStopScene={handleStopScene}
      />

      {viewportImage && (
        <ViewportPreview 
          image={viewportImage}
          onRefresh={handleCaptureViewport}
        />
      )}

      {state.lastError && (
        <div className="error-banner">
          <span className="codicon codicon-error" />
          {state.lastError}
        </div>
      )}
    </div>
  );
};
```

---

## Configuration

### Extension Settings

```json
{
  "contributes": {
    "configuration": {
      "title": "Godoty",
      "properties": {
        "godoty.connection.port": {
          "type": "number",
          "default": 6550,
          "description": "WebSocket port for Godot connection"
        },
        "godoty.connection.autoConnect": {
          "type": "boolean",
          "default": true,
          "description": "Automatically connect to Godot when extension activates"
        },
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
        "godoty.defaultModel": {
          "type": "string",
          "default": "gpt-4o-mini",
          "description": "Default AI model to use"
        },
        "godoty.capture.maxResolution": {
          "type": "number",
          "default": 2048,
          "description": "Maximum resolution for viewport captures"
        },
        "godoty.ui.showViewportPreview": {
          "type": "boolean",
          "default": true,
          "description": "Show viewport preview in side panel"
        }
      }
    },
    "commands": [
      {
        "command": "godoty.signIn",
        "title": "Sign In to Godoty"
      },
      {
        "command": "godoty.signOut",
        "title": "Sign Out of Godoty"
      },
      {
        "command": "godoty.captureViewport",
        "title": "Capture Godot Viewport"
      },
      {
        "command": "godoty.runScene",
        "title": "Run Godot Scene"
      },
      {
        "command": "godoty.stopScene",
        "title": "Stop Godot Scene"
      },
      {
        "command": "godoty.showConnectionMenu",
        "title": "Godot Connection"
      }
    ]
  }
}
```

---

## Next Steps

1. See [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) for build instructions
2. See [BACKEND_SERVICES.md](BACKEND_SERVICES.md) for auth/LLM details
3. See [API_REFERENCE.md](API_REFERENCE.md) for complete API docs
