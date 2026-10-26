/**
 * The translation catalogue's remaining corners, against a real database:
 * what a client is served (own text, then the source language's), how the
 * source language is chosen, what a save stamps as in sync, the namespace
 * counts, and which keys each AI-translation scope would send.
 */
import { TranslationModel, LocaleModel, keySegments } from '../../localization.model';
import { localizationService as service } from '../../localization.service';
import { outdatedFilter, pendingFilter } from '../../aiTranslate.scope';

const locale = (over: Record<string, unknown> = {}) => LocaleModel.create({ code: 'en', label: 'English', ...over });
const key = (k: string, values: Record<string, string>, extra: Record<string, unknown> = {}) =>
  TranslationModel.create({ key: k, surface: k.split('.')[0], page: k.split('.')[1] ?? '', values, ...extra });
const texts = (entries: Array<{ key: string; value: string }>) => Object.fromEntries(entries.map((e) => [e.key, e.value]));

describe('keySegments', () => {
  it('splits a key into its surface and page, with blanks for what is missing', () => {
    expect(keySegments('mweb.shop.emptyState')).toEqual({ surface: 'mweb', page: 'shop' });
    expect(keySegments('mweb')).toEqual({ surface: 'mweb', page: '' });
    expect(keySegments('')).toEqual({ surface: '', page: '' });
    expect(keySegments('..a..b.')).toEqual({ surface: 'a', page: 'b' });
  });
});

describe('the source language', () => {
  it('is null when no language is active', async () => {
    await expect(service.defaultLocaleCode()).resolves.toBeNull();
    await locale({ is_active: false });
    await expect(service.defaultLocaleCode()).resolves.toBeNull();
  });

  it('is the one marked default, else the first active by order', async () => {
    await locale({ code: 'hi', label: 'Hindi', sort_order: 2 });
    await locale({ code: 'en', label: 'English', sort_order: 1 });
    await expect(service.defaultLocaleCode()).resolves.toBe('en');
    await LocaleModel.updateOne({ code: 'hi' }, { $set: { is_default: true } });
    await expect(service.defaultLocaleCode()).resolves.toBe('hi');
  });
});

describe('what a client is served', () => {
  beforeEach(async () => {
    await locale({ is_default: true });
    await locale({ code: 'hi', label: 'हिन्दी' });
  });

  it('gives own text first, then the source language’s, and drops what has no text anywhere', async () => {
    await key('mweb.a', { en: 'One', hi: 'एक' });
    await key('mweb.b', { en: 'Two' });
    await key('mweb.c', { hi: 'सिर्फ हिंदी' });
    await key('mweb.d', { en: '   ', hi: ' ' });
    await key('mweb.e', { en: 'Five', hi: '   ' });
    expect(texts(await service.publicTranslations('hi'))).toEqual({ 'mweb.a': 'एक', 'mweb.b': 'Two', 'mweb.c': 'सिर्फ हिंदी', 'mweb.e': 'Five' });
    expect(texts(await service.publicTranslations(' en '))).toEqual({ 'mweb.a': 'One', 'mweb.b': 'Two', 'mweb.e': 'Five' });
  });

  it('reads a key written outside the app with no values at all as having no text', async () => {
    await TranslationModel.collection.insertOne({ key: 'legacy.nothing' });
    await key('mweb.a', { en: 'One' });
    expect(texts(await service.publicTranslations('hi'))).toEqual({ 'mweb.a': 'One' });
  });

  it('serves only the source language for a code that is not a locale, and refuses a blank one', async () => {
    await key('mweb.a', { en: 'One', hi: 'एक' });
    expect(texts(await service.publicTranslations('not a locale!'))).toEqual({ 'mweb.a': 'One' });
    await expect(service.publicTranslations('  ')).rejects.toMatchObject({ message: 'A locale code is required', extensions: { code: 'BAD_USER_INPUT' } });
  });

  it('serves a locale’s own text when there is no source language to fall back on', async () => {
    await LocaleModel.deleteMany({});
    await key('mweb.a', { en: 'One', hi: 'एक' });
    expect(texts(await service.publicTranslations('hi'))).toEqual({ 'mweb.a': 'एक' });
  });
});

