# Godoty MCP Server

> Model Context Protocol Server for Godot Integration

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Tools Reference](#tools-reference)
5. [Implementation](#implementation)
6. [Configuration](#configuration)
7. [Error Handling](#error-handling)

---

## Overview

The Godoty MCP Server is a TypeScript-based Model Context Protocol server that:

- Bridges MCP clients (like Kilo Code) with the Godot Bridge Plugin
- Exposes Godot capabilities as MCP tools
- Manages WebSocket connection to Godot
- Handles request/response transformation

### MCP Protocol

The Model Context Protocol (MCP) is a standard for connecting AI assistants with external tools and data sources. Godoty implements MCP to allow AI models to:

- Capture screenshots from Godot
- Fetch documentation
- Inspect scene structure
- Execute editor actions

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MCP CLIENT (Kilo Code)                             │
│                                                                              │
│  Sends tool calls:                                                           │
│  - godot_capture_viewport                                                    │
│  - godot_get_docs                                                            │
│  - godot_get_scene                                                           │
│  - godot_run_action                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ STDIO (JSON-RPC)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GODOTY MCP SERVER                                   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        MCP Server Core                               │    │
│  │  - Tool registration                                                 │    │
│  │  - Request handling                                                  │    │
│  │  - Response formatting                                               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                     │                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        Godot Client                                  │    │
│  │  - WebSocket connection to Godot                                     │    │
│  │  - JSON-RPC message handling                                         │    │
│  │  - Connection state management                                       │    │
│  │  - Event subscription                                                │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                     │                                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │   Capture    │ │    Docs      │ │    Scene     │ │   Actions    │       │
│  │    Tools     │ │   Tools      │ │   Tools      │ │    Tools     │       │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ WebSocket (ws://127.0.0.1:6550)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GODOT BRIDGE PLUGIN                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Installation

### As Part of Godoty Extension

The MCP server is bundled with the Godoty VS Code extension and starts automatically.

### Standalone Development

```bash
cd packages/godoty-mcp
pnpm install
pnpm build
pnpm start
```

### MCP Configuration

Add to your MCP settings (`.kilocode/mcp.json` or global settings):

```json
{
  "mcpServers": {
    "godoty": {
      "command": "node",
      "args": ["path/to/godoty-mcp/dist/index.js"],
      "env": {
        "GODOT_WS_URL": "ws://127.0.0.1:6550"
      }
    }
  }
}
```

---

## Tools Reference

### godot_capture_viewport

Captures a screenshot of the Godot editor viewport.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "viewport_type": {
      "type": "string",
      "enum": ["2d", "3d", "both"],
      "default": "3d",
      "description": "Which viewport to capture"
    },
    "max_width": {
      "type": "number",
      "default": 2048,
      "description": "Maximum image width"
    },
    "max_height": {
      "type": "number",
      "default": 2048,
      "description": "Maximum image height"
    }
  }
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "image",
      "data": "base64-encoded-png",
      "mimeType": "image/png"
    },
    {
      "type": "text",
      "text": "Captured 3D viewport (1920x1080)"
    }
  ]
}
```

---

### godot_capture_game

Captures a screenshot of the running game.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "max_width": {
      "type": "number",
      "default": 1920
    },
    "max_height": {
      "type": "number",
      "default": 1080
    }
  }
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "image",
      "data": "base64-encoded-png",
      "mimeType": "image/png"
    },
    {
      "type": "text",
      "text": "Captured game screenshot from scene: res://main.tscn"
    }
  ]
}
```

---

### godot_get_docs

Fetches documentation for a Godot class or method.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "class_name": {
      "type": "string",
      "description": "Godot class name (e.g., 'CharacterBody3D')"
    },
    "method_name": {
      "type": "string",
      "description": "Optional: specific method to document"
    },
    "include_inherited": {
      "type": "boolean",
      "default": false
    }
  },
  "required": ["class_name"]
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "# CharacterBody3D\n\nInherits: PhysicsBody3D\n\n## Methods\n\n### move_and_slide()\n- Returns: bool\n- Description: Moves the body based on velocity..."
    }
  ]
}
```

---

### godot_get_scene

Gets the current scene tree structure.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "root_path": {
      "type": "string",
      "default": "/root",
      "description": "Starting node path"
    },
    "max_depth": {
      "type": "number",
      "default": -1,
      "description": "Maximum depth (-1 for unlimited)"
    },
    "include_properties": {
      "type": "boolean",
      "default": false
    }
  }
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Scene: res://main.tscn\n\nMain (Node3D)\n├── Player (CharacterBody3D) [script: player.gd]\n│   ├── CollisionShape3D\n│   ├── MeshInstance3D\n│   └── Camera3D\n└── World (Node3D)\n    └── Ground (StaticBody3D)"
    }
  ]
}
```

