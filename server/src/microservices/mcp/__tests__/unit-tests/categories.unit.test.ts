/**
 * The module → category map is typed against the module list so a new module
 * cannot compile unfiled — but the type only proves the KEYS line up. These
 * checks prove the values are real categories, the map has no stale entries,
 * and the modules that must never reach an AI stay out.
 */
import { typeDefsByModule } from '@modules/index';
import { REMOTE_CATEGORIES, categoryLabel, MCP_CATEGORIES, MODULE_CATEGORY } from '../../catalog/categories';

const CATEGORY_KEYS = new Set<string>(MCP_CATEGORIES.map((category) => category.key));

describe('MCP_CATEGORIES', () => {
  it('has unique keys that are valid tool-name prefixes once hyphens become underscores', () => {
    const keys = MCP_CATEGORIES.map((category) => category.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(key).toMatch(/^[a-z][a-z-]*[a-z]$/);
  });

  it('gives every category a label and a description an AI can choose by', () => {
    for (const category of MCP_CATEGORIES) {
      expect(category.label.trim().length).toBeGreaterThan(1);
      expect(category.description.trim().length).toBeGreaterThan(10);
    }
  });
});

describe('MODULE_CATEGORY', () => {
  it('files every module the API serves — no module is missing', () => {
    const missing = Object.keys(typeDefsByModule).filter((module) => !(module in MODULE_CATEGORY));
    expect(missing).toEqual([]);
  });

  it('has no entry for a module the API no longer serves', () => {
    const modules = new Set(Object.keys(typeDefsByModule));
    const stale = Object.keys(MODULE_CATEGORY).filter((module) => !modules.has(module));
    expect(stale).toEqual([]);
  });

  it('files every module under an existing category or null', () => {
    const invalid = Object.entries(MODULE_CATEGORY).filter(([, category]) => category !== null && !CATEGORY_KEYS.has(category));
    expect(invalid).toEqual([]);
  });

  it.each(['authTypeDefs', 'truecallerTypeDefs', 'captchaTypeDefs', 'otpTypeDefs', 'apiKeyTypeDefs', 'tableApiTypeDefs', 'envEntryTypeDefs'] as const)(
    'keeps %s out of MCP entirely (sign-in, codes and secrets are for the person)',
    (module) => {
      expect(MODULE_CATEGORY[module]).toBeNull();
    }
  );

  it('keeps Partner Brand and the pet store in separate categories', () => {
    expect(MODULE_CATEGORY.ecommBrandTypeDefs).toBe('partner-brand');
    expect(MODULE_CATEGORY.productOrderTypeDefs).toBe('partner-brand');
    expect(MODULE_CATEGORY.storeTypeDefs).toBe('ecomm-store');
    expect(MODULE_CATEGORY.storeAdminTypeDefs).toBe('ecomm-store');
  });

  it('puts at least one module in every category, so no category is an empty shelf', () => {
    const used = new Set<string>();
    for (const category of Object.values(MODULE_CATEGORY)) if (category) used.add(category);
    expect([...CATEGORY_KEYS].filter((key) => !used.has(key) && !REMOTE_CATEGORIES.has(key))).toEqual([]);
  });

  it('files no module under a remote category (its tools come from that product’s own API)', () => {
    expect([...REMOTE_CATEGORIES]).toEqual(['lite']);
    expect(Object.values(MODULE_CATEGORY).filter((category) => category !== null && REMOTE_CATEGORIES.has(category))).toEqual([]);
  });
});

describe('categoryLabel', () => {
  it('returns the label of a known category', () => {
    expect(categoryLabel('pods')).toBe('Pods');
    expect(categoryLabel('partner-brand')).toBe('Partner brands');
    expect(categoryLabel('mcp')).toBe('MCP');
  });

  it('falls back to the key itself for an unknown category', () => {
    expect(categoryLabel('unknown')).toBe('unknown');
    expect(categoryLabel('')).toBe('');
  });
});
