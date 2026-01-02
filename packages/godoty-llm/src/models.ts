export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  supportsVision: boolean;
  supportsTools: boolean;
  costPer1kInput: number;
  costPer1kOutput: number;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    supportsVision: true,
    supportsTools: true,
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    contextWindow: 128000,
    supportsVision: true,
    supportsTools: true,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    supportsVision: true,
    supportsTools: true,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    contextWindow: 200000,
    supportsVision: true,
    supportsTools: true,
    costPer1kInput: 0.0008,
    costPer1kOutput: 0.004
  },
  {
    id: 'gemini/gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    contextWindow: 1000000,
    supportsVision: true,
    supportsTools: true,
    costPer1kInput: 0.0,
    costPer1kOutput: 0.0
  },
  {
    id: 'gemini/gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    contextWindow: 2000000,
    supportsVision: true,
    supportsTools: true,
    costPer1kInput: 0.00125,
    costPer1kOutput: 0.005
  }
];

export const GODOT_RECOMMENDED_MODELS = AVAILABLE_MODELS.filter(
  m => m.supportsVision && m.supportsTools
);
