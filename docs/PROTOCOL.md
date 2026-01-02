# Godoty Communication Protocol

> WebSocket JSON-RPC 2.0 Protocol Specification

## Table of Contents

1. [Overview](#overview)
2. [Connection](#connection)
3. [Message Format](#message-format)
4. [Methods Reference](#methods-reference)
5. [Events (Server Push)](#events-server-push)
6. [Error Handling](#error-handling)
7. [Examples](#examples)

---

## Overview

Godoty uses a WebSocket connection with JSON-RPC 2.0 for communication between the MCP Server (client) and the Godot Bridge Plugin (server).

### Protocol Stack

```
┌─────────────────────────────────────┐
│           JSON-RPC 2.0              │
├─────────────────────────────────────┤
│           WebSocket                 │
├─────────────────────────────────────┤
│             TCP                     │
└─────────────────────────────────────┘
```

### Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Stateless Requests** | Each request is independent |
| **Async-First** | All operations are non-blocking |
| **Structured Errors** | Rich error responses with context |
| **Event-Driven** | Server can push events to client |

---

## Connection

### Connection Parameters

| Parameter | Value |
|-----------|-------|
| Protocol | WebSocket (ws://) |
| Host | 127.0.0.1 (localhost only) |
| Port | 6550 (configurable) |
| Path | / |

### Connection URL

```
ws://127.0.0.1:6550/
```

### Connection Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                      CONNECTION LIFECYCLE                        │
└─────────────────────────────────────────────────────────────────┘

1. MCP Server connects to WebSocket
   ─────────────────────────────────>

2. Godot accepts connection, sends handshake
   <─────────────────────────────────
   {
     "jsonrpc": "2.0",
     "method": "godoty.connected",
     "params": {
       "godot_version": "4.3.0",
       "plugin_version": "1.0.0",
       "capabilities": ["capture", "docs", "scene", "actions", "debug"]
     }
   }

3. MCP Server acknowledges
   ─────────────────────────────────>
   {
     "jsonrpc": "2.0",
     "method": "godoty.ready",
     "params": {
       "client_name": "godoty-mcp",
       "client_version": "1.0.0"
     }
   }

4. Normal request/response communication
   <────────────────────────────────>

5. Disconnection (graceful or error)
   ─────────────────────────────────X

```

### Reconnection Strategy

```
Attempt 1: Wait 1 second
Attempt 2: Wait 2 seconds
Attempt 3: Wait 4 seconds
Attempt 4: Wait 8 seconds
Attempt 5: Wait 16 seconds
Attempt 6+: Wait 30 seconds (max)

After 10 failed attempts: Stop and notify user
```

---

## Message Format

### Request

```json
{
  "jsonrpc": "2.0",
  "id": "<unique-request-id>",
  "method": "<method-name>",
  "params": {
    "<param1>": "<value1>",
    "<param2>": "<value2>"
  }
}
```

### Response (Success)

```json
{
  "jsonrpc": "2.0",
  "id": "<matching-request-id>",
  "result": {
    "<key1>": "<value1>",
    "<key2>": "<value2>"
  }
}
```

### Response (Error)

```json
{
  "jsonrpc": "2.0",
  "id": "<matching-request-id>",
  "error": {
    "code": -32000,
    "message": "Human-readable error message",
    "data": {
      "details": "Additional context",
      "suggestion": "How to fix"
    }
  }
}
```

### Notification (No Response Expected)

```json
{
  "jsonrpc": "2.0",
  "method": "<method-name>",
  "params": {
    "<param1>": "<value1>"
  }
}
```

---

## Methods Reference

### Viewport Capture Methods

#### `capture_viewport`

Captures a screenshot of the editor viewport.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "capture_viewport",
  "params": {
    "viewport_type": "3d",
    "max_width": 2048,
    "max_height": 2048,
    "format": "png"
  }
}
```

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `viewport_type` | string | No | "3d" | "2d", "3d", or "both" |
| `max_width` | int | No | 2048 | Maximum image width |
| `max_height` | int | No | 2048 | Maximum image height |
| `format` | string | No | "png" | "png" or "jpg" |

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "success": true,
    "viewport_type": "3d",
    "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "width": 1920,
    "height": 1080,
    "timestamp": 1704067200.123
  }
}
```

**Response (viewport_type = "both"):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "success": true,
    "viewport_type": "both",
    "images": {
      "2d": {
        "image": "data:image/png;base64,...",
        "width": 1920,
        "height": 1080
      },
      "3d": {
        "image": "data:image/png;base64,...",
        "width": 1920,
        "height": 1080
      }
    },
    "timestamp": 1704067200.123
  }
}
```

---

#### `capture_game`

Captures a screenshot of the running game.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "capture_game",
  "params": {
    "max_width": 1920,
    "max_height": 1080,
    "format": "png"
  }
}
```

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `max_width` | int | No | 1920 | Maximum image width |
| `max_height` | int | No | 1080 | Maximum image height |
| `format` | string | No | "png" | "png" or "jpg" |

**Response (Success):**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "success": true,
    "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "width": 1920,
    "height": 1080,
    "scene_path": "res://scenes/main.tscn",
    "timestamp": 1704067200.456
  }
}
```

**Response (Game Not Running):**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "error": {
    "code": -32003,
    "message": "Game not running",
    "data": {
      "suggestion": "Use execute_action with action='run_scene' to start the game"
    }
  }
}
```

---

### Documentation Methods

#### `get_class_docs`

Fetches complete documentation for a Godot class.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "get_class_docs",
  "params": {
    "class_name": "CharacterBody3D",
    "include_inherited": false
  }
}
```

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `class_name` | string | Yes | - | Godot class name |
| `include_inherited` | bool | No | false | Include parent class members |

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "success": true,
    "class_name": "CharacterBody3D",
    "inherits": "PhysicsBody3D",
    "brief_description": "A 3D physics body specialized for characters moved by script.",
    "description": "CharacterBody3D is a specialized class for physics bodies that are meant to be user-controlled. They are not affected by physics at all...",
    "methods": [
      {
        "name": "move_and_slide",
        "return_type": "bool",
        "description": "Moves the body based on velocity. If the body collides with another, it will slide along the other body...",
        "arguments": []
      },
      {
        "name": "get_floor_normal",
        "return_type": "Vector3",
        "description": "Returns the floor's collision normal if on floor.",
        "arguments": []
      },
      {
        "name": "is_on_floor",
        "return_type": "bool",
        "description": "Returns true if the body is on the floor.",
        "arguments": []
      }
    ],
    "properties": [
      {
        "name": "velocity",
        "type": "Vector3",
        "description": "Current velocity vector in units per second.",
        "default": "Vector3(0, 0, 0)",
        "setter": "set_velocity",
        "getter": "get_velocity"
      },
      {
        "name": "floor_max_angle",
        "type": "float",
        "description": "Maximum angle (in radians) where a slope is still considered a floor.",
        "default": "0.785398"
      },
      {
        "name": "up_direction",
        "type": "Vector3",
        "description": "Vector pointing upwards, used to determine floor direction.",
        "default": "Vector3(0, 1, 0)"
      }
    ],
    "signals": [
      {
        "name": "floor_stop_on_slope",
        "description": "Emitted when stop on slope is triggered.",
        "arguments": []
      }
    ],
    "enums": [],
    "constants": []
  }
}
```

---

#### `get_method_docs`

Fetches documentation for a specific method.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "get_method_docs",
  "params": {
    "class_name": "Node",
    "method_name": "add_child"
  }
}
```

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `class_name` | string | Yes | - | Godot class name |
| `method_name` | string | Yes | - | Method name |

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "success": true,
    "class_name": "Node",
    "method": {
      "name": "add_child",
      "return_type": "void",
      "description": "Adds a child node. Nodes can have any number of children, but every child must have a unique name...",
      "arguments": [
        {
          "name": "node",
          "type": "Node",
          "default": null,
          "description": "The node to add as a child."
        },
        {
          "name": "force_readable_name",
          "type": "bool",
          "default": "false",
          "description": "If true, improves the readability of the added node."
        },
        {
          "name": "internal",
          "type": "int",
          "default": "0",
          "description": "Internal mode for the added child."
        }
      ]
    }
  }
}
```

---

#### `search_docs`

Searches across all documentation.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "search_docs",
  "params": {
    "query": "collision layer",
    "search_in": ["classes", "methods", "properties"],
    "limit": 10
  }
}
```

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `query` | string | Yes | - | Search query |
| `search_in` | array | No | all | ["classes", "methods", "properties", "signals"] |
| `limit` | int | No | 20 | Maximum results |

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "success": true,
    "query": "collision layer",
    "results": [
      {
        "type": "property",
        "class_name": "CollisionObject3D",
        "name": "collision_layer",
        "description": "The physics layers this CollisionObject3D is in.",
        "relevance": 0.95
      },
      {
        "type": "property",
        "class_name": "CollisionObject3D",
        "name": "collision_mask",
        "description": "The physics layers this CollisionObject3D scans.",
        "relevance": 0.85
      },
      {
        "type": "method",
        "class_name": "CollisionObject3D",
        "name": "set_collision_layer_value",
        "description": "Sets individual bits on the collision layer.",
        "relevance": 0.80
      }
    ],
    "total_count": 3
  }
}
```

---

### Scene Inspection Methods

#### `get_scene_tree`

Gets the current scene's node hierarchy.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "get_scene_tree",
  "params": {
    "root_path": "/root",
    "max_depth": 10,
    "include_properties": false
  }
}
```

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `root_path` | string | No | "/root" | Starting node path |
| `max_depth` | int | No | -1 | Max depth (-1 = unlimited) |
| `include_properties` | bool | No | false | Include node properties |

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "result": {
    "success": true,
    "scene_path": "res://scenes/main.tscn",
    "tree": {
      "name": "Main",
      "type": "Node3D",
      "path": "/root/Main",
      "children": [
        {
          "name": "Player",
          "type": "CharacterBody3D",
          "path": "/root/Main/Player",
          "script": "res://scripts/player.gd",
          "children": [
            {
              "name": "CollisionShape3D",
              "type": "CollisionShape3D",
              "path": "/root/Main/Player/CollisionShape3D",
              "children": []
            },
            {
              "name": "MeshInstance3D",
              "type": "MeshInstance3D",
              "path": "/root/Main/Player/MeshInstance3D",
              "children": []
            },
            {
              "name": "Camera3D",
              "type": "Camera3D",
              "path": "/root/Main/Player/Camera3D",
              "children": []
            }
          ]
        },
        {
          "name": "World",
          "type": "Node3D",
          "path": "/root/Main/World",
          "children": [
            {
              "name": "Ground",
              "type": "StaticBody3D",
              "path": "/root/Main/World/Ground",
              "children": []
            }
          ]
        }
      ]
    }
  }
}
```

---

#### `get_node_properties`

Gets all properties of a specific node.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "get_node_properties",
  "params": {
    "node_path": "/root/Main/Player",
    "include_default": false,
    "categories": ["physics", "collision"]
  }
}
```

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `node_path` | string | Yes | - | Path to the node |
| `include_default` | bool | No | false | Include properties with default values |
| `categories` | array | No | all | Filter by property category |

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {
    "success": true,
    "node_path": "/root/Main/Player",
    "node_type": "CharacterBody3D",
    "script": "res://scripts/player.gd",
    "properties": {
      "transform": {
        "type": "Transform3D",
        "value": "Transform3D(1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0)",
        "category": "Node3D"
      },
      "velocity": {
        "type": "Vector3",
        "value": "Vector3(0, 0, 0)",
        "category": "CharacterBody3D"
      },
      "floor_max_angle": {
        "type": "float",
        "value": 0.785398,
        "category": "CharacterBody3D"
      },
      "collision_layer": {
        "type": "int",
        "value": 1,
        "category": "CollisionObject3D"
      },
      "collision_mask": {
        "type": "int",
        "value": 1,
        "category": "CollisionObject3D"
      }
    },
    "script_properties": {
      "speed": {
        "type": "float",
        "value": 5.0,
        "exported": true
      },
      "jump_force": {
        "type": "float",
        "value": 4.5,
        "exported": true
      }
    }
  }
}
```

---

#### `get_selected_nodes`

Gets currently selected nodes in the editor.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "method": "get_selected_nodes",
  "params": {
    "include_properties": true
  }
}
```

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `include_properties` | bool | No | false | Include node properties |

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "result": {
    "success": true,
    "selection_count": 2,
    "nodes": [
      {
        "name": "Player",
        "type": "CharacterBody3D",
        "path": "/root/Main/Player",
        "script": "res://scripts/player.gd"
      },
      {
        "name": "Enemy",
        "type": "CharacterBody3D",
        "path": "/root/Main/Enemy",
        "script": "res://scripts/enemy.gd"
      }
    ]
  }
}
```

---

### Action Execution Methods

#### `execute_action`

Executes an action in the Godot editor.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 9,
  "method": "execute_action",
  "params": {
    "action": "run_scene",
    "args": {}
  }
}
```

