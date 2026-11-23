import { describe, expect, it } from 'vitest';
import { makeSyncSchema } from './sync.types';

const t = (key: string, options?: { vars?: Record<string, string | number> }) => (options?.vars ? `${key}(${JSON.stringify(options.vars)})` : key);
const schema = makeSyncSchema(t);
const issues = (values: Record<string, unknown>) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('sync settings validation', () => {
  it('accepts the defaults typed into text inputs', () => {
    expect(schema.parse({ paused: false, interval_minutes: '60', max_items_per_run: '2000' })).toEqual({ paused: false, interval_minutes: 60, max_items_per_run: 2000 });
  });

  it('refuses syncing more often than every 5 minutes or less than once a day', () => {
    expect(issues({ paused: false, interval_minutes: 4, max_items_per_run: 2000 })).toEqual(['interval_minutes: intel.settings.common.min({"min":5})']);
    expect(issues({ paused: false, interval_minutes: 1441, max_items_per_run: 2000 })).toEqual(['interval_minutes: intel.settings.common.max({"max":1440})']);
  });

  it('bounds the items a single run may read', () => {
    expect(issues({ paused: true, interval_minutes: 60, max_items_per_run: 49 })).toEqual(['max_items_per_run: intel.settings.common.min({"min":50})']);
  });
});