---

### godot_get_selected

Gets currently selected nodes in the editor.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "include_properties": {
      "type": "boolean",
      "default": false
    }
  }
}
```

---

### godot_run_action

Executes an action in the Godot editor.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "action": {
      "type": "string",
      "enum": [
        "run_scene",
        "run_main_scene",
        "stop_scene",
        "pause_scene",
        "resume_scene",
        "select_node",
        "focus_node",
        "set_property",
        "create_node",
        "save_scene",
        "reload_scene"
      ]
    },
    "params": {
      "type": "object",
      "description": "Action-specific parameters"
    }
  },
  "required": ["action"]
}
```

**Examples:**

Run scene:
```json
{
  "action": "run_scene",
  "params": { "scene_path": "res://levels/level1.tscn" }
}
```

Select node:
```json
{
  "action": "select_node",
  "params": { "node_path": "/root/Main/Player" }
}
```

Set property:
```json
{
  "action": "set_property",
  "params": {
    "node_path": "/root/Main/Player",
    "property": "velocity",
    "value": "Vector3(0, 0, 0)"
  }
}
```

---

### godot_get_errors

Gets recent errors and warnings from the debugger.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "count": {
      "type": "number",
      "default": 10
    },
    "severity": {
      "type": "string",
      "enum": ["error", "warning", "all"],
      "default": "all"
    }
  }
}
```

---

## Implementation

### Project Structure

```
packages/godoty-mcp/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # MCP server setup
│   ├── godot-client.ts       # WebSocket client
│   ├── tools/
│   │   ├── index.ts          # Tool registration
│   │   ├── capture.ts        # Viewport/game capture
│   │   ├── docs.ts           # Documentation tools
│   │   ├── scene.ts          # Scene inspection
│   │   └── actions.ts        # Action execution
│   ├── utils/
│   │   ├── formatters.ts     # Output formatting
│   │   └── validators.ts     # Input validation
│   └── types/
│       └── godot.ts          # TypeScript types
├── package.json
└── tsconfig.json
```

### Core Implementation

#### index.ts

```typescript
#!/usr/bin/env node

import { GodotyMCPServer } from './server.js';

const server = new GodotyMCPServer();

server.start().catch((error) => {
  console.error('Failed to start Godoty MCP server:', error);
  process.exit(1);
});
```

#### server.ts

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { GodotClient } from './godot-client.js';
import { registerTools, handleToolCall } from './tools/index.js';

export class GodotyMCPServer {
  private server: Server;
  private godotClient: GodotClient;

  constructor() {
    this.server = new Server(
      {
        name: 'godoty-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.godotClient = new GodotClient({
      url: process.env.GODOT_WS_URL || 'ws://127.0.0.1:6550',
      reconnect: true,
      reconnectInterval: 2000,
    });

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: registerTools(),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      // Ensure connected to Godot
      if (!this.godotClient.isConnected()) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: Not connected to Godot. Please ensure the Godot editor is running with the Godoty Bridge plugin enabled.',
            },
          ],
          isError: true,
        };
      }

      try {
        return await handleToolCall(name, args || {}, this.godotClient);
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async start(): Promise<void> {
    // Connect to Godot
    await this.godotClient.connect();

    // Start MCP server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error('Godoty MCP server started');
  }

  async stop(): Promise<void> {
    await this.godotClient.disconnect();
    await this.server.close();
  }
}
```

#### godot-client.ts

```typescript
import WebSocket from 'ws';

interface GodotClientConfig {
  url: string;
  reconnect: boolean;
  reconnectInterval: number;
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export class GodotClient {
  private config: GodotClientConfig;
  private ws: WebSocket | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
  }>();
  private connected = false;
  private reconnecting = false;

  constructor(config: GodotClientConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.on('open', () => {
          this.connected = true;
          this.reconnecting = false;
          console.error('Connected to Godot');
          resolve();
        });

        this.ws.on('message', (data) => {
          this.handleMessage(data.toString());
        });

        this.ws.on('close', () => {
          this.connected = false;
          console.error('Disconnected from Godot');
          if (this.config.reconnect && !this.reconnecting) {
            this.scheduleReconnect();
          }
        });

        this.ws.on('error', (error) => {
          console.error('WebSocket error:', error.message);
          if (!this.connected) {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    this.config.reconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async call<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    if (!this.connected || !this.ws) {
      throw new Error('Not connected to Godot');
    }

    const id = ++this.requestId;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, 30000);

      this.pendingRequests.set(id, {
        resolve: (result) => {
          clearTimeout(timeout);
          resolve(result as T);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });

      this.ws!.send(JSON.stringify(request));
    });
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      // Handle response
      if ('id' in message && message.id !== null) {
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
          this.pendingRequests.delete(message.id);
          
          if (message.error) {
            pending.reject(new Error(message.error.message));
          } else {
            pending.resolve(message.result);
          }
        }
      }

      // Handle notification/event
      if ('method' in message && !('id' in message)) {
        this.handleEvent(message.method, message.params);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  private handleEvent(method: string, params: unknown): void {
    // Handle Godot events (errors, selection changes, etc.)
    console.error(`Godot event: ${method}`, params);
  }

  private scheduleReconnect(): void {
    if (this.reconnecting) return;
    
    this.reconnecting = true;
    console.error(`Reconnecting in ${this.config.reconnectInterval}ms...`);
    
    setTimeout(() => {
      this.connect().catch(() => {
        this.scheduleReconnect();
      });
    }, this.config.reconnectInterval);
  }
}
```

