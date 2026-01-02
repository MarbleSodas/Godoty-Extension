#!/usr/bin/env node

import { GodotyMCPServer } from './server.js';

const server = new GodotyMCPServer();

server.start().catch((error) => {
  console.error('Failed to start Godoty MCP server:', error);
  process.exit(1);
});
