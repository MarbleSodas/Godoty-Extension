# Godoty Integration Tests

> Testing specifications and procedures for Godoty

## Table of Contents

1. [Test Categories](#test-categories)
2. [Unit Tests](#unit-tests)
3. [Integration Tests](#integration-tests)
4. [End-to-End Tests](#end-to-end-tests)
5. [Performance Tests](#performance-tests)
6. [Test Environment Setup](#test-environment-setup)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Test Coverage Requirements](#test-coverage-requirements)

---

## Test Categories

| Category | Scope | Tools | Requires Godot |
|----------|-------|-------|----------------|
| Unit | Individual functions | Vitest | No |
| Integration | Component interaction | Vitest + WS mock | No |
| E2E | Full workflow | Vitest + Godot | Yes |
| Performance | Speed/memory | Custom harness | Yes |

---

## Unit Tests

### MCP Server Tests

```typescript
// packages/godoty-mcp/src/__tests__/tools/capture.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCapture } from '../tools/capture';
import { GodotClient } from '../godot-client';

describe('capture tools', () => {
  let mockClient: GodotClient;

  beforeEach(() => {
    mockClient = {
      isConnected: vi.fn().mockReturnValue(true),
      call: vi.fn()
    } as unknown as GodotClient;
  });

  describe('godot_capture_viewport', () => {
    it('should capture 3D viewport by default', async () => {
      mockClient.call = vi.fn().mockResolvedValue({
        success: true,
        viewport_type: '3d',
        image: 'data:image/png;base64,abc123',
        width: 1920,
        height: 1080
      });

      const result = await handleCapture('godot_capture_viewport', {}, mockClient);

      expect(mockClient.call).toHaveBeenCalledWith('capture_viewport', {
        viewport_type: '3d'
      });
      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe('image');
    });

    it('should handle capture failure', async () => {
      mockClient.call = vi.fn().mockResolvedValue({
        success: false,
        error: { message: 'Viewport not available' }
      });

      const result = await handleCapture('godot_capture_viewport', {}, mockClient);

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Failed');
    });

    it('should respect max dimensions', async () => {
      mockClient.call = vi.fn().mockResolvedValue({
        success: true,
        image: 'data:image/png;base64,abc',
        width: 1024,
        height: 768
      });

      await handleCapture('godot_capture_viewport', {
        max_width: 1024,
        max_height: 768
      }, mockClient);

      expect(mockClient.call).toHaveBeenCalledWith('capture_viewport', {
        max_width: 1024,
        max_height: 768
      });
    });
  });

  describe('godot_capture_game', () => {
    it('should return error when game not running', async () => {
      mockClient.call = vi.fn().mockRejectedValue(new Error('Game not running'));

      const result = await handleCapture('godot_capture_game', {}, mockClient);

      expect(result.content[0].text).toContain('Game not running');
    });
  });
});
```

### Auth Service Tests

```typescript
// packages/godoty-auth/src/__tests__/auth.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GodotyAuthClient } from '../supabase-client';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn()
    }))
  }))
}));

describe('GodotyAuthClient', () => {
  let client: GodotyAuthClient;

  beforeEach(() => {
    client = new GodotyAuthClient();
  });

  describe('signIn', () => {
    it('should sign in with email/password', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      // Mock implementation...

      const { user, error } = await client.signIn('test@example.com', 'password');

      expect(error).toBeNull();
      expect(user).toBeDefined();
    });

    it('should return error for invalid credentials', async () => {
      // Mock error response...

      const { user, error } = await client.signIn('wrong@example.com', 'wrong');

      expect(error).toBeDefined();
      expect(user).toBeNull();
    });
  });
});
```

### LLM Service Tests

```typescript
// packages/godoty-llm/src/__tests__/litellm-client.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LiteLLMClient } from '../litellm-client';

// Mock fetch
global.fetch = vi.fn();

describe('LiteLLMClient', () => {
  let client: LiteLLMClient;

  beforeEach(() => {
    client = new LiteLLMClient({
      baseUrl: 'https://test.litellm.com',
      apiKey: 'test-key'
    });
    vi.clearAllMocks();
  });

  describe('createChatCompletion', () => {
    it('should make correct API call', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Hello!' } }],
          usage: { total_tokens: 10 }
        })
      });

      const result = await client.createChatCompletion({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }]
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.litellm.com/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key'
          })
        })
      );
      expect(result.choices[0].message.content).toBe('Hello!');
    });

    it('should handle vision requests', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'I see an image' } }]
        })
      });

      await client.createVisionCompletion(
        'gpt-4o',
        'What is this?',
        ['data:image/png;base64,abc123']
      );

      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.messages[0].content[1].type).toBe('image_url');
    });
  });
});
```

---

## Integration Tests

### WebSocket Communication

```typescript
// tests/integration/websocket.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocket } from 'ws';

describe('WebSocket Communication', () => {
  let ws: WebSocket;

  beforeAll(async () => {
    // Requires Godot plugin running
    ws = new WebSocket('ws://127.0.0.1:6550');
    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = reject;
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  });

  afterAll(() => {
    ws.close();
  });

  const sendRequest = (method: string, params: any = {}): Promise<any> => {
    return new Promise((resolve, reject) => {
      const id = Date.now();
      
      const handler = (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          if (data.error) {
            reject(new Error(data.error.message));
          } else {
            resolve(data.result);
          }
        }
      };

      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }));
      
      setTimeout(() => reject(new Error('Request timeout')), 10000);
    });
  };

  it('should respond to ping', async () => {
    const result = await sendRequest('ping');
    expect(result.pong).toBe(true);
  });

  it('should get editor info', async () => {
    const result = await sendRequest('get_editor_info');
    expect(result.godot_version).toBeDefined();
    expect(result.godot_version.major).toBeGreaterThanOrEqual(4);
  });

  it('should get class docs', async () => {
    const result = await sendRequest('get_class_docs', {
      class_name: 'Node'
    });
    expect(result.class_name).toBe('Node');
    expect(result.methods).toBeDefined();
    expect(Array.isArray(result.methods)).toBe(true);
  });

  it('should return error for unknown class', async () => {
    await expect(
      sendRequest('get_class_docs', { class_name: 'NonExistentClass' })
    ).rejects.toThrow('Class not found');
  });

  it('should get scene tree', async () => {
    const result = await sendRequest('get_scene_tree');
    expect(result.tree).toBeDefined();
    expect(result.tree.name).toBeDefined();
  });

  it('should capture viewport', async () => {
    const result = await sendRequest('capture_viewport', {
      viewport_type: '3d',
      max_width: 512,
      max_height: 512
    });
    expect(result.success).toBe(true);
    expect(result.image).toMatch(/^data:image\/png;base64,/);
  });
});
```

### MCP Server Integration

```typescript
// tests/integration/mcp-server.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GodotyMCPServer } from '@godoty/mcp';

describe('MCP Server Integration', () => {
  let server: GodotyMCPServer;

  beforeAll(async () => {
    server = new GodotyMCPServer();
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should list available tools', async () => {
    // Send list_tools request and verify response
    const tools = await server.listTools();
    
    expect(tools).toContainEqual(
      expect.objectContaining({ name: 'godot_capture_viewport' })
    );
    expect(tools).toContainEqual(
      expect.objectContaining({ name: 'godot_get_docs' })
    );
  });

  it('should handle tool calls', async () => {
    const result = await server.callTool('godot_get_docs', {
      class_name: 'Node'
    });

    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Node');
  });
});
```

---

## End-to-End Tests

### Full Workflow Tests

```typescript
// tests/e2e/workflow.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GodotyMCPServer } from '@godoty/mcp';
import { GodotyAuthClient } from '@godoty/auth';
import { LiteLLMClient } from '@godoty/llm';

describe('E2E Workflows', () => {
  let mcpServer: GodotyMCPServer;
  let authClient: GodotyAuthClient;
  let llmClient: LiteLLMClient;

  beforeAll(async () => {
    // Initialize all components
    mcpServer = new GodotyMCPServer();
    await mcpServer.start();

    authClient = new GodotyAuthClient();
    // Use test credentials
    await authClient.signIn('test@godoty.dev', process.env.TEST_PASSWORD!);

    const apiKey = await authClient.getLiteLLMApiKey();
    llmClient = new LiteLLMClient({
      baseUrl: process.env.VITE_LITELLM_URL!,
      apiKey: apiKey!
    });
  });

  afterAll(async () => {
    await mcpServer.stop();
    await authClient.signOut();
  });

  describe('Debug Workflow', () => {
    it('should complete debug workflow', async () => {
      // 1. Get errors from Godot
      const errors = await mcpServer.callTool('godot_get_errors', { count: 5 });
      expect(errors.content).toBeDefined();

      // 2. Capture viewport
      const viewport = await mcpServer.callTool('godot_capture_viewport', {
        viewport_type: '3d'
      });
      expect(viewport.content[0].type).toBe('image');

      // 3. Get scene tree
      const scene = await mcpServer.callTool('godot_get_scene', {});
      expect(scene.content[0].text).toContain('Node');

      // 4. Get documentation
      const docs = await mcpServer.callTool('godot_get_docs', {
        class_name: 'CharacterBody3D'
      });
      expect(docs.content[0].text).toContain('CharacterBody3D');

      // 5. Use LLM to analyze (integration with AI)
      const response = await llmClient.createChatCompletion({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a Godot expert.' },
          { role: 'user', content: `Analyze this scene:\n${scene.content[0].text}` }
        ],
        max_tokens: 100
      });

      expect(response.choices[0].message.content).toBeDefined();
    });
  });

  describe('Feature Implementation Workflow', () => {
    it('should help implement a feature with correct API', async () => {
      // 1. Get current scene structure
      const scene = await mcpServer.callTool('godot_get_scene', {});

      // 2. Get relevant documentation
      const docs = await mcpServer.callTool('godot_get_docs', {
        class_name: 'CharacterBody3D'
      });

      // 3. Generate code with LLM
      const response = await llmClient.createChatCompletion({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a Godot expert. Generate GDScript code.'
          },
          {
            role: 'user',
            content: `Using this API documentation:\n${docs.content[0].text}\n\nGenerate double jump code.`
          }
        ],
        max_tokens: 500
      });

      const code = response.choices[0].message.content;

      // Verify code quality
      expect(code).toContain('is_on_floor');
      expect(code).toContain('velocity');
      expect(code).not.toContain('move_and_slide(velocity)'); // Godot 3 syntax
    });
  });
});
```

### Visual Context Tests

```typescript
// tests/e2e/visual-context.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GodotyMCPServer } from '@godoty/mcp';

describe('Visual Context E2E', () => {
  let server: GodotyMCPServer;

  beforeAll(async () => {
    server = new GodotyMCPServer();
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should capture editor viewport', async () => {
    const result = await server.callTool('godot_capture_viewport', {
      viewport_type: '3d',
      max_width: 1024,
      max_height: 768
    });

    // Verify image data
    expect(result.content[0].type).toBe('image');
    expect(result.content[0].data).toBeDefined();
    expect(result.content[0].mimeType).toBe('image/png');

    // Verify metadata
    expect(result.content[1].text).toContain('3D viewport');
  });

  it('should capture running game', async () => {
    // First run the scene
    await server.callTool('godot_run_action', {
      action: 'run_scene'
    });

    // Wait for game to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Capture game
    const result = await server.callTool('godot_capture_game', {});

    // Verify
    expect(result.content[0].type).toBe('image');

    // Stop the game
    await server.callTool('godot_run_action', {
      action: 'stop_scene'
    });
  });
});
```

---

## Performance Tests

```typescript
// tests/performance/benchmarks.test.ts

import { describe, it, expect } from 'vitest';
import { GodotClient } from '@godoty/mcp';

describe('Performance Benchmarks', () => {
  let client: GodotClient;

  beforeAll(async () => {
    client = new GodotClient({ url: 'ws://127.0.0.1:6550' });
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  it('ping latency should be under 50ms', async () => {
    const latencies: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      await client.call('ping', {});
      latencies.push(performance.now() - start);
    }

    const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length;
    const maxLatency = Math.max(...latencies);

    console.log(`Ping latency - Avg: ${avgLatency.toFixed(2)}ms, Max: ${maxLatency.toFixed(2)}ms`);

    expect(avgLatency).toBeLessThan(50);
    expect(maxLatency).toBeLessThan(200);
  });

  it('viewport capture should be under 500ms', async () => {
    const times: number[] = [];

    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      await client.call('capture_viewport', { viewport_type: '3d', max_width: 1024 });
      times.push(performance.now() - start);
    }

    const avgTime = times.reduce((a, b) => a + b) / times.length;
    console.log(`Viewport capture - Avg: ${avgTime.toFixed(2)}ms`);

    expect(avgTime).toBeLessThan(500);
  });

  it('documentation fetch should be under 100ms (cached)', async () => {
    // First call (cache miss)
    await client.call('get_class_docs', { class_name: 'Node' });

    // Subsequent calls (cache hit)
    const times: number[] = [];
    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      await client.call('get_class_docs', { class_name: 'Node' });
      times.push(performance.now() - start);
    }

    const avgTime = times.reduce((a, b) => a + b) / times.length;
    console.log(`Doc fetch (cached) - Avg: ${avgTime.toFixed(2)}ms`);

    expect(avgTime).toBeLessThan(100);
  });

  it('scene tree fetch should scale with depth', async () => {
    const depths = [3, 5, 10, -1];
    const results: Record<number, number> = {};

    for (const depth of depths) {
      const start = performance.now();
      await client.call('get_scene_tree', { max_depth: depth });
      results[depth] = performance.now() - start;
    }

    console.log('Scene tree fetch times by depth:', results);

    // Even unlimited depth should be under 500ms for reasonable scenes
    expect(results[-1]).toBeLessThan(500);
  });
});
```

---

## Test Environment Setup

### Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Build packages
pnpm build

# 3. Start Godot with test project
godot --path godot-plugin/

# 4. Enable Godoty Bridge plugin in Godot

# 5. Run tests
pnpm test              # Unit tests
pnpm test:integration  # Integration tests (requires Godot)
pnpm test:e2e         # E2E tests (requires Godot + auth)
```

### Environment Variables for Testing

```bash
# .env.test
VITE_LITELLM_URL=https://litellm-production-150c.up.railway.app
VITE_SUPABASE_URL=https://kbnaymejrngxhpigwphh.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_crqwAKS-G2fVqkyOTr95lQ_SQu-vaj3
TEST_USER_EMAIL=test@godoty.dev
TEST_PASSWORD=<test-password>
GODOT_WS_URL=ws://127.0.0.1:6550
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build
        run: pnpm build
      
      - name: Run unit tests
        run: pnpm test

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
      
      - name: Install Godot
        run: |
          wget https://github.com/godotengine/godot/releases/download/4.3-stable/Godot_v4.3-stable_linux.x86_64.zip
          unzip Godot_v4.3-stable_linux.x86_64.zip
          chmod +x Godot_v4.3-stable_linux.x86_64
          sudo mv Godot_v4.3-stable_linux.x86_64 /usr/local/bin/godot
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build
        run: pnpm build
      
      - name: Start Godot in background
        run: |
          godot --headless --path godot-plugin/ &
          sleep 10
      
      - name: Run integration tests
        run: pnpm test:integration
        env:
          GODOT_WS_URL: ws://127.0.0.1:6550

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      # ... similar setup ...
      
      - name: Run E2E tests
        run: pnpm test:e2e
        env:
          VITE_LITELLM_URL: ${{ secrets.LITELLM_URL }}
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
```

---

## Test Coverage Requirements

### Minimum Coverage

| Package | Statement | Branch | Function |
|---------|-----------|--------|----------|
| godoty-mcp | 80% | 70% | 80% |
| godoty-auth | 80% | 70% | 80% |
| godoty-llm | 80% | 70% | 80% |
| godoty-protocol | 90% | 80% | 90% |
| vscode-extension | 70% | 60% | 70% |

### Coverage Commands

```bash
# Generate coverage report
pnpm test:coverage

# View HTML report
open coverage/index.html
```

### Coverage Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules',
        'dist',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/types/**'
      ],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80
      }
    }
  }
});
```