**Available Actions:**

| Action | Arguments | Description |
|--------|-----------|-------------|
| `run_scene` | `scene_path?` | Run current or specified scene |
| `run_main_scene` | - | Run the project's main scene |
| `stop_scene` | - | Stop the running game |
| `pause_scene` | - | Pause the running game |
| `resume_scene` | - | Resume the paused game |
| `select_node` | `node_path` | Select a node in the scene tree |
| `select_nodes` | `node_paths[]` | Select multiple nodes |
| `focus_node` | `node_path` | Focus camera on a node |
| `set_property` | `node_path`, `property`, `value` | Set a node's property |
| `create_node` | `parent_path`, `node_type`, `name?` | Create a new node |
| `delete_node` | `node_path` | Delete a node (requires opt-in) |
| `save_scene` | - | Save the current scene |
| `reload_scene` | - | Reload the current scene |

**Example - Run Scene:**
```json
{
  "jsonrpc": "2.0",
  "id": 9,
  "method": "execute_action",
  "params": {
    "action": "run_scene",
    "args": {
      "scene_path": "res://scenes/level1.tscn"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 9,
  "result": {
    "success": true,
    "action": "run_scene",
    "scene_path": "res://scenes/level1.tscn",
    "message": "Scene started successfully"
  }
}
```

