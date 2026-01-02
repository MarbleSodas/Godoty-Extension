import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { GodotClient } from '../godot-client.js';

export const captureTools: Tool[] = [
  {
    name: 'godot_capture_viewport',
    description: 'Capture a screenshot of the Godot editor viewport (2D or 3D)',
    inputSchema: {
      type: 'object',
      properties: {
        viewport_type: {
          type: 'string',
          enum: ['2d', '3d', 'both'],
          default: '3d',
          description: 'Which viewport to capture',
        },
        max_width: {
          type: 'number',
          default: 2048,
          description: 'Maximum image width',
        },
        max_height: {
          type: 'number',
          default: 2048,
          description: 'Maximum image height',
        },
      },
    },
  },
  {
    name: 'godot_capture_game',
    description: 'Capture a screenshot of the running game',
    inputSchema: {
      type: 'object',
      properties: {
        max_width: {
          type: 'number',
          default: 1920,
        },
        max_height: {
          type: 'number',
          default: 1080,
        },
      },
    },
  },
];

interface CaptureResult {
  success: boolean;
  image?: string;
  images?: {
    '2d'?: { image: string; width: number; height: number };
    '3d'?: { image: string; width: number; height: number };
  };
  width?: number;
  height?: number;
  viewport_type?: string;
  scene_path?: string;
  error?: { message: string };
}

export async function handleCapture(
  name: string,
  args: Record<string, unknown>,
  client: GodotClient
): Promise<{ content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> }> {
  const method = name === 'godot_capture_viewport' ? 'capture_viewport' : 'capture_game';
  
  const result = await client.call<CaptureResult>(method, args);

  if (!result.success) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to capture: ${result.error?.message || 'Unknown error'}`,
        },
      ],
    };
  }

  const content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> = [];

  // Handle single image
  if (result.image) {
    // Extract base64 data from data URL
    const base64Match = result.image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (base64Match) {
      content.push({
        type: 'image',
        data: base64Match[2],
        mimeType: `image/${base64Match[1]}`,
      });
    }
    
    content.push({
      type: 'text',
      text: `Captured ${result.viewport_type || 'game'} viewport (${result.width}x${result.height})${result.scene_path ? ` - Scene: ${result.scene_path}` : ''}`,
    });
  }

  // Handle multiple images (both viewports)
  if (result.images) {
    for (const [vpType, vpData] of Object.entries(result.images)) {
      const base64Match = vpData.image.match(/^data:image\/(\w+);base64,(.+)$/);
      if (base64Match) {
        content.push({
          type: 'image',
          data: base64Match[2],
          mimeType: `image/${base64Match[1]}`,
        });
        content.push({
          type: 'text',
          text: `${vpType.toUpperCase()} viewport (${vpData.width}x${vpData.height})`,
        });
      }
    }
  }

  return { content };
}
