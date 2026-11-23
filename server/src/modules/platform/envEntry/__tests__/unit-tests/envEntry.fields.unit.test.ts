import {
  assertEveryCategoryGrouped,
  CATEGORY_API_DOCS,
  CATEGORY_DOCS,
  CATEGORY_FIELDS,
  CATEGORY_LABELS,
  CATEGORY_USED_IN,
  ENV_KEY_MAP,
  groupOf,
  maskSecret,
  parseEnvRegistry,
  SECRET_FIELDS,
} from '../../envEntry.fields';
import { ENV_CATEGORIES } from '../../envEntry.model';

describe('maskSecret', () => {
  it('shows nothing for no value', () => {
    expect(maskSecret('')).toBe('');
  });

  it('hides a short value entirely', () => {
    expect(maskSecret('abc')).toBe('••••••');
    expect(maskSecret('abcdef')).toBe('••••••');
  });

  it('keeps the first and last three characters of a longer value', () => {
    expect(maskSecret('abcdefg')).toBe('abc••••••efg');
    expect(maskSecret('sk-live-1234567890')).toBe('sk-••••••890');
  });
});

describe('assertEveryCategoryGrouped', () => {
  it('passes when every category has a group', () => {
    expect(() => assertEveryCategoryGrouped(['EMAIL', 'PEXELS'], () => true)).not.toThrow();
    expect(() => assertEveryCategoryGrouped([], () => false)).not.toThrow();
  });

  it('names every category that no group lists', () => {
    expect(() => assertEveryCategoryGrouped(['EMAIL', 'NEW_ONE', 'ANOTHER'], (c) => c === 'EMAIL')).toThrow(
      'Env categories with no sidebar group: NEW_ONE, ANOTHER. Add them to CATEGORY_GROUPS.'
    );
  });
});

describe('the env registry (env-registry.json)', () => {
  const minimal = (over: Record<string, unknown> = {}) => {
    const field = { name: 'api_key', label: 'API Key', description: 'Why', validation: { type: 'text', required: true }, usedIn: [] };
    const categories = Object.fromEntries(
      ENV_CATEGORIES.map((category) => [category, { label: category, description: 'd', docUrl: 'https://x.test', usedIn: [], fields: [{ ...field, envKey: `${category}_KEY` }] }])
    );
    return { groups: [{ key: 'ALL', label: 'All', description: 'd', categories: [...ENV_CATEGORIES] }], categories, ...over };
  };

  it('parses a well-formed document', () => {
    const parsed = parseEnvRegistry(minimal());
    expect(parsed.categories.size).toBe(ENV_CATEGORIES.length);
    expect(parsed.categories.get('EMAIL')?.fields[0]).toEqual({
      name: 'api_key',
      label: 'API Key',
      envKey: 'EMAIL_KEY',
      description: 'Why',
      validation: { type: 'text', required: true },
      usedIn: [],
    });
  });

  it('refuses a document missing a category, naming it', () => {
    const doc = minimal();
    delete (doc.categories as Record<string, unknown>).EMAIL;
    expect(() => parseEnvRegistry(doc)).toThrow('env-registry.json: EMAIL is missing');
  });

  it('refuses a category the model does not know', () => {
    const doc = minimal();
    (doc.categories as Record<string, unknown>).TELEPATHY = (doc.categories as Record<string, unknown>).EMAIL;
    expect(() => parseEnvRegistry(doc)).toThrow('not in ENV_CATEGORIES: TELEPATHY');
  });

  it('refuses a field without a description or with an unknown validation type', () => {
    const noWhy = minimal();
    (noWhy.categories as any).EMAIL.fields[0].description = ' ';
    expect(() => parseEnvRegistry(noWhy)).toThrow('EMAIL.api_key needs a non-empty "description"');
    const badType = minimal();
    (badType.categories as any).EMAIL.fields[0].validation = { type: 'regex' };
    expect(() => parseEnvRegistry(badType)).toThrow('needs validation.type');
  });

  it('refuses an env key mapped twice and a group naming an unknown category', () => {
    const twice = minimal();
    (twice.categories as any).PEXELS.fields[0].envKey = 'EMAIL_KEY';
    expect(() => parseEnvRegistry(twice)).toThrow('map env key EMAIL_KEY twice');
    const group = minimal({ groups: [{ key: 'G', label: 'G', description: 'd', categories: ['NOPE'] }] });
    expect(() => parseEnvRegistry(group)).toThrow('names unknown categories: NOPE');
  });

  it('gives every real field a description, a validation type and its env key mapping', () => {
    for (const category of ENV_CATEGORIES) {
      for (const field of CATEGORY_FIELDS[category]) {
        expect(field.description.trim()).not.toBe('');
        expect(field.validation.type).toBeTruthy();
        if (field.envKey) expect(ENV_KEY_MAP[field.envKey]).toEqual({ category, field: field.name });
      }
    }
  });

  it('keeps every legacy env key and maps the new ones', () => {
    expect(ENV_KEY_MAP.SMTP_HOST).toEqual({ category: 'EMAIL', field: 'host' });
    expect(ENV_KEY_MAP.GOOGLE_MAP_API).toEqual({ category: 'GOOGLE_MAPS', field: 'maps_api_key' });
    // AISENSY_WEBHOOK_SECRET used to point at a field the portal never showed.
    expect(CATEGORY_FIELDS.AISENSY.some((f) => f.name === 'webhook_secret')).toBe(true);
    expect(ENV_KEY_MAP.GOOGLE_PLAY_APP_LINKS_SHA256).toEqual({ category: 'GOOGLE_PLAY', field: 'app_links_sha256' });
    expect(ENV_KEY_MAP.REMOTION_LICENSE_KEY).toEqual({ category: 'REMOTION', field: 'license_key' });
  });

  it('requires exactly one field on create where the portal always did: the first secret', () => {
    for (const category of ENV_CATEGORIES) {
      const required = CATEGORY_FIELDS[category].filter((f) => f.validation.required).map((f) => f.name);
      const firstSecret = CATEGORY_FIELDS[category].find((f) => f.secret)?.name;
      expect({ category, required }).toEqual({ category, required: firstSecret ? [firstSecret] : [] });
    }
  });

  it('places every category in a sidebar group and derives labels, docs and readers', () => {
    for (const category of ENV_CATEGORIES) {
      expect(groupOf(category).categories).toContain(category);
      expect(CATEGORY_LABELS[category]).toBeTruthy();
      expect(CATEGORY_DOCS[category]).toMatch(/^https:\/\//);
      expect(CATEGORY_USED_IN[category].length).toBeGreaterThan(0);
    }
    expect(CATEGORY_API_DOCS.EMAIL).toBeUndefined();
    expect(SECRET_FIELDS).toEqual(expect.arrayContaining(['password', 'license_key', 'webhook_secret']));
  });
});
