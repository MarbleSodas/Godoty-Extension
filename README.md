# Godoty

> AI-Powered Game Development Assistant for Godot Engine

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Godot](https://img.shields.io/badge/Godot-4.3+-blue.svg)](https://godotengine.org)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.85+-purple.svg)](https://code.visualstudio.com)

**Godoty** is a fork of [Kilo Code](https://github.com/Kilo-Org/kilocode) enhanced with deep Godot Engine integration. It provides AI-assisted game development through visual context awareness, real-time documentation access, and bidirectional editor control.

---

## Key Features

- **Visual Context Capture**: Screenshot 2D/3D viewports and running game
- **Live Documentation**: Fetch accurate docs from your running Godot editor (no version mismatch)
- **Scene Inspection**: Query scene tree, node properties, and selections
- **Bidirectional Control**: Run scenes, select nodes, modify properties from VS Code
- **Debug Integration**: Capture errors, warnings, and game state in real-time
- **Godot-Optimized AI**: Custom mode with Godot-specific prompts and workflows
- **Multi-Model Support**: Access 100+ LLM models via LiteLLM proxy (GPT-4, Claude, Gemini, etc.)
- **Account Management**: User authentication and usage tracking via Supabase

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CLOUD SERVICES                                   │
│  ┌────────────────────────────────┐  ┌────────────────────────────────────┐  │
│  │         LITELLM PROXY          │  │            SUPABASE                │  │
│  │  litellm-production-150c.up.   │  │  kbnaymejrngxhpigwphh.supabase.co │  │
│  │  railway.app                   │  │                                    │  │
│  │                                │  │  • Authentication                  │  │
│  │  • 100+ LLM Models             │  │  • User Profiles                   │  │
│  │  • Usage Tracking              │  │  • Usage Records                   │  │
│  │  • Rate Limiting               │  │  • API Key Storage                 │  │
│  └────────────────────────────────┘  └────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                          │                              │
                          │ HTTPS                        │ HTTPS
                          ▼                              ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          VS CODE / CURSOR                                     │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                         GODOTY EXTENSION                                │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │  │
│  │  │ Kilo Code    │  │ Auth Service │  │ LLM Service  │  │ Godot MCP  │  │  │
│  │  │ Core         │◄─┤ (Supabase)   │◄─┤ (LiteLLM)    │◄─┤ Server     │  │  │
│  │  │ (Forked)     │  │              │  │              │  │            │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                         │                                     │
│                                         │ WebSocket (localhost:6550)          │
└─────────────────────────────────────────┼─────────────────────────────────────┘
                                          │
┌─────────────────────────────────────────┼─────────────────────────────────────┐
│                               GODOT EDITOR                                     │
│  ┌──────────────────────────────────────┴──────────────────────────────────┐  │
│  │                    GODOTY BRIDGE PLUGIN (GDScript)                       │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐            │  │
│  │  │ Viewport   │ │ ClassDB    │ │ Scene      │ │ Action     │            │  │
│  │  │ Capture    │ │ Doc Extract│ │ Inspector  │ │ Executor   │            │  │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘            │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐                           │  │
│  │  │ WebSocket  │ │ Debug      │ │ Event      │                           │  │
│  │  │ Server     │ │ Capture    │ │ Emitter    │                           │  │
│  │  └────────────┘ └────────────┘ └────────────┘                           │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- **Godot Engine** 4.3 or later
- **VS Code** 1.85 or later (or Cursor)
- **Node.js** 18+ (for development)
- **Godoty Account** (free tier available)

### Installation

1. **Install the VS Code Extension**
   ```bash
   # From VS Code Marketplace (when published)
   code --install-extension godoty.godoty
   
   # Or install from VSIX
   code --install-extension godoty-1.0.0.vsix
   ```

2. **Sign In to Godoty**
   - Click the Godoty icon in the activity bar
   - Click "Sign In" and choose your preferred method (GitHub, Google, or Email)
   - Your account includes free credits to get started

3. **Install the Godot Plugin**
   - Copy `godot-plugin/addons/godoty_bridge/` to your Godot project's `addons/` folder
   - Enable the plugin: Project → Project Settings → Plugins → Godoty Bridge → Enable

4. **Connect**
   - Open your Godot project in both Godot Editor and VS Code
   - The connection status appears in VS Code's status bar
   - Start chatting with Godot context!

### Configuration

Create a `.env` file for local development:

```bash
# Backend Services
VITE_LITELLM_URL=https://litellm-production-150c.up.railway.app
VITE_SUPABASE_URL=https://kbnaymejrngxhpigwphh.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_crqwAKS-G2fVqkyOTr95lQ_SQu-vaj3
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System design and component overview |
| [Backend Services](docs/BACKEND_SERVICES.md) | LiteLLM and Supabase integration |
| [Protocol](docs/PROTOCOL.md) | WebSocket JSON-RPC communication spec |
| [Godot Plugin](docs/GODOT_PLUGIN.md) | EditorPlugin implementation details |
| [MCP Server](docs/MCP_SERVER.md) | Model Context Protocol server spec |
| [VS Code Extension](docs/VSCODE_EXTENSION.md) | Extension modifications from Kilo Code |
| [Implementation Guide](docs/IMPLEMENTATION_GUIDE.md) | Step-by-step build instructions |
| [API Reference](docs/API_REFERENCE.md) | Complete API documentation |
| [Testing](docs/INTEGRATION_TESTS.md) | Testing specifications |

---

## Project Structure

```
godoty/
├── docs/                          # Documentation
├── godot-plugin/                  # Godot EditorPlugin
│   └── addons/godoty_bridge/
├── packages/
│   ├── godoty-mcp/               # MCP Server for Godot integration
│   ├── godoty-llm/               # LiteLLM client wrapper
│   ├── godoty-auth/              # Supabase auth client
│   └── godoty-protocol/          # Shared types
├── apps/
│   └── vscode-extension/         # VS Code Extension (Kilo Code fork)
├── scripts/                       # Build scripts
├── examples/                      # Example projects
└── .github/workflows/            # CI/CD
```

---

## Use Cases

### 1. Debug Visual Issues
```
You: "My player keeps falling through the floor"

Godoty captures viewport, fetches scene tree, checks errors...

AI: "I can see the issue. Your Floor node is a StaticBody3D but 
has no CollisionShape3D child. Here's the fix..."
```

### 2. Generate Accurate Code
```
You: "Add double jump to my CharacterBody3D"

Godoty fetches CharacterBody3D docs from YOUR Godot version...

AI: "Based on Godot 4.3's API, here's the implementation using
move_and_slide() and the correct velocity property..."
```

### 3. Analyze Visual Context
```
You: "Why does my UI look wrong?"

Godoty captures editor viewport AND running game screenshots...

AI: "Comparing editor and runtime, I see the CenterContainer's 
size_flags aren't propagating correctly. The fix is..."
```

---

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/your-org/godoty.git
cd godoty

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run in development mode
pnpm dev
```

### Running Tests

```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:integration

# E2E tests (requires Godot)
pnpm test:e2e
```

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

Apache 2.0 - See [LICENSE](LICENSE) for details.

---

## Acknowledgments

- [Kilo Code](https://github.com/Kilo-Org/kilocode) - The foundation this project is built upon
- [Godot Engine](https://godotengine.org) - The amazing open-source game engine
- [Model Context Protocol](https://modelcontextprotocol.io) - The protocol enabling AI tool integration
- [LiteLLM](https://github.com/BerriAI/litellm) - Unified LLM API gateway
- [Supabase](https://supabase.com) - Open source Firebase alternative
