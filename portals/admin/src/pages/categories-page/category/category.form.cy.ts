import { describe, expect, it } from 'vitest';
import { categoryFormSchema, parseCategoryMedia, toCategoryInput } from './category.form';

const base = {
  name: 'Sports',
  iconMode: 'ICON' as const,
  icon: 'sports',
  description: '',
  mediaText: '',
  sort_order: 0,
  is_active: true,
};

const messagesOf = (values: unknown) => {
  const result = categoryFormSchema.safeParse(values);
  return result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');
};

describe('categoryFormSchema', () => {
  it('rejects empty name', () => {
    expect(messagesOf({ ...base, name: '' })).toMatch(/name/i);
  });
  it('rejects invalid iconMode', () => {
    expect(messagesOf({ ...base, iconMode: 'BOGUS' })).toMatch(/icon mode/i);
  });
  it('rejects negative sort_order', () => {
    expect(messagesOf({ ...base, sort_order: -1 })).toMatch(/sort order/i);
  });
  it('accepts a fully valid category', () => {
    expect(categoryFormSchema.safeParse(base).success).toBe(true);
  });
});

describe('parseCategoryMedia', () => {
  it('detects video extensions', () => {
    const items = parseCategoryMedia('https://x/a.mp4\nhttps://x/b.png\n');
    expect(items[0].type).toBe('VIDEO');
    expect(items[1].type).toBe('IMAGE');
  });
  it('filters blank lines and trims', () => {
    const items = parseCategoryMedia(' \n  https://x/a.png\n\n');
    expect(items).toHaveLength(1);
    expect(items[0].url).toBe('https://x/a.png');
  });
});

describe('toCategoryInput', () => {
  it('maps to backend shape', () => {
    const input = toCategoryInput({ ...base, mediaText: 'https://x/a.png' });
    expect(input.name).toBe('Sports');
    expect(input.media).toHaveLength(1);
    expect(input.is_active).toBe(true);
  });
});

describe('co-hosts (SUB-category only)', () => {
  const sub = { ...base, allow_co_hosts: true, max_co_hosts: 3 };

  it('accepts a co-host limit of 1-5 and rejects anything outside it', () => {
    expect(categoryFormSchema.parse(sub)).toMatchObject({ max_co_hosts: 3 });
    expect(messagesOf({ ...sub, max_co_hosts: 0 })).toMatch(/at least 1/i);
    expect(messagesOf({ ...sub, max_co_hosts: 6 })).toMatch(/at most 5/i);
    expect(messagesOf({ ...sub, max_co_hosts: 2.5 })).toMatch(/whole number/i);
  });

  it('defaults to co-hosting off with a limit of 1', () => {
    const parsed = categoryFormSchema.parse(base);
    expect(parsed.allow_co_hosts).toBe(false);
    expect(parsed.max_co_hosts).toBe(1);
  });

  // The server rejects allow_co_hosts/max_co_hosts on SUPER + CATEGORY, so the
  // payload must not carry them from those dialogs.
  it('only sends the co-host fields for a SUB-category', () => {
    expect(toCategoryInput(sub, 'SUB')).toMatchObject({ allow_co_hosts: true, max_co_hosts: 3 });
    expect(toCategoryInput(sub, 'CATEGORY')).not.toHaveProperty('allow_co_hosts');
    expect(toCategoryInput(sub, 'SUPER')).not.toHaveProperty('max_co_hosts');
    expect(toCategoryInput(sub)).not.toHaveProperty('allow_co_hosts');
  });
});