describe('locales', () => {
  it('reads the optional fields as blank and zero, and the switches as the defaults', async () => {
    const out = await service.upsertLocale({ code: ' hi ', label: ' हिन्दी ', english_label: null, sort_order: null, is_rtl: null, is_active: null });
    expect(out).toMatchObject({ code: 'hi', label: 'हिन्दी', english_label: '', sort_order: 0, is_rtl: false, is_active: true, is_default: false });
    expect(out.updated_at).toEqual(expect.any(String));
    const edited = await service.upsertLocale({ code: 'hi', label: 'हिन्दी', english_label: ' Hindi ', sort_order: 3, is_rtl: true });
    expect(edited).toMatchObject({ english_label: 'Hindi', sort_order: 3, is_rtl: true });
  });

  it('lists all of them, and only the active ones publicly, in order', async () => {
    await locale({ code: 'b', label: 'B', sort_order: 2 });
    await locale({ code: 'a', label: 'A', sort_order: 1, is_active: false });
    await locale({ code: 'c', label: 'C', sort_order: 2 });
    expect((await service.listLocales()).map((l) => l.code)).toEqual(['a', 'b', 'c']);
    expect((await service.listPublicLocales()).map((l) => l.code)).toEqual(['b', 'c']);
  });

  it('says false deleting one that is not there, and removes a language’s text and sync records when it goes', async () => {
    await expect(service.deleteLocale('nope')).resolves.toBe(false);
    await locale({ is_default: true });
    await locale({ code: 'hi', label: 'हिन्दी' });
    await key('mweb.a', { en: 'One', hi: 'एक' }, { synced_from: { hi: 'One' } });
    await expect(service.deleteLocale(' hi ')).resolves.toBe(true);
    const doc = await TranslationModel.findOne({ key: 'mweb.a' }).lean();
    expect(doc?.values).toEqual({ en: 'One' });
    expect(doc?.synced_from).toEqual({});
  });
});

describe('saving a translation', () => {
  it('refuses a blank key, and ignores a blank locale among the values', async () => {
    await expect(service.upsertTranslation({ key: '   ' })).rejects.toMatchObject({ message: 'A translation key is required' });
    const out = await service.upsertTranslation({ key: 'mweb.x', values: [{ locale: ' ', value: 'ignored' }, { locale: 'en', value: 'Hello' }] });
    expect(out.values).toEqual([{ key: 'en', value: 'Hello' }]);
  });

  it('sets the description only when one is given, and derives surface and page', async () => {
    await service.upsertTranslation({ key: 'mweb.shop.empty', description: 'Empty basket text' });
    await service.upsertTranslation({ key: 'mweb.shop.empty', description: null, values: null });
    const out = await service.upsertTranslation({ key: 'mweb.shop.empty' });
    expect(out).toMatchObject({ surface: 'mweb', page: 'shop', description: 'Empty basket text', values: [] });
    expect(out.updated_at).toEqual(expect.any(String));
  });

  it('stamps what a language was written against, only for the languages that changed, and never for the source itself', async () => {
    await locale({ is_default: true });
    await locale({ code: 'hi', label: 'हिन्दी' });
    await locale({ code: 'fr', label: 'Français' });
    await service.upsertTranslation({ key: 'mweb.a', values: [{ locale: 'en', value: 'Hello' }, { locale: 'hi', value: 'नमस्ते' }, { locale: 'fr', value: '  ' }] });
    let doc = await TranslationModel.findOne({ key: 'mweb.a' }).lean();
    expect(doc?.synced_from).toEqual({ hi: 'Hello' });
    // Only the English is fixed: the others are sent back unchanged and keep their record.
    await service.upsertTranslation({ key: 'mweb.a', values: [{ locale: 'en', value: 'Hello there' }, { locale: 'hi', value: 'नमस्ते' }] });
    doc = await TranslationModel.findOne({ key: 'mweb.a' }).lean();
    expect(doc?.synced_from).toEqual({ hi: 'Hello' });
    // Editing only Hindi is written against the English as it stands.
    await service.upsertTranslation({ key: 'mweb.a', values: [{ locale: 'hi', value: 'नमस्कार' }] });
    expect((await TranslationModel.findOne({ key: 'mweb.a' }).lean())?.synced_from).toEqual({ hi: 'Hello there' });
  });

  it('stamps nothing when there is no source language or the source text is blank', async () => {
    await service.upsertTranslation({ key: 'mweb.a', values: [{ locale: 'hi', value: 'नमस्ते' }] });
    expect((await TranslationModel.findOne({ key: 'mweb.a' }).lean())?.synced_from).toEqual({});
    await locale({ is_default: true });
    await service.upsertTranslation({ key: 'mweb.b', values: [{ locale: 'hi', value: 'नमस्ते' }, { locale: 'en', value: '  ' }] });
    expect((await TranslationModel.findOne({ key: 'mweb.b' }).lean())?.synced_from).toEqual({});
  });

  it('says false deleting a key that is not there', async () => {
    await expect(service.deleteTranslation(' nothing ')).resolves.toBe(false);
    await key('mweb.a', { en: 'One' });
    await expect(service.deleteTranslation(' mweb.a ')).resolves.toBe(true);
  });
});

