import 'server-only';
import {
  aiClassificationJsonSchema,
  aiClassificationSchema,
  type AiClassification,
} from './ai-normalize';
import {
  resolveKey,
  resolveModel,
  resolveProvider,
  type AiProviderConfig,
} from './ai-provider';

const INSTRUCTIONS = `你是面经信息结构化助手。你只处理运营人员有权使用的文本（如用户投稿、已授权导入的摘录）。
你的任务是把一段面试经验拆成结构化字段。严格遵守：
1. 只能提取文本中明确出现的信息，不得推断、补充或编造。
2. 无法确定的字段一律返回 null（或空数组），不得猜测。
3. 招聘类型（日常实习/转正实习/秋招/春招）仅在文本明确说明时填写，否则 null；"转正实习"仅在存在留用可能的证据时才填写。
4. 面试轮次、问题、作者评价只能来自原文；作者未公开的 Offer 结果不得推断，author_result 返回 null。
5. 问题若无法确认为真实面试题，confidence 必须为 "inferred" 或 "pending"，绝不标 "verified"。
6. 只输出一个 JSON 对象，不要输出任何其他文字、解释或 markdown 代码块。`;

function buildSchemaInstruction(provider: AiProviderConfig): string {
  // DeepSeek & Hunyuan don't support OpenAI's strict json_schema; instruct the
  // model to emit plain JSON and validate the result ourselves.
  const schema = JSON.stringify(aiClassificationJsonSchema());
  return `\n\n你必须返回符合以下 JSON Schema 的 JSON 对象（不要包含 markdown 代码块标记）：\n${schema}`;
}

function parseJsonText(text: string): unknown {
  let cleaned = text.trim();
  // Strip markdown fences if the model wrapped the JSON anyway.
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) cleaned = fence[1].trim();
  // Some models prepend prose before the JSON; try to isolate the object.
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

export async function classifyText(
  text: string,
  key?: string,
  signal?: AbortSignal
): Promise<AiClassification> {
  const provider = resolveProvider();
  const resolvedKey = key ?? resolveKey(provider);
  if (!resolvedKey) {
    throw new Error(
      `AI 服务尚未配置（缺少 ${provider.keyEnv}）。请在环境变量中配置后重试。`
    );
  }

  const combined = AbortSignal.any([signal ?? new AbortSignal(), AbortSignal.timeout(60000)]);
  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resolvedKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: resolveModel(provider),
      max_tokens: 4000,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: INSTRUCTIONS + buildSchemaInstruction(provider) },
        { role: 'user', content: `待结构化文本：\n${text.slice(0, 8000)}` },
      ],
    }),
    signal: combined,
  });

  if (!response.ok) {
    throw new Error(`AI 调用失败（${provider.label} ${response.status}）。`);
  }

  const result = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = result.choices?.[0]?.message?.content ?? '';
  if (!content.trim()) throw new Error('AI 返回为空。');

  let parsed: unknown;
  try {
    parsed = parseJsonText(content);
  } catch {
    throw new Error('AI 返回格式无法解析。');
  }

  const validated = aiClassificationSchema.safeParse(parsed);
  if (!validated.success) throw new Error('AI 返回结构不完整。');
  return validated.data;
}

export type { AiClassification };
