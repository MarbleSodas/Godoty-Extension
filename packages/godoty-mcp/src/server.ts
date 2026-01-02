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
    try {
      await this.godotClient.connect();
    } catch (error) {
      console.error('Warning: Could not connect to Godot. Will retry in background.');
    }

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
