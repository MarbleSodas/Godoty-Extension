import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { GodotClient } from '../godot-client.js';

export const sceneTools: Tool[] = [
  {
    name: 'godot_get_scene',
    description: 'Get the current scene tree structure',
    inputSchema: {
      type: 'object',
      properties: {
        root_path: {
          type: 'string',
          default: '/root',
          description: 'Starting node path',
        },
        max_depth: {
          type: 'number',
          default: -1,
          description: 'Maximum depth (-1 for unlimited)',
        },
        include_properties: {
          type: 'boolean',
          default: false,
        },
      },
    },
  },
  {
    name: 'godot_get_selected',
    description: 'Get currently selected nodes in the editor',
    inputSchema: {
      type: 'object',
      properties: {
        include_properties: {
          type: 'boolean',
          default: false,
        },
      },
    },
  },
  {
    name: 'godot_get_node',
    description: 'Get detailed information about a specific node',
    inputSchema: {
      type: 'object',
      properties: {
        node_path: {
          type: 'string',
          description: 'Path to the node',
        },
        include_children: {
          type: 'boolean',
          default: false,
        },
      },
      required: ['node_path'],
    },
  },
];

interface SceneNode {
  name: string;
  type: string;
  path: string;
  script?: string;
  children: SceneNode[];
}

interface SceneResult {
  success: boolean;
  scene_path?: string;
  root?: SceneNode;
  selected_nodes?: Array<{
    name: string;
    type: string;
    path: string;
    script?: string;
    properties?: Record<string, unknown>;
  }>;
  count?: number;
  error?: { message: string };
}

export async function handleScene(
  name: string,
  args: Record<string, unknown>,
  client: GodotClient
): Promise<{ content: Array<{ type: string; text: string }> }> {
  let method: string;
  
  switch (name) {
    case 'godot_get_scene':
      method = 'get_scene_tree';
      break;
    case 'godot_get_selected':
      method = 'get_selected_nodes';
      break;
    case 'godot_get_node':
      method = 'get_node_properties';
      break;
    default:
      throw new Error(`Unknown scene tool: ${name}`);
  }

  const result = await client.call<SceneResult>(method, args);

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

  let output: string;

  if (name === 'godot_get_scene' && result.root) {
    output = formatSceneTree(result.scene_path || '', result.root);
  } else if (name === 'godot_get_selected' && result.selected_nodes) {
    output = formatSelectedNodes(result.selected_nodes);
  } else if (name === 'godot_get_node') {
    output = JSON.stringify(result, null, 2);
  } else {
    output = JSON.stringify(result, null, 2);
  }

  return {
    content: [
      {
        type: 'text',
        text: output,
      },
    ],
  };
}

function formatSceneTree(scenePath: string, root: SceneNode, indent: string = ''): string {
  const lines: string[] = [];
  
  if (!indent) {
    lines.push(`Scene: ${scenePath}`);
    lines.push('');
  }

  const scriptInfo = root.script ? ` [script: ${root.script.split('/').pop()}]` : '';
  lines.push(`${indent}${root.name} (${root.type})${scriptInfo}`);

  for (let i = 0; i < root.children.length; i++) {
    const child = root.children[i];
    const isLast = i === root.children.length - 1;
    const prefix = isLast ? '└── ' : '├── ';
    const childIndent = indent + (isLast ? '    ' : '│   ');
    
    const childScript = child.script ? ` [script: ${child.script.split('/').pop()}]` : '';
    lines.push(`${indent}${prefix}${child.name} (${child.type})${childScript}`);
    
    if (child.children.length > 0) {
      for (let j = 0; j < child.children.length; j++) {
        const grandchild = child.children[j];
        lines.push(formatSceneTree('', grandchild, childIndent).split('\n').slice(1).join('\n'));
      }
    }
  }

  return lines.join('\n');
}

function formatSelectedNodes(nodes: Array<{
  name: string;
  type: string;
  path: string;
  script?: string;
  properties?: Record<string, unknown>;
}>): string {
  if (nodes.length === 0) {
    return 'No nodes selected';
  }

  const lines: string[] = [`Selected ${nodes.length} node(s):`, ''];

  for (const node of nodes) {
    lines.push(`- **${node.name}** (${node.type})`);
    lines.push(`  Path: ${node.path}`);
    if (node.script) {
      lines.push(`  Script: ${node.script}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
