import { localizationService } from '../../localization.service';
import { localizationResolvers } from '../../localization.resolver';
import { LocaleModel, TranslationModel } from '../../localization.model';
import { EMAIL_FALLBACK } from '@services/email/email-i18n';

const seedLocales = async () => {
  await localizationService.upsertLocale({
    code: 'en-IN',
    label: 'English',
    english_label: 'English (India)',
    is_default: true,
  });
  await localizationService.upsertLocale({ code: 'hi-IN', label: 'हिन्दी', sort_order: 1 });
};

describe('localizationService — locales', () => {
  it('upserts a locale and keeps exactly one default', async () => {
    await seedLocales();
    expect((await localizationService.listLocales()).map((l) => l.code)).toEqual([
      'en-IN',
      'hi-IN',
    ]);

    // Promoting hi-IN must demote en-IN — two source languages would break the
    // fallback chain.
    await localizationService.upsertLocale({ code: 'hi-IN', label: 'हिन्दी', is_default: true });
    const locales = await localizationService.listLocales();
    expect(locales.filter((l) => l.is_default).map((l) => l.code)).toEqual(['hi-IN']);
    expect(await localizationService.defaultLocaleCode()).toBe('hi-IN');
  });

  it('hides deactivated locales from the public switcher', async () => {
    await seedLocales();
    await localizationService.upsertLocale({ code: 'hi-IN', label: 'हिन्दी', is_active: false });
    expect((await localizationService.listPublicLocales()).map((l) => l.code)).toEqual(['en-IN']);
    // Still visible to admins so it can be switched back on.
    expect((await localizationService.listLocales()).map((l) => l.code)).toContain('hi-IN');
  });

  it('rejects a blank code or label', async () => {
    await expect(localizationService.upsertLocale({ code: '  ', label: 'X' })).rejects.toThrow(
      /code is required/i,
    );
    await expect(localizationService.upsertLocale({ code: 'x', label: ' ' })).rejects.toThrow(
      /label is required/i,
    );
  });

  it('refuses to delete the default locale, and clears text when deleting others', async () => {
    await seedLocales();
    await localizationService.upsertTranslation({
      key: 'mweb.shop.title',
      values: [
        { locale: 'en-IN', value: 'Pod Shop' },
        { locale: 'hi-IN', value: 'पॉड शॉप' },
      ],
    });

    await expect(localizationService.deleteLocale('en-IN')).rejects.toThrow(/cannot be deleted/i);

    expect(await localizationService.deleteLocale('hi-IN')).toBe(true);
    // The dead language's text goes with it, so no catalogue keeps serving it.
    const doc = await TranslationModel.findOne({ key: 'mweb.shop.title' }).lean();
    expect((doc as any).values['hi-IN']).toBeUndefined();
    expect((doc as any).values['en-IN']).toBe('Pod Shop');

    expect(await localizationService.deleteLocale('nope')).toBe(false);
  });
});

describe('localizationService — translations', () => {
  it('derives surface and page from the key so the admin can filter', async () => {
    await seedLocales();
    const saved = await localizationService.upsertTranslation({
      key: 'mweb.shop.emptyState',
      description: 'Shown when filters match nothing',
      values: [{ locale: 'en-IN', value: 'No products match your filters.' }],
    });
    expect(saved.surface).toBe('mweb');
    expect(saved.page).toBe('shop');
    expect(saved.values).toEqual([{ key: 'en-IN', value: 'No products match your filters.' }]);
  });

  it('writes only the supplied locales, so editing one language keeps the others', async () => {
    await seedLocales();
    await localizationService.upsertTranslation({
      key: 'common.save',
      values: [
        { locale: 'en-IN', value: 'Save' },
        { locale: 'hi-IN', value: 'सहेजें' },
      ],
    });
    await localizationService.upsertTranslation({
      key: 'common.save',
      values: [{ locale: 'en-IN', value: 'Save changes' }],
    });
    const doc = await TranslationModel.findOne({ key: 'common.save' }).lean();
    expect((doc as any).values).toEqual({ 'en-IN': 'Save changes', 'hi-IN': 'सहेजें' });
  });

  it('rejects a blank key and deletes by key', async () => {
    await expect(localizationService.upsertTranslation({ key: '  ' })).rejects.toThrow(
      /key is required/i,
    );
    await seedLocales();
    await localizationService.upsertTranslation({ key: 'a.b', values: [] });
    expect(await localizationService.deleteTranslation('a.b')).toBe(true);
    expect(await localizationService.deleteTranslation('a.b')).toBe(false);
  });
});

