import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { GodotClient } from '../godot-client.js';

export const actionTools: Tool[] = [
  {
    name: 'godot_run_action',
    description: 'Execute an action in the Godot editor',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: [
            'run_scene',
            'run_main_scene',
            'stop_scene',
            'pause_scene',
            'resume_scene',
            'select_node',
            'focus_node',
            'set_property',
            'create_node',
            'save_scene',
            'reload_scene',
          ],
          description: 'Action to execute',
        },
        params: {
          type: 'object',
          description: 'Action-specific parameters',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'godot_get_errors',
    description: 'Get recent errors and warnings from the debugger',
    inputSchema: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          default: 10,
        },
        severity: {
          type: 'string',
          enum: ['error', 'warning', 'all'],
          default: 'all',
        },
      },
    },
  },
];

interface ActionResult {
  success: boolean;
  action?: string;
  message?: string;
  data?: unknown;
  error?: { message: string };
}

interface ErrorsResult {
  success: boolean;
  errors: Array<{
    severity: string;
    message: string;
    source: {
      script: string;
      function: string;
      line: number;
    };
    timestamp: number;
  }>;
  total_count: number;
  filtered_count: number;
}

export async function handleActions(
  name: string,
  args: Record<string, unknown>,
  client: GodotClient
): Promise<{ content: Array<{ type: string; text: string }> }> {
  if (name === 'godot_get_errors') {
    const result = await client.call<ErrorsResult>('get_errors', args);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: 'Failed to get errors',
          },
        ],
      };
    }

    if (result.errors.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No errors or warnings found.',
          },
        ],
      };
    }

    const formatted = result.errors.map((e) => {
      const icon = e.severity === 'error' ? '❌' : '⚠️';
      return `${icon} [${e.severity.toUpperCase()}] ${e.message}\n   at ${e.source.script}:${e.source.line} in ${e.source.function || 'unknown'}`;
    }).join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${result.filtered_count} of ${result.total_count} errors/warnings:\n\n${formatted}`,
        },
      ],
    };
  }

  // Handle run_action
  const result = await client.call<ActionResult>('execute_action', args);

  if (!result.success) {
    return {
      content: [
        {
          type: 'text',
          text: `Action failed: ${result.error?.message || 'Unknown error'}`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: result.message || `Action '${result.action}' completed successfully`,
      },
    ],
  };
}
