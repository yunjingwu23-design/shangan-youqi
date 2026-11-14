export type AiProviderId = 'deepseek' | 'hunyuan' | 'openai';

export interface AiProviderConfig {
  id: AiProviderId;
  label: string;
  /** OpenAI-compatible chat completions endpoint (no trailing /chat/completions). */
  baseUrl: string;
  /** Default model for this provider. */
  defaultModel: string;
  /** Environment variable that holds the API key for this provider. */
  keyEnv: string;
  /** Environment variable that overrides the model (optional). */
  modelEnv: string;
}

export const AI_PROVIDERS: Record<AiProviderId, AiProviderConfig> = {
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    // deepseek-chat / deepseek-reasoner 已于 2026/07/24 弃用，改用 deepseek-flash。
    defaultModel: 'deepseek-flash',
    keyEnv: 'DEEPSEEK_API_KEY',
    modelEnv: 'DEEPSEEK_MODEL',
  },
  hunyuan: {
    id: 'hunyuan',
    label: '腾讯混元',
    baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1',
    defaultModel: 'hunyuan-turbos-latest',
    keyEnv: 'HUNYUAN_API_KEY',
    modelEnv: 'HUNYUAN_MODEL',
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4.1-mini',
    keyEnv: 'OPENAI_API_KEY',
    modelEnv: 'OPENAI_REVIEW_MODEL',
  },
};

/**
 * Resolve the active AI provider from environment variables.
 *
 * Priority:
 *  1. `AI_PROVIDER` env var (explicit choice: deepseek | hunyuan | openai)
 *  2. Fall back to the first provider whose API key is present
 *  3. Default to deepseek (cheapest / most convenient for Chinese content)
 */
export function resolveProvider(): AiProviderConfig {
  const explicit = process.env.AI_PROVIDER?.toLowerCase() as AiProviderId | undefined;
  if (explicit && AI_PROVIDERS[explicit]) return AI_PROVIDERS[explicit];

  for (const id of ['deepseek', 'hunyuan', 'openai'] as const) {
    if (process.env[AI_PROVIDERS[id].keyEnv]) return AI_PROVIDERS[id];
  }
  return AI_PROVIDERS.deepseek;
}

export function resolveKey(provider: AiProviderConfig): string {
  return process.env[provider.keyEnv] ?? '';
}

export function resolveModel(provider: AiProviderConfig): string {
  return process.env[provider.modelEnv] || provider.defaultModel;
}