describe('localizationService — publicTranslations', () => {
  it('falls back to the default locale for untranslated keys', async () => {
    await seedLocales();
    await localizationService.upsertTranslation({
      key: 'mweb.shop.title',
      values: [
        { locale: 'en-IN', value: 'Pod Shop' },
        { locale: 'hi-IN', value: 'पॉड शॉप' },
      ],
    });
    await localizationService.upsertTranslation({
      key: 'common.save',
      values: [{ locale: 'en-IN', value: 'Save' }],
    });
    // Blank counts as untranslated, not as an override that blanks the UI.
    await localizationService.upsertTranslation({
      key: 'common.cancel',
      values: [
        { locale: 'en-IN', value: 'Cancel' },
        { locale: 'hi-IN', value: '   ' },
      ],
    });

    const hi = await localizationService.publicTranslations('hi-IN');
    const byKey = Object.fromEntries(hi.map((e) => [e.key, e.value]));
    expect(byKey['mweb.shop.title']).toBe('पॉड शॉप');
    expect(byKey['common.save']).toBe('Save');
    expect(byKey['common.cancel']).toBe('Cancel');
  });

  it('requires a locale code', async () => {
    await expect(localizationService.publicTranslations('  ')).rejects.toThrow(
      /locale code is required/i,
    );
  });
});

describe('localizationService — importTranslationKeys', () => {
  it('creates only the keys that do not exist yet', async () => {
    await seedLocales();
    await localizationService.upsertTranslation({
      key: 'mweb.shop.title',
      values: [{ locale: 'en-IN', value: 'Existing' }],
    });

    const created = await localizationService.importTranslationKeys('en-IN', [
      { key: 'mweb.shop.title', value: 'Would overwrite' },
      { key: 'mweb.shop.newKey', value: 'Brand new' },
      { key: '   ', value: 'ignored' },
    ]);
    expect(created).toBe(1);

    // The existing key keeps its text — import never overwrites translations.
    const existing = await TranslationModel.findOne({ key: 'mweb.shop.title' }).lean();
    expect((existing as any).values['en-IN']).toBe('Existing');

    const fresh = await TranslationModel.findOne({ key: 'mweb.shop.newKey' }).lean();
    expect((fresh as any).values['en-IN']).toBe('Brand new');
    expect((fresh as any).surface).toBe('mweb');

    // Re-importing the same bundle is a no-op.
    expect(
      await localizationService.importTranslationKeys('en-IN', [
        { key: 'mweb.shop.newKey', value: 'x' },
      ]),
    ).toBe(0);
    expect(await localizationService.importTranslationKeys('en-IN', [])).toBe(0);
    await expect(localizationService.importTranslationKeys('  ', [])).rejects.toThrow(
      /locale code is required/i,
    );
  });
});

describe('serverTranslationSeed', () => {
  it('offers the email keys the server ships copy for', async () => {
    const ctx = { user: { roles: ['SUPER_ADMIN'] } } as any;
    const rows = await localizationResolvers.Query.serverTranslationSeed({}, {}, ctx);

    // Every entry must arrive translatable: a key AND the bundled English text.
    expect(rows.length).toBe(Object.keys(EMAIL_FALLBACK).length);
    expect(rows.every((r) => r.key.startsWith('email.') && r.value.trim() !== '')).toBe(true);

    // Feeding it straight into the importer is the admin's one-click seed.
    await seedLocales();
    expect(await localizationService.importTranslationKeys('en-IN', rows)).toBe(rows.length);
  });

  it('is admin-only', async () => {
    const ctx = { user: { roles: ['USER'] } } as any;
    await expect(
      localizationResolvers.Query.serverTranslationSeed({}, {}, ctx),
    ).rejects.toThrow();
  });
});

describe('localizationService — admin table', () => {
  it('paginates and filters portal-wise', async () => {
    await seedLocales();
    await localizationService.upsertTranslation({ key: 'mweb.shop.a', values: [] });
    await localizationService.upsertTranslation({ key: 'mweb.home.b', values: [] });
    await localizationService.upsertTranslation({ key: 'admin.settings.c', values: [] });

    const all = await localizationService.translationsTable(null);
    expect(all.total).toBe(3);
    expect(all.rows.map((r) => r.key)).toEqual(['admin.settings.c', 'mweb.home.b', 'mweb.shop.a']);

    const onlyMweb = await localizationService.translationsTable({
      filters: [{ field: 'surface', op: 'eq', value: 'mweb' }],
    });
    expect(onlyMweb.total).toBe(2);
    expect(onlyMweb.rows.every((r) => r.surface === 'mweb')).toBe(true);
  });
});

afterEach(async () => {
  await Promise.all([LocaleModel.deleteMany({}), TranslationModel.deleteMany({})]);
});
