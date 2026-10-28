import { describe, expect, it } from 'vitest';
import { LiteLocaleModel, LiteTranslationModel } from '../../models/locale.model';
import { localizationService } from '../../services/localization.service';
import { apiError, badInputError } from '../helpers/expect';
import { withTestDatabase } from '../helpers/mongo';

withTestDatabase();

const hindi = { code: 'hi-IN', label: 'हिन्दी', english_label: 'Hindi' };

describe('localizationService.seed', () => {
  it('creates English (India) as the default locale on an empty database, once', async () => {
    await localizationService.seed();
    await localizationService.seed();
    const locales = await LiteLocaleModel.find({}).lean();
    expect(locales).toHaveLength(1);
    expect(locales[0]).toMatchObject({ code: 'en-IN', is_default: true, is_active: true });
  });

  it('leaves existing locales alone', async () => {
    await LiteLocaleModel.create({ ...hindi, is_default: true });
    await localizationService.seed();
    expect(await LiteLocaleModel.countDocuments({})).toBe(1);
  });
});

describe('localizationService.defaultCode', () => {
  it('answers the default locale, or en-IN when none is marked', async () => {
    await expect(localizationService.defaultCode()).resolves.toBe('en-IN');
    await LiteLocaleModel.create({ ...hindi, is_default: true });
    await expect(localizationService.defaultCode()).resolves.toBe('hi-IN');
  });
});

describe('localizationService.upsertLocale', () => {
  it('adds a locale and reports how many strings it has', async () => {
    await localizationService.seed();
    await LiteTranslationModel.create({ locale: 'hi-IN', key: 'web.home.title', value: 'खोजें' });
    await LiteTranslationModel.create({ locale: 'hi-IN', key: 'web.home.blank', value: '' });

    const locale = await localizationService.upsertLocale({ ...hindi, sort_order: 2.9, is_rtl: false });

    expect(locale).toMatchObject({ code: 'hi-IN', label: 'हिन्दी', english_label: 'Hindi', sort_order: 2, is_default: false, is_active: true, translated_count: 1 });
  });

  it('makes a new default the only default, and active', async () => {
    await localizationService.seed();
    await localizationService.upsertLocale({ ...hindi, is_default: true, is_active: false });
    const locales = await localizationService.locales();
    expect(locales.filter((l) => l.is_default).map((l) => l.code)).toEqual(['hi-IN']);
    expect(locales.find((l) => l.code === 'hi-IN')?.is_active).toBe(true);
  });

  it('updates an existing locale in place', async () => {
    await localizationService.upsertLocale(hindi);
    await localizationService.upsertLocale({ ...hindi, label: 'Hindi (India)', is_active: false });
    const locales = await localizationService.locales();
    expect(locales).toHaveLength(1);
    expect(locales[0]).toMatchObject({ label: 'Hindi (India)', is_active: false });
  });

  it('refuses a malformed code and blank labels', async () => {
    await expect(localizationService.upsertLocale({ ...hindi, code: 'Hindi' })).rejects.toMatchObject(badInputError('A locale code looks like hi-IN or en'));
    await expect(localizationService.upsertLocale({ ...hindi, code: '' })).rejects.toMatchObject(badInputError('Code is required'));
    await expect(localizationService.upsertLocale({ ...hindi, label: ' ' })).rejects.toMatchObject(badInputError('Label is required'));
  });
});

describe('localizationService reads', () => {
  it('lists active locales in order', async () => {
    await localizationService.seed();
    await localizationService.upsertLocale({ ...hindi, sort_order: 1 });
    await localizationService.upsertLocale({ code: 'ta', label: 'தமிழ்', english_label: 'Tamil', sort_order: 1, is_active: false });
    const locales = await localizationService.publicLocales();
    expect(locales.map((l) => l.code)).toEqual(['en-IN', 'hi-IN']);
    expect(locales[1]).toEqual({ code: 'hi-IN', label: 'हिन्दी', english_label: 'Hindi', is_rtl: false, is_default: false, sort_order: 1 });
  });

  it("layers a locale's strings over the default's, ignoring blanks", async () => {
    await localizationService.seed();
    await localizationService.upsertLocale(hindi);
    await LiteTranslationModel.create({ locale: 'en-IN', key: 'web.cta', value: 'Register' });
    await LiteTranslationModel.create({ locale: 'en-IN', key: 'web.title', value: 'Discover' });
    await LiteTranslationModel.create({ locale: 'hi-IN', key: 'web.cta', value: 'पंजीकरण' });
    await LiteTranslationModel.create({ locale: 'hi-IN', key: 'web.title', value: '' });

    const hi = await localizationService.publicTranslations('hi-IN');
    expect(Object.fromEntries(hi.map((t) => [t.key, t.value]))).toEqual({ 'web.cta': 'पंजीकरण', 'web.title': 'Discover' });
    const en = await localizationService.publicTranslations('en-IN');
    expect(Object.fromEntries(en.map((t) => [t.key, t.value]))).toEqual({ 'web.cta': 'Register', 'web.title': 'Discover' });
  });
});