**Example - Set Property:**
```json
{
  "jsonrpc": "2.0",
  "id": 10,
  "method": "execute_action",
  "params": {
    "action": "set_property",
    "args": {
      "node_path": "/root/Main/Player",
      "property": "velocity",
      "value": "Vector3(0, 0, 0)"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 10,
  "result": {
    "success": true,
    "action": "set_property",
    "node_path": "/root/Main/Player",
    "property": "velocity",
    "old_value": "Vector3(5.2, -9.8, 0)",
    "new_value": "Vector3(0, 0, 0)"
  }
}
```

**Example - Create Node:**
```json
{
  "jsonrpc": "2.0",
  "id": 11,
  "method": "execute_action",
  "params": {
    "action": "create_node",
    "args": {
      "parent_path": "/root/Main/Player",
      "node_type": "Sprite3D",
      "name": "HealthBar"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 11,
  "result": {
    "success": true,
    "action": "create_node",
    "node_path": "/root/Main/Player/HealthBar",
    "node_type": "Sprite3D"
  }
}
```

---

### Debug Methods

#### `get_errors`

Gets recent errors and warnings from the debugger.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "get_errors",
  "params": {
    "count": 10,
    "severity": "all",
    "since_timestamp": null
  }
}
```

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `count` | int | No | 20 | Maximum errors to return |
| `severity` | string | No | "all" | "error", "warning", or "all" |
| `since_timestamp` | float | No | null | Only errors after this time |

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "result": {
    "success": true,
    "errors": [
      {
        "severity": "error",
        "message": "Invalid get index 'position' (on base: 'null instance').",
        "source": {
          "script": "res://scripts/player.gd",
          "function": "_physics_process",
          "line": 42
        },
        "stack_trace": [
          "res://scripts/player.gd:42 in _physics_process()",
          "res://scripts/player.gd:15 in _ready()"
        ],
        "timestamp": 1704067200.789
      },
      {
        "severity": "warning",
        "message": "The parameter 'delta' is never used in the function '_process'.",
        "source": {
          "script": "res://scripts/enemy.gd",
          "function": "_process",
          "line": 10
        },
        "timestamp": 1704067180.123
      }
    ],
    "total_count": 2
  }
}
```

