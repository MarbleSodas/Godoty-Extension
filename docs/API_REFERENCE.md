# Godoty API Reference

> Complete API documentation for all Godoty components

## Table of Contents

1. [MCP Tools API](#mcp-tools-api)
2. [Godot Bridge Protocol](#godot-bridge-protocol)
3. [LiteLLM API](#litellm-api)
4. [Supabase API](#supabase-api)
5. [VS Code Extension API](#vs-code-extension-api)
6. [TypeScript Types](#typescript-types)

---

## MCP Tools API

### Tool: godot_capture_viewport

Captures a screenshot of the Godot editor viewport.

#### Input

```typescript
interface CaptureViewportInput {
  viewport_type?: '2d' | '3d' | 'both';  // Default: '3d'
  max_width?: number;                      // Default: 2048
  max_height?: number;                     // Default: 2048
  format?: 'png' | 'jpg';                  // Default: 'png'
}
```

#### Output

```typescript
interface CaptureViewportOutput {
  content: [
    {
      type: 'image';
      data: string;       // Base64 encoded image
      mimeType: string;   // 'image/png' or 'image/jpeg'
    },
    {
      type: 'text';
      text: string;       // Description of capture
    }
  ];
}
```

#### Example

```typescript
// Single viewport
{
  viewport_type: '3d',
  max_width: 1920,
  max_height: 1080
}

// Both viewports
{
  viewport_type: 'both'
}
```

---

### Tool: godot_capture_game

Captures a screenshot of the running game.

#### Input

```typescript
interface CaptureGameInput {
  max_width?: number;   // Default: 1920
  max_height?: number;  // Default: 1080
  format?: 'png' | 'jpg';
}
```

#### Output

Same as `godot_capture_viewport`, plus `scene_path` in the text description.

#### Error Cases

| Error | Description |
|-------|-------------|
| Game not running | No game is currently running |
| Capture timeout | Game didn't respond in time |

---

### Tool: godot_get_docs

Fetches documentation for a Godot class or method.

#### Input

```typescript
interface GetDocsInput {
  class_name: string;           // Required: Godot class name
  method_name?: string;         // Optional: Specific method
  include_inherited?: boolean;  // Default: false
}
```

#### Output

```typescript
interface GetDocsOutput {
  content: [
    {
      type: 'text';
      text: string;  // Formatted markdown documentation
    }
  ];
}
```

#### Example Output (Markdown)

```markdown
# CharacterBody3D

**Inherits:** PhysicsBody3D

## Properties

| Name | Type | Default |
|------|------|---------|
| `velocity` | Vector3 | Vector3(0, 0, 0) |
| `floor_max_angle` | float | 0.785398 |

## Methods

### move_and_slide() -> bool

Moves the body based on velocity...

### is_on_floor() -> bool

Returns true if the body is on the floor.
```

---

### Tool: godot_search_docs

Searches Godot documentation.

#### Input

```typescript
interface SearchDocsInput {
  query: string;                    // Search query
  search_in?: ('classes' | 'methods' | 'properties' | 'signals')[];
  limit?: number;                   // Default: 10
}
```

#### Output

```typescript
interface SearchDocsOutput {
  content: [
    {
      type: 'text';
      text: string;  // Formatted search results
    }
  ];
}
```

---

### Tool: godot_get_scene

Gets the current scene tree structure.

#### Input

```typescript
interface GetSceneInput {
  root_path?: string;           // Default: '/root'
  max_depth?: number;           // Default: -1 (unlimited)
  include_properties?: boolean; // Default: false
}
```

#### Output

```typescript
interface GetSceneOutput {
  content: [
    {
      type: 'text';
      text: string;  // ASCII tree representation
    }
  ];
}
```

#### Example Output

```
Scene: res://main.tscn

Main (Node3D)
├── Player (CharacterBody3D) [script: player.gd]
│   ├── CollisionShape3D
│   ├── MeshInstance3D
│   └── Camera3D
└── World (Node3D)
    ├── Ground (StaticBody3D)
    │   └── CollisionShape3D
    └── Enemies (Node3D)
        ├── Enemy1 (CharacterBody3D)
        └── Enemy2 (CharacterBody3D)
```

---

### Tool: godot_get_selected

Gets currently selected nodes in the editor.

#### Input

```typescript
interface GetSelectedInput {
  include_properties?: boolean;  // Default: false
}
```

#### Output

```typescript
interface GetSelectedOutput {
  content: [
    {
      type: 'text';
      text: string;  // List of selected nodes with info
    }
  ];
}
```

---

### Tool: godot_get_node

Gets detailed information about a specific node.

#### Input

```typescript
interface GetNodeInput {
  node_path: string;             // Required: Path to node
  include_children?: boolean;    // Default: false
  property_filter?: string[];    // Optional: Filter properties
}
```

---

### Tool: godot_run_action

Executes an action in the Godot editor.

#### Input

```typescript
interface RunActionInput {
  action: 
    | 'run_scene'
    | 'run_main_scene'
    | 'stop_scene'
    | 'pause_scene'
    | 'resume_scene'
    | 'select_node'
    | 'select_nodes'
    | 'focus_node'
    | 'set_property'
    | 'create_node'
    | 'delete_node'
    | 'save_scene'
    | 'reload_scene';
  params?: Record<string, any>;
}
```

#### Action Parameters

| Action | Parameters |
|--------|------------|
| `run_scene` | `{ scene_path?: string }` |
| `select_node` | `{ node_path: string }` |
| `select_nodes` | `{ node_paths: string[] }` |
| `focus_node` | `{ node_path: string }` |
| `set_property` | `{ node_path: string, property: string, value: string }` |
| `create_node` | `{ parent_path: string, node_type: string, name?: string }` |
| `delete_node` | `{ node_path: string }` (requires opt-in) |

---

### Tool: godot_get_errors

Gets recent errors and warnings from the debugger.

#### Input

```typescript
interface GetErrorsInput {
  count?: number;              // Default: 10
  severity?: 'error' | 'warning' | 'all';  // Default: 'all'
  since?: number;              // Unix timestamp
}
```

#### Output

```typescript
interface GetErrorsOutput {
  content: [
    {
      type: 'text';
      text: string;  // Formatted error list
    }
  ];
}
```

---

## Godot Bridge Protocol

See [PROTOCOL.md](PROTOCOL.md) for the complete WebSocket JSON-RPC protocol specification.

### Quick Reference

| Method | Description |
|--------|-------------|
| `capture_viewport` | Capture editor viewport |
| `capture_game` | Capture running game |
| `get_class_docs` | Get class documentation |
| `get_method_docs` | Get method documentation |
| `search_docs` | Search documentation |
| `get_scene_tree` | Get scene hierarchy |
| `get_node_properties` | Get node properties |
| `get_selected_nodes` | Get selection |
| `execute_action` | Execute editor action |
| `get_errors` | Get debug errors |
| `get_editor_info` | Get editor state |
| `ping` | Health check |

---

## LiteLLM API

Base URL: `https://litellm-production-150c.up.railway.app`

### Chat Completion

```http
POST /chat/completions
Authorization: Bearer <api_key>
Content-Type: application/json
```

#### Request

```typescript
interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string | ContentPart[];
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: Tool[];
}

interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;  // base64 data URL or http URL
  };
}

interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: JSONSchema;
  };
}
```

#### Response

```typescript
interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: 'stop' | 'tool_calls' | 'length';
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

### List Models

```http
GET /models
Authorization: Bearer <api_key>
```

#### Response

```typescript
interface ModelsResponse {
  data: Array<{
    id: string;
    object: 'model';
    owned_by: string;
  }>;
}
```

### Available Models

| Model ID | Provider | Vision | Tools |
|----------|----------|--------|-------|
| `gpt-4o` | OpenAI | ✓ | ✓ |
| `gpt-4o-mini` | OpenAI | ✓ | ✓ |
| `claude-3-5-sonnet-20241022` | Anthropic | ✓ | ✓ |
| `claude-3-5-haiku-20241022` | Anthropic | ✓ | ✓ |
| `gemini/gemini-2.0-flash` | Google | ✓ | ✓ |
| `gemini/gemini-1.5-pro` | Google | ✓ | ✓ |

---

## Supabase API

Base URL: `https://kbnaymejrngxhpigwphh.supabase.co`

### Authentication

#### Sign Up

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
});
```

#### Sign In

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});
```

#### OAuth

```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'github',  // or 'google'
  options: {
    redirectTo: 'vscode://godoty.godoty/auth/callback'
  }
});
```

### Database Tables

#### user_profiles

```typescript
interface UserProfile {
  id: string;           // UUID
  user_id: string;      // FK to auth.users
  email: string;
  display_name: string;
  avatar_url?: string;
  preferences: {
    defaultModel: string;
    theme: 'light' | 'dark' | 'auto';
    autoConnect: boolean;
  };
  created_at: string;
  updated_at: string;
}
```

#### user_api_keys

```typescript
interface UserApiKey {
  id: string;
  user_id: string;
  litellm_key: string;
  created_at: string;
  last_used_at?: string;
}
```

#### usage_records

```typescript
interface UsageRecord {
  id: string;
  user_id: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: number;
  created_at: string;
}
```

### API Usage

```typescript
// Get user profile
const { data } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('user_id', userId)
  .single();

// Get API key
const { data } = await supabase
  .from('user_api_keys')
  .select('litellm_key')
  .eq('user_id', userId)
  .single();

// Insert usage record
await supabase.from('usage_records').insert({
  user_id: userId,
  model: 'gpt-4o',
  prompt_tokens: 100,
  completion_tokens: 50,
  total_tokens: 150
});

// Get usage summary
const { data } = await supabase
  .from('usage_records')
  .select('model, total_tokens.sum(), cost.sum()')
  .eq('user_id', userId)
  .gte('created_at', startDate);
```

---

## VS Code Extension API

### Commands

| Command | Description |
|---------|-------------|
| `godoty.signIn` | Open sign in dialog |
| `godoty.signOut` | Sign out current user |
| `godoty.captureViewport` | Capture and show viewport |
| `godoty.runScene` | Run current scene |
| `godoty.stopScene` | Stop running scene |
| `godoty.showConnectionMenu` | Show connection options |
| `godoty.reconnect` | Reconnect to Godot |

### Events

```typescript
// Listen for Godot events
vscode.commands.registerCommand('godoty.onGodotEvent', (event) => {
  switch (event.type) {
    case 'connected':
      console.log('Connected to Godot', event.version);
      break;
    case 'disconnected':
      console.log('Disconnected from Godot');
      break;
    case 'error':
      console.log('Godot error:', event.message);
      break;
    case 'scene_changed':
      console.log('Scene changed:', event.scene);
      break;
  }
});
```

### Configuration API

```typescript
// Get configuration
const config = vscode.workspace.getConfiguration('godoty');
const port = config.get<number>('connection.port', 6550);
const autoConnect = config.get<boolean>('connection.autoConnect', true);

// Update configuration
await config.update('defaultModel', 'gpt-4o', vscode.ConfigurationTarget.Global);
```

---

## TypeScript Types

### Shared Types Package

```typescript
// packages/godoty-protocol/src/types.ts

// Connection
export interface GodotConnectionStatus {
  connected: boolean;
  godotVersion: GodotVersion | null;
  pluginVersion: string | null;
  lastError: string | null;
}

export interface GodotVersion {
  major: number;
  minor: number;
  patch: number;
  status: string;
  string: string;
}

// Scene
export interface SceneNode {
  name: string;
  type: string;
  path: string;
  script?: string;
  children: SceneNode[];
}

export interface NodeProperties {
  node_path: string;
  node_type: string;
  script?: string;
  properties: Record<string, PropertyValue>;
  script_properties?: Record<string, PropertyValue>;
}

export interface PropertyValue {
  type: string;
  value: any;
  category?: string;
  exported?: boolean;
}

// Documentation
export interface ClassDocs {
  class_name: string;
  inherits: string;
  brief_description: string;
  description: string;
  methods: MethodDoc[];
  properties: PropertyDoc[];
  signals: SignalDoc[];
  enums: EnumDoc[];
  constants: ConstantDoc[];
}

export interface MethodDoc {
  name: string;
  return_type: string;
  description: string;
  arguments: ArgumentDoc[];
}

export interface PropertyDoc {
  name: string;
  type: string;
  description: string;
  default: string | null;
}

export interface SignalDoc {
  name: string;
  description: string;
  arguments: ArgumentDoc[];
}

export interface ArgumentDoc {
  name: string;
  type: string;
  default?: any;
}

// Capture
export interface CaptureResult {
  success: boolean;
  viewport_type: string;
  image?: string;
  images?: Record<string, ImageData>;
  width?: number;
  height?: number;
  scene_path?: string;
  timestamp: number;
  error?: { code: number; message: string };
}

export interface ImageData {
  image: string;
  width: number;
  height: number;
}

// Errors
export interface DebugError {
  severity: 'error' | 'warning';
  message: string;
  source: {
    script: string;
    function?: string;
    line: number;
  };
  stack_trace?: string[];
  timestamp: number;
}

// Actions
export type ActionType =
  | 'run_scene'
  | 'run_main_scene'
  | 'stop_scene'
  | 'pause_scene'
  | 'resume_scene'
  | 'select_node'
  | 'select_nodes'
  | 'focus_node'
  | 'set_property'
  | 'create_node'
  | 'delete_node'
  | 'save_scene'
  | 'reload_scene';

export interface ActionResult {
  success: boolean;
  action: ActionType;
  message?: string;
  data?: any;
  error?: { code: number; message: string };
}
```

---

## Error Codes Reference

| Code | Name | Description |
|------|------|-------------|
| -32700 | Parse Error | Invalid JSON |
| -32600 | Invalid Request | Missing required fields |
| -32601 | Method Not Found | Unknown method |
| -32602 | Invalid Params | Invalid parameters |
| -32603 | Internal Error | Godot internal error |
| -32000 | Node Not Found | Node path doesn't exist |
| -32001 | Class Not Found | Class doesn't exist |
| -32002 | Action Not Allowed | Action is disabled |
| -32003 | Game Not Running | No game running |
| -32004 | Capture Failed | Screenshot failed |
| -32005 | Timeout | Operation timed out |
| -32006 | Invalid Path | Invalid file/node path |
| -32007 | Auth Required | Authentication needed |
| -32008 | Quota Exceeded | Usage quota exceeded |
