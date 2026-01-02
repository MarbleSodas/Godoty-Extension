# Godoty Implementation Guide

> Step-by-step instructions for building and deploying Godoty

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Phase 1: Project Setup](#phase-1-project-setup)
3. [Phase 2: Godot Plugin Development](#phase-2-godot-plugin-development)
4. [Phase 3: MCP Server Development](#phase-3-mcp-server-development)
5. [Phase 4: VS Code Extension](#phase-4-vs-code-extension)
6. [Phase 5: Backend Integration](#phase-5-backend-integration)
7. [Phase 6: Testing](#phase-6-testing)
8. [Phase 7: Deployment](#phase-7-deployment)
9. [Development Workflow](#development-workflow)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18+ | Extension and MCP server |
| pnpm | 8+ | Package management |
| Godot Engine | 4.3+ | Plugin development and testing |
| VS Code | 1.85+ | Extension development |
| Git | 2.x | Version control |

### Required Accounts

| Service | Purpose | URL |
|---------|---------|-----|
| GitHub | Source control, CI/CD | https://github.com |
| Supabase | Authentication, database | https://kbnaymejrngxhpigwphh.supabase.co |
| Railway | LiteLLM hosting | https://litellm-production-150c.up.railway.app |

### Environment Setup

```bash
# Install Node.js (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Install pnpm
npm install -g pnpm

# Verify installations
node --version  # Should be 18+
pnpm --version  # Should be 8+
```

---

## Phase 1: Project Setup

### Step 1.1: Fork Kilo Code

```bash
# Clone Kilo Code as starting point
git clone https://github.com/Kilo-Org/kilocode.git godoty
cd godoty

# Remove original git history and reinitialize
rm -rf .git
git init
git add .
git commit -m "Initial commit: Fork of Kilo Code"

# Add remote for your repository
git remote add origin https://github.com/your-org/godoty.git
git push -u origin main
```

### Step 1.2: Restructure for Godoty

```bash
# Create new directory structure
mkdir -p packages/godoty-mcp/src/tools
mkdir -p packages/godoty-llm/src
mkdir -p packages/godoty-auth/src
mkdir -p packages/godoty-protocol/src
mkdir -p godot-plugin/addons/godoty_bridge/lib
mkdir -p godot-plugin/addons/godoty_bridge/ui
mkdir -p docs
mkdir -p examples
```

### Step 1.3: Update package.json

```json
{
  "name": "godoty",
  "version": "1.0.0",
  "private": true,
  "description": "AI-powered Godot development assistant",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "test": "turbo test",
    "lint": "turbo lint",
    "clean": "turbo clean && rm -rf node_modules",
    "package": "turbo package"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.3.0"
  },
  "packageManager": "pnpm@8.15.0"
}
```

### Step 1.4: Configure pnpm workspace

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Step 1.5: Configure Turborepo

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {},
    "clean": {
      "cache": false
    }
  }
}
```

### Step 1.6: Create environment files

```bash
# Create .env.example
cat > .env.example << 'EOF'
# Backend Services
VITE_LITELLM_URL=https://litellm-production-150c.up.railway.app
VITE_SUPABASE_URL=https://kbnaymejrngxhpigwphh.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_crqwAKS-G2fVqkyOTr95lQ_SQu-vaj3

# Development
GODOT_WS_PORT=6550
LOG_LEVEL=debug
EOF

# Create actual .env from example
cp .env.example .env
```

### Step 1.7: Install dependencies

```bash
pnpm install
```

---

## Phase 2: Godot Plugin Development

### Step 2.1: Create plugin.cfg

```bash
cat > godot-plugin/addons/godoty_bridge/plugin.cfg << 'EOF'
[plugin]

name="Godoty Bridge"
description="Bridge plugin for Godoty VS Code extension"
author="Godoty"
version="1.0.0"
script="godoty_bridge.gd"
EOF
```

### Step 2.2: Create main plugin script

Create `godot-plugin/addons/godoty_bridge/godoty_bridge.gd` with the code from [GODOT_PLUGIN.md](GODOT_PLUGIN.md).

### Step 2.3: Create library modules

Create each file in `godot-plugin/addons/godoty_bridge/lib/`:

1. `websocket_server.gd` - WebSocket server implementation
2. `protocol.gd` - JSON-RPC message handling
3. `viewport_capture.gd` - Screenshot capture
4. `doc_extractor.gd` - Documentation extraction
5. `scene_inspector.gd` - Scene tree inspection
6. `action_executor.gd` - Action execution
7. `debug_capture.gd` - Game debug capture
8. `event_emitter.gd` - Event notifications

See [GODOT_PLUGIN.md](GODOT_PLUGIN.md) for complete implementations.

### Step 2.4: Create status panel UI

```bash
# Create status panel scene
cat > godot-plugin/addons/godoty_bridge/ui/status_panel.tscn << 'EOF'
[gd_scene load_steps=2 format=3 uid="uid://godoty_status"]

[ext_resource type="Script" path="res://addons/godoty_bridge/ui/status_panel.gd" id="1"]

[node name="GodotyStatus" type="VBoxContainer"]
script = ExtResource("1")

[node name="Title" type="Label" parent="."]
text = "Godoty Bridge"
horizontal_alignment = 1

[node name="Separator" type="HSeparator" parent="."]

[node name="StatusLabel" type="Label" parent="."]
text = "Status: Disconnected"

[node name="PortLabel" type="Label" parent="."]
text = "Port: 6550"

[node name="ClientsLabel" type="Label" parent="."]
text = "Clients: 0"

[node name="Separator2" type="HSeparator" parent="."]

[node name="ButtonContainer" type="HBoxContainer" parent="."]

[node name="StartButton" type="Button" parent="ButtonContainer"]
text = "Start"

[node name="StopButton" type="Button" parent="ButtonContainer"]
text = "Stop"
disabled = true
EOF
```

### Step 2.5: Create status panel script

```gdscript
# godot-plugin/addons/godoty_bridge/ui/status_panel.gd
@tool
extends VBoxContainer

signal server_start_requested
signal server_stop_requested

@onready var status_label: Label = $StatusLabel
@onready var port_label: Label = $PortLabel
@onready var clients_label: Label = $ClientsLabel
@onready var start_button: Button = $ButtonContainer/StartButton
@onready var stop_button: Button = $ButtonContainer/StopButton


func _ready() -> void:
	start_button.pressed.connect(_on_start_pressed)
	stop_button.pressed.connect(_on_stop_pressed)


func update_status(status: Dictionary) -> void:
	var is_running: bool = status.get("is_running", false)
	var port: int = status.get("port", 6550)
	var client_count: int = status.get("client_count", 0)
	
	status_label.text = "Status: %s" % ("Running" if is_running else "Stopped")
	port_label.text = "Port: %d" % port
	clients_label.text = "Clients: %d" % client_count
	
	start_button.disabled = is_running
	stop_button.disabled = not is_running


func _on_start_pressed() -> void:
	server_start_requested.emit()


func _on_stop_pressed() -> void:
	server_stop_requested.emit()
```

### Step 2.6: Test the plugin

1. Open Godot 4.3+
2. Create a new project in `godot-plugin/`
3. Go to Project → Project Settings → Plugins
4. Enable "Godoty Bridge"
5. Check that the status panel appears in the dock
6. Verify the WebSocket server starts (check Output panel)

---

## Phase 3: MCP Server Development

### Step 3.1: Initialize MCP package

```bash
cd packages/godoty-mcp

# Create package.json
cat > package.json << 'EOF'
{
  "name": "@godoty/mcp",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "godoty-mcp": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "test": "vitest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "ws": "^8.16.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/ws": "^8.5.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
EOF

# Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF
```

### Step 3.2: Create MCP server files

Create the files as specified in [MCP_SERVER.md](MCP_SERVER.md):

- `src/index.ts`
- `src/server.ts`
- `src/godot-client.ts`
- `src/tools/index.ts`
- `src/tools/capture.ts`
- `src/tools/docs.ts`
- `src/tools/scene.ts`
- `src/tools/actions.ts`

### Step 3.3: Build and test

```bash
cd packages/godoty-mcp
pnpm install
pnpm build

# Test connection (requires Godot plugin running)
pnpm start
```

---

## Phase 4: VS Code Extension

### Step 4.1: Modify Kilo Code for Godoty

```bash
cd apps/vscode-extension  # or wherever the main extension code is
```

### Step 4.2: Add Godoty dependencies

Add to the extension's `package.json`:

```json
{
  "dependencies": {
    "@godoty/mcp": "workspace:*",
    "@godoty/auth": "workspace:*",
    "@godoty/llm": "workspace:*",
    "@supabase/supabase-js": "^2.39.0"
  }
}
```

### Step 4.3: Create auth package

```bash
cd packages/godoty-auth

cat > package.json << 'EOF'
{
  "name": "@godoty/auth",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "tsx": "^4.7.0"
  }
}
EOF
```

Create the auth client as specified in [BACKEND_SERVICES.md](BACKEND_SERVICES.md).

### Step 4.4: Create LLM package

```bash
cd packages/godoty-llm

cat > package.json << 'EOF'
{
  "name": "@godoty/llm",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "tsx": "^4.7.0"
  }
}
EOF
```

Create the LiteLLM client as specified in [BACKEND_SERVICES.md](BACKEND_SERVICES.md).

### Step 4.5: Add Godot mode

Create `apps/vscode-extension/src/godot/modes/godot-mode.ts`:

```typescript
export const godotMode = {
  id: 'godot',
  name: 'Godot Developer',
  icon: '🎮',
  description: 'AI assistant for Godot game development',
  systemPrompt: `You are an expert Godot game developer assistant.

CAPABILITIES:
- You can capture screenshots from the Godot editor viewport using godot_capture_viewport
- You can capture screenshots from running games using godot_capture_game
- You can fetch accurate documentation for any Godot class/method using godot_get_docs
- You can inspect the current scene tree and node properties using godot_get_scene
- You can execute actions in the editor using godot_run_action
- You can check for errors using godot_get_errors

GUIDELINES:
- Always use godot_get_docs to verify API before generating code
- When debugging visual issues, capture viewport screenshots first
- Use GDScript best practices for Godot 4.x
- Reference signals, properties, and methods accurately
- When asked about something visual, capture the viewport first

WORKFLOW FOR DEBUGGING:
1. godot_get_errors - Check for runtime errors
2. godot_capture_game or godot_capture_viewport - See the visual state
3. godot_get_scene - Understand the scene structure
4. godot_get_docs - Verify correct API usage
5. Provide solution with accurate code

WORKFLOW FOR FEATURES:
1. godot_get_scene - Understand existing structure
2. godot_get_docs - Fetch relevant class documentation
3. Generate code using correct API
4. Explain the implementation`,
  tools: [
    'godot_capture_viewport',
    'godot_capture_game', 
    'godot_get_docs',
    'godot_get_scene',
    'godot_get_selected',
    'godot_run_action',
    'godot_get_errors'
  ],
  mcpServers: ['godoty']
};
```

### Step 4.6: Update extension manifest

Add to `package.json`:

```json
{
  "contributes": {
    "configuration": {
      "title": "Godoty",
      "properties": {
        "godoty.connection.port": {
          "type": "number",
          "default": 6550,
          "description": "Godot WebSocket server port"
        },
        "godoty.connection.autoConnect": {
          "type": "boolean",
          "default": true,
          "description": "Automatically connect to Godot"
        },
        "godoty.backend.litellmUrl": {
          "type": "string",
          "default": "https://litellm-production-150c.up.railway.app",
          "description": "LiteLLM proxy server URL"
        }
      }
    }
  }
}
```

---

## Phase 5: Backend Integration

### Step 5.1: Configure Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Open your project: `kbnaymejrngxhpigwphh`
3. Navigate to SQL Editor
4. Run the schema from [BACKEND_SERVICES.md](BACKEND_SERVICES.md#database-schema)

### Step 5.2: Configure LiteLLM

Your LiteLLM proxy at `https://litellm-production-150c.up.railway.app` should have:

1. Model configuration for supported providers
2. Virtual key generation enabled
3. Usage tracking enabled

### Step 5.3: Integrate auth in extension

```typescript
// apps/vscode-extension/src/extension.ts

import * as vscode from 'vscode';
import { GodotyAuthProvider } from '@godoty/auth';
import { LiteLLMClient } from '@godoty/llm';

export async function activate(context: vscode.ExtensionContext) {
  // Register auth provider
  const authProvider = new GodotyAuthProvider(context);
  context.subscriptions.push(
    vscode.authentication.registerAuthenticationProvider(
      GodotyAuthProvider.id,
      GodotyAuthProvider.label,
      authProvider
    )
  );

  // Get auth session
  const session = await vscode.authentication.getSession(
    GodotyAuthProvider.id,
    ['godoty'],
    { createIfNone: false }
  );

  if (session) {
    // Initialize LLM client with user's API key
    const apiKey = await authProvider.getLiteLLMApiKey();
    const llmClient = new LiteLLMClient({
      baseUrl: vscode.workspace.getConfiguration('godoty').get('backend.litellmUrl'),
      apiKey
    });
    
    // ... rest of initialization
  }
}
```

---

## Phase 6: Testing

### Step 6.1: Unit tests

```bash
# Run all unit tests
pnpm test

# Run specific package tests
cd packages/godoty-mcp
pnpm test
```

### Step 6.2: Integration tests

Create `tests/integration/godot-connection.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GodotClient } from '@godoty/mcp';

describe('Godot Connection', () => {
  let client: GodotClient;

  beforeAll(async () => {
    client = new GodotClient({
      url: 'ws://127.0.0.1:6550',
      reconnect: false,
      reconnectInterval: 1000
    });
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  it('should connect to Godot', () => {
    expect(client.isConnected()).toBe(true);
  });

  it('should ping Godot', async () => {
    const result = await client.call('ping', {});
    expect(result.pong).toBe(true);
  });

  it('should get editor info', async () => {
    const result = await client.call('get_editor_info', {});
    expect(result.godot_version).toBeDefined();
    expect(result.godot_version.major).toBeGreaterThanOrEqual(4);
  });
});
```

### Step 6.3: E2E tests

```bash
# Requires Godot running with plugin
pnpm test:e2e
```

---

## Phase 7: Deployment

### Step 7.1: Build extension

```bash
# Build all packages
pnpm build

# Package extension
cd apps/vscode-extension
pnpm package
# Creates godoty-1.0.0.vsix
```

### Step 7.2: Publish to VS Code Marketplace

```bash
# Login to vsce
npx vsce login godoty

# Publish
npx vsce publish
```

### Step 7.3: Package Godot plugin

```bash
# Create zip for Godot Asset Library
cd godot-plugin
zip -r ../godoty-bridge-1.0.0.zip addons/godoty_bridge/
```

### Step 7.4: Create GitHub release

```bash
# Tag release
git tag v1.0.0
git push origin v1.0.0

# Create release on GitHub with:
# - godoty-1.0.0.vsix
# - godoty-bridge-1.0.0.zip
```

---

## Development Workflow

### Daily Development

```bash
# Start development mode (watches all packages)
pnpm dev

# In another terminal, open VS Code with extension
code --extensionDevelopmentPath=./apps/vscode-extension

# Open Godot with test project
godot godot-plugin/project.godot
```

### Before Committing

```bash
# Run linter
pnpm lint

# Run tests
pnpm test

# Build to check for errors
pnpm build
```

### Release Process

1. Update version numbers in all `package.json` files
2. Update CHANGELOG.md
3. Run full test suite
4. Create release PR
5. Merge to main
6. Tag release
7. Publish to marketplaces

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| pnpm install fails | Delete `node_modules` and `pnpm-lock.yaml`, retry |
| Godot plugin not showing | Check plugin.cfg syntax, ensure @tool annotation |
| WebSocket connection fails | Check port 6550 is free, try restarting Godot |
| Auth not working | Verify Supabase credentials in .env |
| LLM errors | Check LiteLLM proxy is running, verify API key |

### Debug Logging

```bash
# Enable verbose logging
export LOG_LEVEL=debug
pnpm dev
```

### Getting Help

1. Check existing GitHub issues
2. Join the Discord community
3. Review the documentation
4. Create a new issue with reproduction steps