---

#### `get_editor_log`

Gets recent editor log messages.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 13,
  "method": "get_editor_log",
  "params": {
    "count": 50,
    "filter": null
  }
}
```

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `count` | int | No | 100 | Maximum log lines |
| `filter` | string | No | null | Regex filter pattern |

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 13,
  "result": {
    "success": true,
    "logs": [
      {
        "type": "info",
        "message": "Scene 'res://scenes/main.tscn' loaded successfully.",
        "timestamp": 1704067200.100
      },
      {
        "type": "warning",
        "message": "Resource 'res://textures/old.png' is deprecated.",
        "timestamp": 1704067200.200
      }
    ],
    "total_count": 2
  }
}
```

---

### System Methods

#### `get_editor_info`

Gets information about the Godot editor.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 14,
  "method": "get_editor_info",
  "params": {}
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 14,
  "result": {
    "success": true,
    "godot_version": {
      "major": 4,
      "minor": 3,
      "patch": 0,
      "status": "stable",
      "string": "4.3.0.stable"
    },
    "plugin_version": "1.0.0",
    "project": {
      "name": "My Game",
      "path": "/Users/dev/projects/my_game",
      "main_scene": "res://scenes/main.tscn"
    },
    "editor_state": {
      "current_scene": "res://scenes/level1.tscn",
      "is_game_running": false,
      "selected_nodes": ["/root/Level1/Player"]
    }
  }
}
```

---

#### `ping`

Health check.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 15,
  "method": "ping",
  "params": {}
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 15,
  "result": {
    "pong": true,
    "timestamp": 1704067200.000
  }
}
```

