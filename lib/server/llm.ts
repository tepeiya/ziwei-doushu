// lib/server/llm.ts
// OpenAI 兼容的流式聊天客户端（DeepSeek / Moonshot / OpenAI / 任意兼容端点）。
// 配置来自 .env：AI_PROVIDER、DEEPSEEK_API_KEY、MIMO_BASE_URL、MIMO_MODEL、
// 以及通用覆盖变量 OPENAI_BASE_URL / OPENAI_API_KEY / OPENAI_MODEL。
// 未配置 API Key 时优雅降级：yield 一段说明文字，不抛错。

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

function defaultBaseUrl(provider: string): string {
  switch (provider) {
    case 'deepseek':
      return 'https://api.deepseek.com/v1';
    case 'mimo':
      return process.env.MIMO_BASE_URL ?? 'https://api.mimo.com/v1';
    case 'openai':
      return 'https://api.openai.com/v1';
    case 'moonshot':
      return 'https://api.moonshot.cn/v1';
    default:
      return 'https://api.deepseek.com/v1';
  }
}

function defaultModel(provider: string): string {
  switch (provider) {
    case 'deepseek':
      return 'deepseek-chat';
    case 'mimo':
      return process.env.MIMO_MODEL ?? 'mimo-v1';
    case 'openai':
      return 'gpt-4o-mini';
    case 'moonshot':
      return 'moonshot-v1-8k';
    default:
      return 'deepseek-chat';
  }
}

export function getLLMConfig() {
  const provider = (process.env.AI_PROVIDER ?? 'deepseek').toLowerCase();
  const baseUrl = (process.env.OPENAI_BASE_URL ?? defaultBaseUrl(provider)).replace(/\/$/, '');
  const apiKey =
    process.env.OPENAI_API_KEY ??
    process.env.DEEPSEEK_API_KEY ??
    process.env.MIMO_API_KEY ??
    '';
  const model = process.env.OPENAI_MODEL ?? defaultModel(provider);
  return { provider, baseUrl, apiKey, model };
}

const NO_KEY_HINT =
  '⚠️ 尚未配置 AI 解读所需的 API Key。请在项目根目录的 .env.local 中设置 ' +
  'AI_PROVIDER 与对应密钥（如 DEEPSEEK_API_KEY），保存后重启服务即可使用解读功能。';

/**
 * 流式对话。按 OpenAI chat/completions SSE 协议逐块产出文本增量。
 * 无 API Key 或服务异常时产出说明性文本，便于前端直接展示。
 */
export async function* streamChat(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {},
): AsyncGenerator<string> {
  const { baseUrl, apiKey, model } = getLLMConfig();

  if (!apiKey) {
    yield NO_KEY_HINT;
    return;
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 2000,
      }),
    });
  } catch {
    yield '⚠️ 无法连接 AI 服务，请检查网络与 API 端点配置。';
    return;
  }

  if (!res.ok || !res.body) {
    yield `⚠️ AI 服务返回错误（${res.status}），请检查 API Key 与额度。`;
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') return;
      try {
        const json = JSON.parse(data);
        const delta: string = json.choices?.[0]?.delta?.content ?? '';
        if (delta) yield delta;
      } catch {
        // 忽略不完整/心跳行
      }
    }
  }
}
