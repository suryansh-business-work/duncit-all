import { describe, expect, it } from 'vitest';
import { makeEmbeddingsSchema } from './embeddings.types';

const t = (key: string, options?: { vars?: Record<string, string | number> }) => (options?.vars ? `${key}(${JSON.stringify(options.vars)})` : key);
const schema = makeEmbeddingsSchema(t);
const ok = { model: 'text-embedding-3-small', dimensions: 1536, chunk_chars: 1200, chunk_overlap: 200, top_k: 8 };
const issues = (values: Record<string, unknown>) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('embeddings settings validation', () => {
  it('accepts the defaults and coerces numeric strings from the inputs', () => {
    expect(schema.parse({ ...ok, dimensions: '1536', top_k: '8' })).toEqual(ok);
  });

  it('refuses an overlap of half the chunk size or more', () => {
    expect(issues({ ...ok, chunk_chars: 1000, chunk_overlap: 500 })).toEqual(['chunk_overlap: intel.settings.embeddings.overlapTooBig']);
    expect(issues({ ...ok, chunk_chars: 1000, chunk_overlap: 499 })).toEqual([]);
  });

  it('enforces the bounds and an integer count', () => {
    expect(issues({ ...ok, top_k: 13 })).toEqual(['top_k: intel.settings.common.max({"max":12})']);
    expect(issues({ ...ok, dimensions: 63 })).toEqual(['dimensions: intel.settings.common.min({"min":64})']);
    expect(issues({ ...ok, top_k: 2.5 })).toEqual(['top_k: intel.settings.common.integer']);
  });

  it('refuses a model id with spaces or slashes', () => {
    expect(issues({ ...ok, model: 'text embedding' })).toEqual(['model: intel.settings.common.modelId']);
  });
});