---

## Events (Server Push)

Events are notifications sent from Godot to the MCP Server without a request.

### `godoty.error_occurred`

Sent when an error occurs in the running game.

```json
{
  "jsonrpc": "2.0",
  "method": "godoty.error_occurred",
  "params": {
    "severity": "error",
    "message": "Null instance access",
    "source": {
      "script": "res://scripts/player.gd",
      "line": 42
    },
    "timestamp": 1704067200.789
  }
}
```

### `godoty.scene_changed`

Sent when the edited scene changes.

```json
{
  "jsonrpc": "2.0",
  "method": "godoty.scene_changed",
  "params": {
    "previous_scene": "res://scenes/main.tscn",
    "current_scene": "res://scenes/level2.tscn",
    "timestamp": 1704067200.100
  }
}
```

### `godoty.game_started`

Sent when the game starts running.

```json
{
  "jsonrpc": "2.0",
  "method": "godoty.game_started",
  "params": {
    "scene_path": "res://scenes/main.tscn",
    "timestamp": 1704067200.200
  }
}
```

### `godoty.game_stopped`

Sent when the game stops.

```json
{
  "jsonrpc": "2.0",
  "method": "godoty.game_stopped",
  "params": {
    "reason": "user_stopped",
    "exit_code": 0,
    "timestamp": 1704067200.300
  }
}
```

### `godoty.selection_changed`

Sent when the node selection changes.

```json
{
  "jsonrpc": "2.0",
  "method": "godoty.selection_changed",
  "params": {
    "selected_nodes": [
      "/root/Main/Player",
      "/root/Main/Enemy"
    ],
    "timestamp": 1704067200.400
  }
}
```

---

## Error Handling

### Error Codes

| Code | Name | Description |
|------|------|-------------|
| -32700 | Parse Error | Invalid JSON |
| -32600 | Invalid Request | Missing required fields |
| -32601 | Method Not Found | Unknown method |
| -32602 | Invalid Params | Invalid method parameters |
| -32603 | Internal Error | Godot internal error |
| -32000 | Node Not Found | Specified node doesn't exist |
| -32001 | Class Not Found | Specified class doesn't exist |
| -32002 | Action Not Allowed | Action is disabled or restricted |
| -32003 | Game Not Running | Operation requires running game |
| -32004 | Capture Failed | Screenshot capture failed |
| -32005 | Timeout | Operation timed out |
| -32006 | Invalid Path | Invalid file or node path |

