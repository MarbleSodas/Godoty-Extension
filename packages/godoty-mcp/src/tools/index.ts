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