#### tools/index.ts

```typescript
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { GodotClient } from '../godot-client.js';
import { handleCapture, captureTools } from './capture.js';
import { handleDocs, docsTools } from './docs.js';
import { handleScene, sceneTools } from './scene.js';
import { handleActions, actionTools } from './actions.js';

export function registerTools(): Tool[] {
  return [
    ...captureTools,
    ...docsTools,
    ...sceneTools,
    ...actionTools,
  ];
}

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  client: GodotClient
): Promise<{ content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> }> {
  switch (name) {
    case 'godot_capture_viewport':
    case 'godot_capture_game':
      return handleCapture(name, args, client);

    case 'godot_get_docs':
    case 'godot_search_docs':
      return handleDocs(name, args, client);

    case 'godot_get_scene':
    case 'godot_get_selected':
    case 'godot_get_node':
      return handleScene(name, args, client);

    case 'godot_run_action':
    case 'godot_get_errors':
      return handleActions(name, args, client);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
```

#### tools/capture.ts

```typescript
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { GodotClient } from '../godot-client.js';

export const captureTools: Tool[] = [
  {
    name: 'godot_capture_viewport',
    description: 'Capture a screenshot of the Godot editor viewport (2D or 3D)',
    inputSchema: {
      type: 'object',
      properties: {
        viewport_type: {
          type: 'string',
          enum: ['2d', '3d', 'both'],
          default: '3d',
          description: 'Which viewport to capture',
        },
        max_width: {
          type: 'number',
          default: 2048,
          description: 'Maximum image width',
        },
        max_height: {
          type: 'number',
          default: 2048,
          description: 'Maximum image height',
        },
      },
    },
  },
  {
    name: 'godot_capture_game',
    description: 'Capture a screenshot of the running game',
    inputSchema: {
      type: 'object',
      properties: {
        max_width: {
          type: 'number',
          default: 1920,
        },
        max_height: {
          type: 'number',
          default: 1080,
        },
      },
    },
  },
];

interface CaptureResult {
  success: boolean;
  image?: string;
  images?: {
    '2d'?: { image: string; width: number; height: number };
    '3d'?: { image: string; width: number; height: number };
  };
  width?: number;
  height?: number;
  viewport_type?: string;
  scene_path?: string;
  error?: { message: string };
}

export async function handleCapture(
  name: string,
  args: Record<string, unknown>,
  client: GodotClient
): Promise<{ content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> }> {
  const method = name === 'godot_capture_viewport' ? 'capture_viewport' : 'capture_game';
  
  const result = await client.call<CaptureResult>(method, args);

  if (!result.success) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to capture: ${result.error?.message || 'Unknown error'}`,
        },
      ],
    };
  }

  const content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> = [];

  // Handle single image
  if (result.image) {
    // Extract base64 data from data URL
    const base64Match = result.image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (base64Match) {
      content.push({
        type: 'image',
        data: base64Match[2],
        mimeType: `image/${base64Match[1]}`,
      });
    }
    
    content.push({
      type: 'text',
      text: `Captured ${result.viewport_type || 'game'} viewport (${result.width}x${result.height})${result.scene_path ? ` - Scene: ${result.scene_path}` : ''}`,
    });
  }

  // Handle multiple images (both viewports)
  if (result.images) {
    for (const [vpType, vpData] of Object.entries(result.images)) {
      const base64Match = vpData.image.match(/^data:image\/(\w+);base64,(.+)$/);
      if (base64Match) {
        content.push({
          type: 'image',
          data: base64Match[2],
          mimeType: `image/${base64Match[1]}`,
        });
        content.push({
          type: 'text',
          text: `${vpType.toUpperCase()} viewport (${vpData.width}x${vpData.height})`,
        });
      }
    }
  }

  return { content };
}
```

#### tools/docs.ts

```typescript
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { GodotClient } from '../godot-client.js';

