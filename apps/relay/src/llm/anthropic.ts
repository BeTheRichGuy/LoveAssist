import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';
import type { Prompt } from '../prompts';

// LLM 연결부. 제공사를 바꿀 때는 이 파일만 교체한다 (호출하는 쪽은 generate의 입출력만 안다).
// 요청 · 응답 본문은 여기서 로그로 남기지 않는다.

export type Effort = 'low' | 'medium' | 'high';

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export type GenerateResult<T> =
  | { ok: true; data: T; usage: Usage }
  | { ok: false; error: string; raw: string | null; usage: Usage | null };

export async function generate<S extends z.ZodType>(
  client: Anthropic,
  opts: {
    model: string;
    prompt: Prompt;
    schema: S;
    effort: Effort;
    /** 생각(thinking)을 끈다. Haiku 5.5는 effort high 이하에서만 가능 */
    noThinking?: boolean;
  },
): Promise<GenerateResult<z.infer<S>>> {
  let res: Anthropic.Message;
  try {
    res = await client.messages.create({
      model: opts.model,
      max_tokens: 16000,
      system: opts.prompt.system,
      messages: [{ role: 'user', content: opts.prompt.user }],
      output_config: { effort: opts.effort, format: zodOutputFormat(opts.schema) },
      ...(opts.noThinking ? { thinking: { type: 'disabled' as const } } : {}),
    });
  } catch (e) {
    const msg = e instanceof Anthropic.APIError ? `API ${e.status}: ${e.message}` : String(e);
    return { ok: false, error: msg, raw: null, usage: null };
  }

  const usage = { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens };
  if (res.stop_reason === 'refusal') {
    return { ok: false, error: `refusal (${res.stop_details?.category ?? '?'})`, raw: null, usage };
  }
  const raw = res.content.find((b) => b.type === 'text')?.text ?? '';
  if (res.stop_reason === 'max_tokens') return { ok: false, error: 'max_tokens', raw, usage };

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'JSON 파싱 실패', raw, usage };
  }
  const parsed = opts.schema.safeParse(json);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    return { ok: false, error: `스키마 불일치: ${issues.join('; ')}`, raw, usage };
  }
  return { ok: true, data: parsed.data, usage };
}
