import { describe, expect, it } from 'vitest';
import { buildAskDuncitModelsSchema } from './ask-duncit-models.types';

const t = (key: string, options?: { vars?: Record<string, unknown> }) => (options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key);
const schema = buildAskDuncitModelsSchema(t as never);

const valid = {
  default_model: 'gpt-4o',
  evaluator_model: 'gpt-4o-mini',
  transcription_model: 'gpt-4o-mini-transcribe',
  speech_model: 'gpt-4o-mini-tts',
  speech_voice: 'alloy',
  temperature: 0.3,
  max_output_tokens: 1200,
  max_tool_rounds: 6,
  history_turns: 16,
  low_confidence_threshold: 0.5,
};

const issues = (values: Record<string, unknown>) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('Ask Duncit model settings validation', () => {
  it('accepts the shipped defaults, reading numbers typed as text', () => {
    expect(issues(valid)).toEqual([]);
    expect(schema.parse({ ...valid, max_tool_rounds: '4' }).max_tool_rounds).toBe(4);
  });

  it('refuses values past the server limits, naming the limit', () => {
    expect(issues({ ...valid, max_output_tokens: 5000 })).toEqual(['max_output_tokens: ai.askDuncit.validation.max:{"max":4000}']);
    expect(issues({ ...valid, temperature: -1 })).toEqual(['temperature: ai.askDuncit.validation.min:{"min":0}']);
    expect(issues({ ...valid, history_turns: 2.5 })).toEqual(['history_turns: ai.askDuncit.validation.whole']);
  });

  it('requires every model name', () => {
    expect(issues({ ...valid, default_model: '  ' })).toEqual(['default_model: ai.askDuncit.validation.modelRequired']);
  });
});