describe('translations', () => {
  it('writes entries for a known locale and counts them', async () => {
    await localizationService.upsertLocale(hindi);
    await expect(localizationService.setTranslations('hi-IN', [{ key: ' web.cta ', value: ' पंजीकरण ' }, { key: 'web.title', value: 'खोजें' }])).resolves.toBe(2);
    const row = await LiteTranslationModel.findOne({ locale: 'hi-IN', key: 'web.cta' }).lean();
    expect(row?.value).toBe('पंजीकरण');
    await expect(localizationService.setTranslations('hi-IN', [{ key: 'web.cta', value: 'नया' }])).resolves.toBe(1);
    expect(await LiteTranslationModel.countDocuments({ locale: 'hi-IN' })).toBe(2);
  });

  it('refuses an unknown locale and a blank key', async () => {
    await expect(localizationService.setTranslations('fr-FR', [{ key: 'a', value: 'b' }])).rejects.toMatchObject(apiError('NOT_FOUND', 'Locale could not be found'));
    await localizationService.upsertLocale(hindi);
    await expect(localizationService.setTranslations('hi-IN', [{ key: ' ', value: 'b' }])).rejects.toMatchObject(badInputError('Key is required'));
  });

  it('pages a locale’s translations for the console, searchable', async () => {
    await localizationService.upsertLocale(hindi);
    await localizationService.setTranslations('hi-IN', [
      { key: 'web.b', value: 'दो' },
      { key: 'web.a', value: 'एक' },
      { key: 'portal.c', value: 'तीन' },
    ]);
    const page = await localizationService.translationsTable('hi-IN', { search: 'web.' });
    expect(page.rows.map((r) => r.key)).toEqual(['web.a', 'web.b']);
    expect(page.rows[0]).toMatchObject({ locale: 'hi-IN', value: 'एक', updated_at: expect.any(String) });
    await expect(localizationService.translationsTable('fr-FR', null)).rejects.toMatchObject(apiError('NOT_FOUND', 'Locale could not be found'));
  });

  it('deletes one translation', async () => {
    await localizationService.upsertLocale(hindi);
    await localizationService.setTranslations('hi-IN', [{ key: 'web.a', value: 'एक' }]);
    const row = await LiteTranslationModel.findOne({ key: 'web.a' }).lean();
    await expect(localizationService.deleteTranslation(String(row?._id))).resolves.toBe(true);
    await expect(localizationService.deleteTranslation(String(row?._id))).resolves.toBe(false);
  });

  it('seeds shipped keys into the default locale without overwriting edits', async () => {
    await localizationService.seed();
    await LiteTranslationModel.create({ locale: 'en-IN', key: 'web.cta', value: 'Edited by an admin' });
    await expect(localizationService.importKeys([{ key: 'web.cta', value: 'Register' }, { key: 'web.title', value: 'Discover' }])).resolves.toEqual({ created: 1, skipped: 1 });
    expect((await LiteTranslationModel.findOne({ key: 'web.cta' }).lean())?.value).toBe('Edited by an admin');
  });
});

describe('localizationService.deleteLocale', () => {
  it('deletes a locale with its strings, never the default', async () => {
    await localizationService.seed();
    await localizationService.upsertLocale(hindi);
    await localizationService.setTranslations('hi-IN', [{ key: 'web.a', value: 'एक' }]);
    await expect(localizationService.deleteLocale('en-IN')).rejects.toMatchObject(badInputError('The default locale cannot be deleted'));
    await expect(localizationService.deleteLocale('hi-IN')).resolves.toBe(true);
    expect(await LiteTranslationModel.countDocuments({ locale: 'hi-IN' })).toBe(0);
    await expect(localizationService.deleteLocale('hi-IN')).resolves.toBe(false);
  });
});
