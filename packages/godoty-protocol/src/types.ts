export interface GodotConnectionStatus {
  connected: boolean;
  godotVersion: GodotVersion | null;
  pluginVersion: string | null;
  lastError: string | null;
}

export interface GodotVersion {
  major: number;
  minor: number;
  patch: number;
  status: string;
  string: string;
}

export interface SceneNode {
  name: string;
  type: string;
  path: string;
  script?: string;
  children: SceneNode[];
}

export interface NodeProperties {
  node_path: string;
  node_type: string;
  script?: string;
  properties: Record<string, PropertyValue>;
  script_properties?: Record<string, PropertyValue>;
}

export interface PropertyValue {
  type: string;
  value: unknown;
  category?: string;
  exported?: boolean;
}

export interface ClassDocs {
  class_name: string;
  inherits: string;
  brief_description: string;
  description: string;
  methods: MethodDoc[];
  properties: PropertyDoc[];
  signals: SignalDoc[];
  enums: EnumDoc[];
  constants: ConstantDoc[];
}

export interface MethodDoc {
  name: string;
  return_type: string;
  description: string;
  arguments: ArgumentDoc[];
}

export interface PropertyDoc {
  name: string;
  type: string;
  description: string;
  default: string | null;
}

export interface SignalDoc {
  name: string;
  description: string;
  arguments: ArgumentDoc[];
}

export interface ArgumentDoc {
  name: string;
  type: string;
  default?: unknown;
}

export interface EnumDoc {
  name: string;
  values: { name: string; value: number }[];
}

export interface ConstantDoc {
  name: string;
  value: number;
}

export interface CaptureResult {
  success: boolean;
  viewport_type: string;
  image?: string;
  images?: Record<string, ImageData>;
  width?: number;
  height?: number;
  scene_path?: string;
  timestamp: number;
  error?: { code: number; message: string };
}

export interface ImageData {
  image: string;
  width: number;
  height: number;
}

export interface DebugError {
  severity: 'error' | 'warning';
  message: string;
  source: {
    script: string;
    function?: string;
    line: number;
  };
  stack_trace?: string[];
  timestamp: number;
}

export type ActionType =
  | 'run_scene'
  | 'run_main_scene'
  | 'stop_scene'
  | 'pause_scene'
  | 'resume_scene'
  | 'select_node'
  | 'select_nodes'
  | 'focus_node'
  | 'set_property'
  | 'create_node'
  | 'delete_node'
  | 'save_scene'
  | 'reload_scene';

export interface ActionResult {
  success: boolean;
  action: ActionType;
  message?: string;
  data?: unknown;
  error?: { code: number; message: string };
}

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: number | string | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

export const ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  NODE_NOT_FOUND: -32000,
  CLASS_NOT_FOUND: -32001,
  ACTION_NOT_ALLOWED: -32002,
  GAME_NOT_RUNNING: -32003,
  CAPTURE_FAILED: -32004,
  TIMEOUT: -32005,
  INVALID_PATH: -32006,
  AUTH_REQUIRED: -32007,
  QUOTA_EXCEEDED: -32008
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
