import { describe, expect, it } from 'vitest';
import { makeMediaSchema } from './media.types';

const t = (key: string, options?: { vars?: Record<string, string | number> }) => (options?.vars ? `${key}(${JSON.stringify(options.vars)})` : key);
const schema = makeMediaSchema(t);
const ok = { max_file_mb: 100, allowed_types: ['application/pdf', 'image/png'], auto_index: true, ocr_images: true, extract_pdf: true, default_visibility: 'PRIVATE', vision_model: 'gpt-4o-mini' };
const issues = (values: Record<string, unknown>) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('media settings validation', () => {
  it('accepts the defaults', () => {
    expect(issues(ok)).toEqual([]);
  });

  it('caps uploads at 100 MB and needs at least 1 MB', () => {
    expect(issues({ ...ok, max_file_mb: 101 })).toEqual(['max_file_mb: intel.settings.common.max({"max":100})']);
    expect(issues({ ...ok, max_file_mb: 0 })).toEqual(['max_file_mb: intel.settings.common.min({"min":1})']);
  });

  it('needs at least one type and only accepts types Intel can read', () => {
    expect(issues({ ...ok, allowed_types: [] })).toEqual(['allowed_types: intel.settings.media.typesRequired']);
    expect(issues({ ...ok, allowed_types: ['application/zip'] })).toHaveLength(1);
  });
});
