import { describe, expect, it } from 'vitest';
import { makeFileDetailsSchema, NAME_MAX } from './file-details.types';

const t = (key: string, options?: { vars?: Record<string, string | number> }) => (options?.vars ? `${key}(${JSON.stringify(options.vars)})` : key);
const schema = makeFileDetailsSchema(t);
const ok = { name: 'Q3 report.pdf', folder: '/Reports/2026', visibility: 'TEAM' as const };
const issues = (values: Record<string, unknown>) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('file details validation', () => {
  it('accepts a named file in a nested folder and trims the name', () => {
    expect(schema.parse({ ...ok, name: '  Q3 report.pdf ' })).toEqual(ok);
  });

  it('refuses an empty name and a name over the limit', () => {
    expect(issues({ ...ok, name: ' ' })).toEqual(['name: intel.media.details.nameRequired']);
    expect(issues({ ...ok, name: 'x'.repeat(NAME_MAX + 1) })).toEqual([`name: intel.media.details.nameTooLong({"max":${NAME_MAX}})`]);
  });

  it('accepts the root folder and refuses relative or malformed folders', () => {
    expect(issues({ ...ok, folder: '/' })).toEqual([]);
    expect(issues({ ...ok, folder: 'Reports' })).toEqual(['folder: intel.media.details.folderInvalid']);
    expect(issues({ ...ok, folder: '/a//b' })).toEqual(['folder: intel.media.details.folderInvalid']);
  });

  it('only allows the three visibility levels', () => {
    expect(issues({ ...ok, visibility: 'PUBLIC' })).toHaveLength(1);
    for (const visibility of ['PRIVATE', 'TEAM', 'ADMINS']) expect(issues({ ...ok, visibility })).toEqual([]);
  });
});