describe('importing keys', () => {
  it('refuses a blank locale, ignores blank keys and creates only the keys that are new, trimmed', async () => {
    await expect(service.importTranslationKeys('  ', [{ key: 'a', value: 'x' }])).rejects.toMatchObject({ message: 'A locale code is required' });
    await expect(service.importTranslationKeys('en', [{ key: '  ', value: 'x' }])).resolves.toBe(0);
    await key('mweb.old', { en: 'Old', hi: 'पुराना' });
    await expect(service.importTranslationKeys(' en ', [{ key: ' mweb.old ', value: 'Changed' }, { key: ' mweb.new ', value: 'New' }, { key: 'mweb.plain', value: '' }])).resolves.toBe(2);
    expect((await TranslationModel.findOne({ key: 'mweb.old' }).lean())?.values).toEqual({ en: 'Old', hi: 'पुराना' });
    expect(await TranslationModel.findOne({ key: 'mweb.new' }).lean()).toMatchObject({ surface: 'mweb', page: 'new', values: { en: 'New' } });
    await expect(service.importTranslationKeys('en', [{ key: 'mweb.new', value: 'Again' }])).resolves.toBe(0);
  });
});

describe('the translations table', () => {
  beforeEach(async () => {
    await key('mweb.a', { en: 'Apple', hi: 'सेब' });
    await key('mweb.b', { en: 'Banana', hi: 'केला' });
    await key('mweb.c', { en: 'Cherry' });
  });

  it('sorts and filters on a language’s own column', async () => {
    const desc = await service.translationsTable({ sort_by: 'value_hi', sort_dir: 'desc' } as never);
    expect(desc.rows.map((r) => r.key)).toEqual(['mweb.a', 'mweb.b', 'mweb.c']);
    const asc = await service.translationsTable({ sort_by: 'value_hi', sort_dir: 'asc' } as never);
    expect(asc.rows.map((r) => r.key)).toEqual(['mweb.c', 'mweb.b', 'mweb.a']);
    const filtered = await service.translationsTable({ filters: [{ field: 'value_en', op: 'contains', value: 'an' }] } as never);
    expect(filtered.rows.map((r) => r.key)).toEqual(['mweb.b']);
  });

  it('ignores a column that names no usable language, rather than reading a path from it', async () => {
    const page = await service.translationsTable({ sort_by: 'value_', filters: [{ field: 'value_$where', op: 'contains', value: 'x' }, { field: 'value_a b', op: 'contains', value: 'x' }] } as never);
    expect(page.total).toBe(3);
    expect((await service.translationsTable()).total).toBe(3);
  });
});