export const docsTools: Tool[] = [
  {
    name: 'godot_get_docs',
    description: 'Get documentation for a Godot class or method from the running editor',
    inputSchema: {
      type: 'object',
      properties: {
        class_name: {
          type: 'string',
          description: 'Godot class name (e.g., "CharacterBody3D")',
        },
        method_name: {
          type: 'string',
          description: 'Optional: specific method to document',
        },
        include_inherited: {
          type: 'boolean',
          default: false,
          description: 'Include inherited members',
        },
      },
      required: ['class_name'],
    },
  },
  {
    name: 'godot_search_docs',
    description: 'Search Godot documentation for classes, methods, or properties',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
        limit: {
          type: 'number',
          default: 10,
        },
      },
      required: ['query'],
    },
  },
];

interface ClassDocs {
  success: boolean;
  class_name: string;
  inherits: string;
  methods: Array<{
    name: string;
    return_type: string;
    arguments: Array<{ name: string; type: string }>;
    description: string;
  }>;
  properties: Array<{
    name: string;
    type: string;
    default: string;
    description: string;
  }>;
  signals: Array<{
    name: string;
    arguments: Array<{ name: string; type: string }>;
  }>;
  error?: { message: string };
}

export async function handleDocs(
  name: string,
  args: Record<string, unknown>,
  client: GodotClient
): Promise<{ content: Array<{ type: string; text: string }> }> {
  if (name === 'godot_search_docs') {
    const result = await client.call<{ results: Array<{ type: string; class_name: string; name: string }> }>('search_docs', args);
    
    const formatted = result.results
      .map((r) => `- [${r.type}] ${r.class_name}.${r.name}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Search results for "${args.query}":\n\n${formatted}`,
        },
      ],
    };
  }

  // Get class or method docs
  const method = args.method_name ? 'get_method_docs' : 'get_class_docs';
  const result = await client.call<ClassDocs>(method, args);

  if (!result.success) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${result.error?.message || 'Unknown error'}`,
        },
      ],
    };
  }

  // Format as markdown
  const md = formatClassDocs(result);

  return {
    content: [
      {
        type: 'text',
        text: md,
      },
    ],
  };
}

function formatClassDocs(docs: ClassDocs): string {
  const lines: string[] = [];

  lines.push(`# ${docs.class_name}`);
  lines.push('');
  
  if (docs.inherits) {
    lines.push(`**Inherits:** ${docs.inherits}`);
    lines.push('');
  }

  // Properties
  if (docs.properties.length > 0) {
    lines.push('## Properties');
    lines.push('');
    lines.push('| Name | Type | Default |');
    lines.push('|------|------|---------|');
    for (const prop of docs.properties) {
      lines.push(`| \`${prop.name}\` | ${prop.type} | ${prop.default || '-'} |`);
    }
    lines.push('');
  }

  // Methods
  if (docs.methods.length > 0) {
    lines.push('## Methods');
    lines.push('');
    for (const method of docs.methods) {
      const args = method.arguments.map((a) => `${a.name}: ${a.type}`).join(', ');
      lines.push(`### ${method.name}(${args}) -> ${method.return_type}`);
      if (method.description) {
        lines.push('');
        lines.push(method.description);
      }
      lines.push('');
    }
  }

  // Signals
  if (docs.signals.length > 0) {
    lines.push('## Signals');
    lines.push('');
    for (const signal of docs.signals) {
      const args = signal.arguments.map((a) => `${a.name}: ${a.type}`).join(', ');
      lines.push(`- **${signal.name}**(${args})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GODOT_WS_URL` | `ws://127.0.0.1:6550` | Godot WebSocket server URL |
| `GODOT_RECONNECT` | `true` | Auto-reconnect on disconnect |
| `GODOT_RECONNECT_INTERVAL` | `2000` | Reconnect interval (ms) |
| `GODOT_REQUEST_TIMEOUT` | `30000` | Request timeout (ms) |

### package.json

```json
{
  "name": "@godoty/mcp",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "godoty-mcp": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "ws": "^8.16.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/ws": "^8.5.0",
    "typescript": "^5.3.0",
    "tsx": "^4.7.0"
  }
}
```

---

## Error Handling

### Error Response Format

```typescript
interface ErrorResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError: true;
}
```

### Error Categories

| Category | Handling |
|----------|----------|
| Connection errors | Return "Not connected" message, trigger reconnect |
| Timeout errors | Return timeout message with method name |
| Godot errors | Forward error message from Godot |
| Validation errors | Return specific validation failure |

---

## Next Steps

1. See [VSCODE_EXTENSION.md](VSCODE_EXTENSION.md) for extension integration
2. See [PROTOCOL.md](PROTOCOL.md) for message format details
3. See [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) for build steps
