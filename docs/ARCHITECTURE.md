# Godoty Architecture

> Complete system architecture and design specifications

## Table of Contents

1. [Overview](#overview)
2. [System Components](#system-components)
3. [Data Flow](#data-flow)
4. [Component Responsibilities](#component-responsibilities)
5. [Integration Points](#integration-points)
6. [State Management](#state-management)
7. [Error Handling](#error-handling)
8. [Performance Considerations](#performance-considerations)
9. [Security Model](#security-model)
10. [Extensibility](#extensibility)

---

## Overview

Godoty is a three-tier architecture consisting of:

1. **Godot Bridge Plugin** - Runs inside Godot Editor, provides data and executes commands
2. **Godoty MCP Server** - Translates between MCP protocol and Godot's WebSocket protocol
3. **VS Code Extension** - Modified Kilo Code with Godot-specific integrations

### Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Separation of Concerns** | Each component has a single responsibility |
| **Loose Coupling** | Components communicate via well-defined protocols |
| **Graceful Degradation** | Extension works without Godot connection (limited features) |
| **Version Agnostic** | Protocol abstracts Godot version differences |
| **Security First** | Local-only connections, whitelisted actions |

---

## System Components

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 VS CODE PROCESS                                  │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                         GODOTY VS CODE EXTENSION                            │ │
│  │                                                                             │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐   │ │
│  │  │                      KILO CODE CORE (FORKED)                         │   │ │
│  │  │                                                                      │   │ │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │ │
│  │  │  │   AI Chat    │  │  Code Gen    │  │    Modes     │               │   │ │
│  │  │  │   Engine     │  │   Engine     │  │   Manager    │               │   │ │
│  │  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │ │
│  │  │                            │                                         │   │ │
│  │  │  ┌──────────────────────────────────────────────────────────────┐   │   │ │
│  │  │  │                    MCP CLIENT                                 │   │   │ │
│  │  │  │  Connects to MCP Servers (including Godoty MCP Server)        │   │   │ │
│  │  │  └──────────────────────────────────────────────────────────────┘   │   │ │
│  │  └─────────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                             │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐   │ │
│  │  │                    GODOT INTEGRATION LAYER                           │   │ │
│  │  │                                                                      │   │ │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │ │
│  │  │  │   Context    │  │  Connection  │  │  Screenshot  │               │   │ │
│  │  │  │   Provider   │  │   Manager    │  │   Handler    │               │   │ │
│  │  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │ │
│  │  │                                                                      │   │ │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │ │
│  │  │  │    Godot     │  │    Status    │  │   Settings   │               │   │ │
│  │  │  │    Mode      │  │     Bar      │  │   Manager    │               │   │ │
│  │  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │ │
│  │  └─────────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                             │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐   │ │
│  │  │                         WEBVIEW UI                                   │   │ │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │ │
│  │  │  │   Viewport   │  │  Connection  │  │    Quick     │               │   │ │
│  │  │  │   Preview    │  │    Status    │  │   Actions    │               │   │ │
│  │  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │ │
│  │  └─────────────────────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                        │                                         │
│                                        │ STDIO                                   │
│                                        ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                         GODOTY MCP SERVER                                   │ │
│  │                         (Node.js Process)                                   │ │
│  │                                                                             │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │ │
│  │  │    MCP       │  │   Godot      │  │    Tool      │  │   Resource   │   │ │
│  │  │   Server     │  │   Client     │  │   Handlers   │  │   Handlers   │   │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         │ WebSocket (ws://127.0.0.1:6550)
                                         │
┌────────────────────────────────────────┼────────────────────────────────────────┐
│                               GODOT EDITOR PROCESS                               │
│                                        │                                         │
│  ┌─────────────────────────────────────┴───────────────────────────────────────┐│
│  │                       GODOTY BRIDGE PLUGIN                                   ││
│  │                       (EditorPlugin - GDScript)                              ││
│  │                                                                              ││
│  │  ┌────────────────────────────────────────────────────────────────────────┐ ││
│  │  │                        WEBSOCKET SERVER                                 │ ││
│  │  │  - Listens on 127.0.0.1:6550                                           │ ││
│  │  │  - JSON-RPC 2.0 protocol                                               │ ││
│  │  │  - Handles multiple connections                                        │ ││
│  │  └────────────────────────────────────────────────────────────────────────┘ ││
│  │                                                                              ││
│  │  ┌──────────────────────────────────────────────────────────────────────┐   ││
│  │  │                         REQUEST HANDLERS                              │   ││
│  │  │                                                                       │   ││
│  │  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐      │   ││
│  │  │  │  Viewport  │  │    Doc     │  │   Scene    │  │   Action   │      │   ││
│  │  │  │  Capture   │  │  Extractor │  │  Inspector │  │  Executor  │      │   ││
│  │  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘      │   ││
│  │  │                                                                       │   ││
│  │  │  ┌────────────┐  ┌────────────┐  ┌────────────┐                      │   ││
│  │  │  │   Debug    │  │   Error    │  │   Event    │                      │   ││
│  │  │  │  Capture   │  │  Collector │  │  Emitter   │                      │   ││
│  │  │  └────────────┘  └────────────┘  └────────────┘                      │   ││
│  │  └──────────────────────────────────────────────────────────────────────┘   ││
│  │                                                                              ││
│  │  ┌──────────────────────────────────────────────────────────────────────┐   ││
│  │  │                      GODOT EDITOR INTERFACE                           │   ││
│  │  │  - EditorInterface singleton                                          │   ││
│  │  │  - ClassDB access                                                     │   ││
│  │  │  - SceneTree access                                                   │   ││
│  │  │  - EditorDebuggerPlugin                                               │   ││
│  │  └──────────────────────────────────────────────────────────────────────┘   ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────────┐│
│  │                    RUNNING GAME (when debugging)                             ││
│  │  ┌──────────────────────────────────────────────────────────────────────┐   ││
│  │  │                  GODOTY DEBUG HELPER (AutoLoad)                       │   ││
│  │  │  - Captures game viewport on request                                  │   ││
│  │  │  - Sends frames via EngineDebugger                                    │   ││
│  │  └──────────────────────────────────────────────────────────────────────┘   ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Flow 1: Screenshot Capture (Editor Viewport)

```
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│    User    │    │  AI Chat   │    │    MCP     │    │   Godot    │
│            │    │   Engine   │    │   Server   │    │   Plugin   │
└─────┬──────┘    └─────┬──────┘    └─────┬──────┘    └─────┬──────┘
      │                 │                 │                 │
      │ "Show me the    │                 │                 │
      │  viewport"      │                 │                 │
      │────────────────>│                 │                 │
      │                 │                 │                 │
      │                 │ Call tool:      │                 │
      │                 │ godot_capture_  │                 │
      │                 │ viewport        │                 │
      │                 │────────────────>│                 │
      │                 │                 │                 │
      │                 │                 │ JSON-RPC:       │
      │                 │                 │ capture_viewport│
      │                 │                 │────────────────>│
      │                 │                 │                 │
      │                 │                 │                 │ Get 3D viewport
      │                 │                 │                 │ texture
      │                 │                 │                 │─────┐
      │                 │                 │                 │     │
      │                 │                 │                 │<────┘
      │                 │                 │                 │
      │                 │                 │                 │ Convert to
      │                 │                 │                 │ base64 PNG
      │                 │                 │                 │─────┐
      │                 │                 │                 │     │
      │                 │                 │                 │<────┘
      │                 │                 │                 │
      │                 │                 │ {success: true, │
      │                 │                 │  image: "data:  │
      │                 │                 │  image/png..."}│
      │                 │                 │<────────────────│
      │                 │                 │                 │
      │                 │ Tool result:    │                 │
      │                 │ screenshot data │                 │
      │                 │<────────────────│                 │
      │                 │                 │                 │
      │                 │ Process image   │                 │
      │                 │ with AI model   │                 │
      │                 │─────┐           │                 │
      │                 │     │           │                 │
      │                 │<────┘           │                 │
      │                 │                 │                 │
      │ "I can see your │                 │                 │
      │  scene has..."  │                 │                 │
      │<────────────────│                 │                 │
      │                 │                 │                 │
```

### Flow 2: Documentation Fetch

```
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│    User    │    │  AI Chat   │    │    MCP     │    │   Godot    │
│            │    │   Engine   │    │   Server   │    │   Plugin   │
└─────┬──────┘    └─────┬──────┘    └─────┬──────┘    └─────┬──────┘
      │                 │                 │                 │
      │ "How do I use   │                 │                 │
      │  CharacterBody  │                 │                 │
      │  3D?"           │                 │                 │
      │────────────────>│                 │                 │
      │                 │                 │                 │
      │                 │ Call tool:      │                 │
      │                 │ godot_get_docs  │                 │
      │                 │ {class:         │                 │
      │                 │  "Character     │                 │
      │                 │   Body3D"}      │                 │
      │                 │────────────────>│                 │
      │                 │                 │                 │
      │                 │                 │ JSON-RPC:       │
      │                 │                 │ get_class_docs  │
      │                 │                 │────────────────>│
      │                 │                 │                 │
      │                 │                 │                 │ ClassDB.
      │                 │                 │                 │ class_get_
      │                 │                 │                 │ method_list()
      │                 │                 │                 │─────┐
      │                 │                 │                 │     │
      │                 │                 │                 │<────┘
      │                 │                 │                 │
      │                 │                 │                 │ ClassDB.
      │                 │                 │                 │ class_get_
      │                 │                 │                 │ property_list()
      │                 │                 │                 │─────┐
      │                 │                 │                 │     │
      │                 │                 │                 │<────┘
      │                 │                 │                 │
      │                 │                 │ {class_name:    │
      │                 │                 │  "CharacterBody │
      │                 │                 │   3D",          │
      │                 │                 │  methods: [...],│
      │                 │                 │  properties:    │
      │                 │                 │   [...]}        │
      │                 │                 │<────────────────│
      │                 │                 │                 │
      │                 │ Documentation   │                 │
      │                 │ data            │                 │
      │                 │<────────────────│                 │
      │                 │                 │                 │
      │ "CharacterBody  │                 │                 │
      │  3D has these   │                 │                 │
      │  methods..."    │                 │                 │
      │<────────────────│                 │                 │
```

### Flow 3: Action Execution

```
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│    User    │    │  AI Chat   │    │    MCP     │    │   Godot    │
│            │    │   Engine   │    │   Server   │    │   Plugin   │
└─────┬──────┘    └─────┬──────┘    └─────┬──────┘    └─────┬──────┘
      │                 │                 │                 │
      │ "Run the        │                 │                 │
      │  current scene" │                 │                 │
      │────────────────>│                 │                 │
      │                 │                 │                 │
      │                 │ Call tool:      │                 │
      │                 │ godot_run_      │                 │
      │                 │ action          │                 │
      │                 │ {action:        │                 │
      │                 │  "run_scene"}   │                 │
      │                 │────────────────>│                 │
      │                 │                 │                 │
      │                 │                 │ JSON-RPC:       │
      │                 │                 │ execute_action  │
      │                 │                 │────────────────>│
      │                 │                 │                 │
      │                 │                 │                 │ EditorInterface
      │                 │                 │                 │ .play_current_
      │                 │                 │                 │ scene()
      │                 │                 │                 │─────┐
      │                 │                 │                 │     │
      │                 │                 │                 │<────┘
      │                 │                 │                 │
      │                 │                 │ {success: true, │
      │                 │                 │  action:        │
      │                 │                 │   "run_scene"}  │
      │                 │                 │<────────────────│
      │                 │                 │                 │
      │                 │ Action executed │                 │
      │                 │<────────────────│                 │
      │                 │                 │                 │
      │ "Scene is now   │                 │                 │
      │  running"       │                 │                 │
      │<────────────────│                 │                 │
```

### Flow 4: Game Screenshot (Debug)

```
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│    User    │    │  AI Chat   │    │    MCP     │    │   Godot    │    │  Running   │
│            │    │   Engine   │    │   Server   │    │   Plugin   │    │   Game     │
└─────┬──────┘    └─────┬──────┘    └─────┬──────┘    └─────┬──────┘    └─────┬──────┘
      │                 │                 │                 │                 │
      │ "Show me what   │                 │                 │                 │
      │  the game looks │                 │                 │                 │
      │  like now"      │                 │                 │                 │
      │────────────────>│                 │                 │                 │
      │                 │                 │                 │                 │
      │                 │ Call tool:      │                 │                 │
      │                 │ godot_capture_  │                 │                 │
      │                 │ game            │                 │                 │
      │                 │────────────────>│                 │                 │
      │                 │                 │                 │                 │
      │                 │                 │ JSON-RPC:       │                 │
      │                 │                 │ capture_game    │                 │
      │                 │                 │────────────────>│                 │
      │                 │                 │                 │                 │
      │                 │                 │                 │ EngineDebugger  │
      │                 │                 │                 │ .send_message() │
      │                 │                 │                 │ "godoty:request │
      │                 │                 │                 │  _frame"        │
      │                 │                 │                 │────────────────>│
      │                 │                 │                 │                 │
      │                 │                 │                 │                 │ Capture
      │                 │                 │                 │                 │ viewport
      │                 │                 │                 │                 │─────┐
      │                 │                 │                 │                 │     │
      │                 │                 │                 │                 │<────┘
      │                 │                 │                 │                 │
      │                 │                 │                 │ EngineDebugger  │
      │                 │                 │                 │ message:        │
      │                 │                 │                 │ "godoty:frame   │
      │                 │                 │                 │  _data"         │
      │                 │                 │                 │<────────────────│
      │                 │                 │                 │                 │
      │                 │                 │ {success: true, │                 │
      │                 │                 │  image: "..."}  │                 │
      │                 │                 │<────────────────│                 │
      │                 │                 │                 │                 │
      │                 │ Game screenshot │                 │                 │
      │                 │<────────────────│                 │                 │
      │                 │                 │                 │                 │
      │ "I can see      │                 │                 │                 │
      │  your player    │                 │                 │                 │
      │  is at..."      │                 │                 │                 │
      │<────────────────│                 │                 │                 │
```

---

## Component Responsibilities

### 1. Godot Bridge Plugin

| Module | Responsibility |
|--------|----------------|
| `godoty_bridge.gd` | Main EditorPlugin, lifecycle management |
| `websocket_server.gd` | WebSocket server, connection handling |
| `viewport_capture.gd` | Editor viewport screenshot capture |
| `doc_extractor.gd` | ClassDB documentation extraction |
| `scene_inspector.gd` | Scene tree and property inspection |
| `action_executor.gd` | Editor action execution |
| `debug_capture.gd` | Running game screenshot capture |
| `protocol.gd` | JSON-RPC message parsing/building |

### 2. MCP Server

| Module | Responsibility |
|--------|----------------|
| `index.ts` | MCP server initialization |
| `godot-client.ts` | WebSocket client to Godot |
| `tools/capture.ts` | Viewport/game capture tool handlers |
| `tools/docs.ts` | Documentation fetch tool handlers |
| `tools/scene.ts` | Scene inspection tool handlers |
| `tools/actions.ts` | Action execution tool handlers |
| `resources/connection.ts` | Connection status resource |

### 3. VS Code Extension

| Module | Responsibility |
|--------|----------------|
| `godot/context-provider.ts` | Godot context for AI prompts |
| `godot/connection-manager.ts` | MCP server lifecycle |
| `godot/modes/godot-mode.ts` | Godot-specific AI mode |
| `webview-ui/GodotPanel/` | Godot-specific UI components |

---

## State Management

### Connection State Machine

```
                    ┌───────────────┐
                    │  DISCONNECTED │
                    └───────┬───────┘
                            │
                            │ User opens Godot project
                            │ in VS Code
                            ▼
                    ┌───────────────┐
                    │  CONNECTING   │
                    └───────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
      ┌───────────┐  ┌───────────┐  ┌───────────┐
      │  TIMEOUT  │  │   ERROR   │  │ CONNECTED │
      └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
            │              │              │
            │              │              │ Godot closes
            │              │              │ or network error
            ▼              ▼              ▼
      ┌───────────────────────────────────────┐
      │              RECONNECTING              │
      │  (Retry with exponential backoff)      │
      └───────────────────────────────────────┘
                            │
                            │ Max retries exceeded
                            ▼
                    ┌───────────────┐
                    │  DISCONNECTED │
                    └───────────────┘
```

### State Synchronization

```typescript
// Shared state interface
interface GodotyState {
  connection: {
    status: 'disconnected' | 'connecting' | 'connected' | 'error';
    godotVersion: string | null;
    lastError: string | null;
  };
  editor: {
    currentScene: string | null;
    selectedNodes: string[];
    isGameRunning: boolean;
  };
  cache: {
    documentationCache: Map<string, CachedDoc>;
    lastViewportCapture: CaptureResult | null;
  };
}
```

---

## Error Handling

### Error Categories

| Category | Examples | Handling |
|----------|----------|----------|
| **Connection** | Godot not running, port in use | Retry with backoff, show status |
| **Protocol** | Malformed JSON, unknown method | Log warning, return error response |
| **Execution** | Invalid node path, missing class | Return structured error in response |
| **Resource** | Capture timeout, memory limit | Graceful degradation, partial result |

### Error Response Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32000,
    "message": "Node not found",
    "data": {
      "node_path": "/root/Player/NonExistent",
      "suggestion": "Did you mean /root/Player/Sprite3D?"
    }
  }
}
```

### Error Codes

| Code | Meaning |
|------|---------|
| -32700 | Parse error (invalid JSON) |
| -32600 | Invalid request |
| -32601 | Method not found |
| -32602 | Invalid params |
| -32603 | Internal error |
| -32000 | Godot-specific: Node not found |
| -32001 | Godot-specific: Class not found |
| -32002 | Godot-specific: Action not allowed |
| -32003 | Godot-specific: Game not running |
| -32004 | Godot-specific: Capture failed |

---

## Performance Considerations

### Throttling

| Operation | Throttle Limit | Reason |
|-----------|----------------|--------|
| Viewport capture | 2/second | Prevent UI lag in Godot |
| Game capture | 1/second | Network bandwidth |
| Scene tree fetch | 5/second | Tree traversal cost |
| Doc fetch | 10/second | Usually cached |

### Caching Strategy

```typescript
interface CacheConfig {
  documentation: {
    ttl: 3600,        // 1 hour (rarely changes)
    maxSize: 1000     // entries
  },
  sceneTree: {
    ttl: 1,           // 1 second (frequently changes)
    maxSize: 10       // recent scenes
  },
  viewport: {
    ttl: 0,           // Never cache (always fresh)
    maxSize: 0
  }
}
```

### Image Optimization

1. **Resolution limiting**: Max 2048x2048 for viewport captures
2. **Compression**: PNG compression level 6 (balance of size/speed)
3. **Streaming**: Large images streamed in chunks if needed

---

## Security Model

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Remote code execution | Local-only binding (127.0.0.1) |
| Malicious MCP server | Extension validates MCP server origin |
| Unauthorized file access | No file system tools exposed |
| Action abuse | Dangerous actions require explicit enable |

### Action Whitelisting

```gdscript
# Actions that require explicit user opt-in
const DANGEROUS_ACTIONS = [
    "delete_node",
    "clear_scene",
    "modify_project_settings"
]

# Safe actions allowed by default
const SAFE_ACTIONS = [
    "run_scene",
    "stop_scene",
    "select_node",
    "set_property",
    "create_node"
]
```

### Connection Security

- WebSocket binds to `127.0.0.1` only (not `0.0.0.0`)
- No authentication required (local trusted)
- Optional: Shared secret for multi-user environments

---

## Extensibility

### Adding New Tools

1. **Godot Side**: Add handler in `godoty_bridge.gd`
2. **Protocol**: Define message format in `protocol.gd`
3. **MCP Server**: Add tool in `packages/godoty-mcp/src/tools/`
4. **Extension**: Update mode configuration if needed

### Plugin System (Future)

```gdscript
# Custom Godoty plugin interface
class_name GodotyPluginInterface

func get_custom_methods() -> Array[Dictionary]:
    # Return custom JSON-RPC methods to register
    pass

func handle_custom_method(method: String, params: Dictionary) -> Dictionary:
    # Handle the custom method
    pass
```

---

## Compatibility Matrix

| Godot Version | Support Level | Notes |
|---------------|---------------|-------|
| 4.3+ | Full | Primary target |
| 4.0-4.2 | Full | Minor API differences |
| 3.5+ | Planned | Different APIs, separate adapter |
| 3.0-3.4 | Limited | May not support all features |

### Version Detection

```gdscript
func _get_godot_version() -> Dictionary:
    var info = Engine.get_version_info()
    return {
        "major": info.major,
        "minor": info.minor,
        "patch": info.patch,
        "status": info.status,
        "string": info.string
    }
```

---

## Next Steps

1. Read [PROTOCOL.md](PROTOCOL.md) for detailed message specifications
2. Read [GODOT_PLUGIN.md](GODOT_PLUGIN.md) for plugin implementation
3. Read [MCP_SERVER.md](MCP_SERVER.md) for MCP server details
4. Read [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) for build steps