### Error Response Examples

**Node Not Found:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32000,
    "message": "Node not found: /root/Main/NonExistent",
    "data": {
      "requested_path": "/root/Main/NonExistent",
      "similar_paths": [
        "/root/Main/Player",
        "/root/Main/Enemy"
      ],
      "suggestion": "Check if the node exists in the current scene"
    }
  }
}
```

**Action Not Allowed:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32002,
    "message": "Action 'delete_node' is not enabled",
    "data": {
      "action": "delete_node",
      "reason": "Dangerous actions require explicit opt-in",
      "how_to_enable": "Enable 'godoty.allow_dangerous_actions' in plugin settings"
    }
  }
}
```

---

## Examples

### Complete Session Example

```
# 1. Connection established
<─ {"jsonrpc":"2.0","method":"godoty.connected","params":{"godot_version":"4.3.0",...}}

# 2. Client acknowledges
─> {"jsonrpc":"2.0","method":"godoty.ready","params":{"client_name":"godoty-mcp"}}

# 3. Get editor info
─> {"jsonrpc":"2.0","id":1,"method":"get_editor_info","params":{}}
<─ {"jsonrpc":"2.0","id":1,"result":{"godot_version":{...},...}}

# 4. Capture viewport
─> {"jsonrpc":"2.0","id":2,"method":"capture_viewport","params":{"viewport_type":"3d"}}
<─ {"jsonrpc":"2.0","id":2,"result":{"image":"data:image/png;base64,...",...}}

# 5. Get documentation
─> {"jsonrpc":"2.0","id":3,"method":"get_class_docs","params":{"class_name":"CharacterBody3D"}}
<─ {"jsonrpc":"2.0","id":3,"result":{"class_name":"CharacterBody3D","methods":[...],...}}

# 6. Get scene tree
─> {"jsonrpc":"2.0","id":4,"method":"get_scene_tree","params":{}}
<─ {"jsonrpc":"2.0","id":4,"result":{"tree":{"name":"Main","children":[...]},...}}

# 7. Run the scene
─> {"jsonrpc":"2.0","id":5,"method":"execute_action","params":{"action":"run_scene"}}
<─ {"jsonrpc":"2.0","id":5,"result":{"success":true,...}}

# 8. Event: Game started
<─ {"jsonrpc":"2.0","method":"godoty.game_started","params":{"scene_path":"res://scenes/main.tscn"}}

# 9. Capture game screenshot
─> {"jsonrpc":"2.0","id":6,"method":"capture_game","params":{}}
<─ {"jsonrpc":"2.0","id":6,"result":{"image":"data:image/png;base64,...",...}}

# 10. Event: Error occurred
<─ {"jsonrpc":"2.0","method":"godoty.error_occurred","params":{"message":"Null instance",...}}

# 11. Get errors
─> {"jsonrpc":"2.0","id":7,"method":"get_errors","params":{"count":5}}
<─ {"jsonrpc":"2.0","id":7,"result":{"errors":[...],...}}

# 12. Stop the game
─> {"jsonrpc":"2.0","id":8,"method":"execute_action","params":{"action":"stop_scene"}}
<─ {"jsonrpc":"2.0","id":8,"result":{"success":true,...}}

# 13. Event: Game stopped
<─ {"jsonrpc":"2.0","method":"godoty.game_stopped","params":{"reason":"user_stopped"}}
```

---

## Protocol Versioning

### Version Header

Future versions may include a protocol version in the handshake:

```json
{
  "jsonrpc": "2.0",
  "method": "godoty.connected",
  "params": {
    "protocol_version": "1.0.0",
    "min_supported_version": "1.0.0",
    ...
  }
}
```

### Backward Compatibility

- New methods are added without breaking old clients
- Deprecated methods remain functional for 2 major versions
- Parameter additions are always optional with defaults
