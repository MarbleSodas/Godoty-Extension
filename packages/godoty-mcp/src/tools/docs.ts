import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { GodotClient } from '../godot-client.js';

export const docsTools: Tool[] = [
  {
    name: 'godot_get_docs',
    description: 'Get documentation for a Godot class or method from the running editor',
    inputSchema: {
      type: 'object',
      properties: {
        class_name: {
          type: 'string',
          description: 'Godot class name (e.g., "CharacterBody3D")',
        },
        method_name: {
          type: 'string',
          description: 'Optional: specific method to document',
        },
        include_inherited: {
          type: 'boolean',
          default: false,
          description: 'Include inherited members',
        },
      },
      required: ['class_name'],
    },
  },
  {
    name: 'godot_search_docs',
    description: 'Search Godot documentation for classes, methods, or properties',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
        limit: {
          type: 'number',
          default: 10,
        },
      },
      required: ['query'],
    },
  },
];

interface ClassDocs {
  success: boolean;
  class_name: string;
  inherits: string;
  methods: Array<{
    name: string;
    return_type: string;
    arguments: Array<{ name: string; type: string }>;
    description: string;
  }>;
  properties: Array<{
    name: string;
    type: string;
    default: string;
    description: string;
  }>;
  signals: Array<{
    name: string;
    arguments: Array<{ name: string; type: string }>;
  }>;
  error?: { message: string };
}

export async function handleDocs(
  name: string,
  args: Record<string, unknown>,
  client: GodotClient
): Promise<{ content: Array<{ type: string; text: string }> }> {
  if (name === 'godot_search_docs') {
    const result = await client.call<{ results: Array<{ type: string; class_name: string; name: string }> }>('search_docs', args);
    
    const formatted = result.results
      .map((r) => `- [${r.type}] ${r.class_name}.${r.name}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Search results for "${args.query}":\n\n${formatted}`,
        },
      ],
    };
  }

  // Get class or method docs
  const method = args.method_name ? 'get_method_docs' : 'get_class_docs';
  const result = await client.call<ClassDocs>(method, args);

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

  // Format as markdown
  const md = formatClassDocs(result);

  return {
    content: [
      {
        type: 'text',
        text: md,
      },
    ],
  };
}

function formatClassDocs(docs: ClassDocs): string {
  const lines: string[] = [];

  lines.push(`# ${docs.class_name}`);
  lines.push('');
  
  if (docs.inherits) {
    lines.push(`**Inherits:** ${docs.inherits}`);
    lines.push('');
  }

  // Properties
  if (docs.properties.length > 0) {
    lines.push('## Properties');
    lines.push('');
    lines.push('| Name | Type | Default |');
    lines.push('|------|------|---------|');
    for (const prop of docs.properties) {
      lines.push(`| \`${prop.name}\` | ${prop.type} | ${prop.default || '-'} |`);
    }
    lines.push('');
  }

  // Methods
  if (docs.methods.length > 0) {
    lines.push('## Methods');
    lines.push('');
    for (const method of docs.methods) {
      const args = method.arguments.map((a) => `${a.name}: ${a.type}`).join(', ');
      lines.push(`### ${method.name}(${args}) -> ${method.return_type}`);
      if (method.description) {
        lines.push('');
        lines.push(method.description);
      }
      lines.push('');
    }
  }

  // Signals
  if (docs.signals.length > 0) {
    lines.push('## Signals');
    lines.push('');
    for (const signal of docs.signals) {
      const args = signal.arguments.map((a) => `${a.name}: ${a.type}`).join(', ');
      lines.push(`- **${signal.name}**(${args})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