describe('the namespace table', () => {
  it('counts each active language’s filled keys per surface and page, blank text not counted', async () => {
    await locale({ is_default: true, sort_order: 1 });
    await locale({ code: 'hi', label: 'हिन्दी', sort_order: 2 });
    await locale({ code: 'fr', label: 'Français', sort_order: 3, is_active: false });
    await key('mweb.shop.a', { en: 'A', hi: 'ए', fr: 'a' });
    await key('mweb.shop.b', { en: 'B', hi: '  ' });
    await key('portal.home.c', { en: 'C' });
    await TranslationModel.collection.insertOne({ key: 'loose' });
    const page = await service.translationGroups({ sort_by: 'translated_hi', sort_dir: 'desc' } as never);
    expect(page.rows.find((r) => r.id === 'mweb.shop')).toMatchObject({ key_count: 2, locales: [{ locale: 'en', translated: 2 }, { locale: 'hi', translated: 1 }], translated_hi: 1 });
    expect(page.rows.find((r) => r.id === 'portal.home')).toMatchObject({ key_count: 1, translated_en: 1, translated_hi: 0 });
    expect(page.rows.find((r) => r.id === '.')).toMatchObject({ surface: '', page: '', key_count: 1 });
    expect(page.rows[0].id).toBe('mweb.shop');
    expect(page.rows.some((r) => 'translated_fr' in r)).toBe(false);
    expect((await service.translationGroups()).total).toBe(3);
  });
});

describe('which keys an AI translation run would send', () => {
  const sendable = async (filter: Record<string, unknown>) => (await TranslationModel.find(filter).lean()).map((d) => d.key).sort((a, b) => a.localeCompare(b));

  beforeEach(async () => {
    await key('mweb.shop.new', { en: 'New' });
    await key('mweb.shop.done', { en: 'Done', hi: 'हो गया' }, { synced_from: { hi: 'Done' } });
    await key('mweb.shop.stale', { en: 'Fresh english', hi: 'पुराना' }, { synced_from: { hi: 'Old english' } });
    await key('mweb.shop.unrecorded', { en: 'English', hi: 'लिखा हुआ' });
    await key('portal.home.other', { en: 'Other' });
    await key('mweb.shop.noenglish', { hi: 'सिर्फ हिंदी' });
  });

  it('MISSING sends only keys with source text and no text in the language', async () => {
    expect(await sendable(pendingFilter('en', 'hi', 'MISSING'))).toEqual(['mweb.shop.new', 'portal.home.other']);
  });

  it('OUTDATED adds the keys whose text was written against copy that has since changed, but not unrecorded ones', async () => {
    expect(await sendable(pendingFilter('en', 'hi', 'OUTDATED'))).toEqual(['mweb.shop.new', 'mweb.shop.stale', 'portal.home.other']);
  });

  it('ALL sends every key that has source text', async () => {
    expect(await sendable(pendingFilter('en', 'hi', 'ALL'))).toEqual(['mweb.shop.done', 'mweb.shop.new', 'mweb.shop.stale', 'mweb.shop.unrecorded', 'portal.home.other']);
  });

  it('narrows a run to a surface, a page, or both, ignoring blanks', async () => {
    expect(await sendable(pendingFilter('en', 'hi', 'ALL', { surface: 'portal' }))).toEqual(['portal.home.other']);
    expect(await sendable(pendingFilter('en', 'hi', 'ALL', { surface: ' mweb ', page: 'shop' }))).toHaveLength(4);
    expect(await sendable(pendingFilter('en', 'hi', 'ALL', { surface: 'mweb', page: 'nowhere' }))).toEqual([]);
    expect(await sendable(pendingFilter('en', 'hi', 'ALL', { surface: '  ', page: null }))).toHaveLength(5);
  });

  it('counts as out of date only keys that have text in the language and a record that no longer matches', async () => {
    expect(await sendable(outdatedFilter('en', 'hi'))).toEqual(['mweb.shop.stale']);
  });
});
