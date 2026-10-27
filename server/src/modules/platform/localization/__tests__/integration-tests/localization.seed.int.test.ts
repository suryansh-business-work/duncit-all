/**
 * What boot does to the catalogue, against a real database and with the copy
 * the platform ships swapped for a small known set: it puts every shipped key
 * in the store without touching what is already there, and moves rows still
 * carrying the English the code USED to ship — and only those — to what it
 * ships now.
 */
jest.mock('../../shipped-keys', () => ({ SHIPPED_CLIENT_KEYS: { 'mweb.alpha.one': 'One', 'mweb.alpha.two': 'Two' } }));
jest.mock('@services/email/email-i18n', () => ({ EMAIL_FALLBACK: { 'email.welcome.subject': 'Welcome' } }));
jest.mock('../../copy-revisions', () => ({
  COPY_REVISIONS: {
    'mweb.alpha.one': ['Old one', 'Older one'],
    'mweb.alpha.two': ['Old two'],
    'mweb.retired.key': ['Gone'],
  },
}));

import { LocaleModel, TranslationModel } from '../../localization.model';
import { localizationService as service } from '../../localization.service';

const texts = async () => Object.fromEntries((await TranslationModel.find().lean()).map((d) => [d.key, d.values as unknown as Record<string, string>]));

describe('seedDefaults', () => {
  it('creates the source language on a fresh store and every shipped key in it', async () => {
    await expect(service.seedDefaults()).resolves.toBe(3);
    expect(await LocaleModel.findOne({ code: 'en' }).lean()).toMatchObject({ label: 'English', english_label: 'English', is_active: true, is_default: true });
    expect(await texts()).toEqual({ 'mweb.alpha.one': { en: 'One' }, 'mweb.alpha.two': { en: 'Two' }, 'email.welcome.subject': { en: 'Welcome' } });
  });

  it('writes against the store’s own source language and leaves existing keys exactly as they are', async () => {
    await LocaleModel.create({ code: 'en-IN', label: 'English (India)', is_default: true });
    await TranslationModel.create({ key: 'mweb.alpha.one', surface: 'mweb', page: 'alpha', values: { 'en-IN': 'My own wording', hi: 'एक' } });
    await expect(service.seedDefaults()).resolves.toBe(2);
    expect(await LocaleModel.countDocuments()).toBe(1);
    const stored = await texts();
    expect(stored['mweb.alpha.one']).toEqual({ 'en-IN': 'My own wording', hi: 'एक' });
    expect(stored['mweb.alpha.two']).toEqual({ 'en-IN': 'Two' });
    await expect(service.seedDefaults()).resolves.toBe(0);
  });
});

describe('reviseShippedCopy', () => {
  beforeEach(async () => {
    await LocaleModel.create({ code: 'en', label: 'English', is_default: true });
  });

  it('moves a row still carrying an old shipped wording to the current one, in the source language only', async () => {
    await TranslationModel.create({ key: 'mweb.alpha.one', surface: 'mweb', page: 'alpha', values: { en: 'Older one', hi: 'पुराना' } });
    await TranslationModel.create({ key: 'mweb.alpha.two', surface: 'mweb', page: 'alpha', values: { en: 'Old two' } });
    await expect(service.reviseShippedCopy()).resolves.toBe(2);
    const stored = await texts();
    expect(stored['mweb.alpha.one']).toEqual({ en: 'One', hi: 'पुराना' });
    expect(stored['mweb.alpha.two']).toEqual({ en: 'Two' });
  });

  it('leaves an operator’s own edit alone, a key the code no longer ships, and what is already current', async () => {
    await TranslationModel.create({ key: 'mweb.alpha.one', surface: 'mweb', page: 'alpha', values: { en: 'Edited by Support' } });
    await TranslationModel.create({ key: 'mweb.alpha.two', surface: 'mweb', page: 'alpha', values: { en: 'Two' } });
    await TranslationModel.create({ key: 'mweb.retired.key', surface: 'mweb', page: 'retired', values: { en: 'Gone' } });
    await expect(service.reviseShippedCopy()).resolves.toBe(0);
    const stored = await texts();
    expect(stored['mweb.alpha.one']).toEqual({ en: 'Edited by Support' });
    expect(stored['mweb.retired.key']).toEqual({ en: 'Gone' });
  });

  it('does nothing when there is no source language, or its code is not one it can write a path from', async () => {
    await LocaleModel.deleteMany({});
    await expect(service.reviseShippedCopy()).resolves.toBe(0);
    await LocaleModel.create({ code: 'not a locale!', label: 'Odd', is_default: true });
    await expect(service.reviseShippedCopy()).resolves.toBe(0);
  });
});
