import { localizationResolvers } from '../../localization.resolver';
import { localizationService } from '../../localization.service';
import { aiTranslateService } from '../../aiTranslate.service';
import { EMAIL_FALLBACK } from '@services/email/email-i18n';
import { makeContext } from '@test/harness';

jest.mock('../../localization.service', () => ({
  localizationService: {
    listLocales: jest.fn(), listPublicLocales: jest.fn(), publicTranslations: jest.fn(), translationsTable: jest.fn(), translationGroups: jest.fn(),
    upsertLocale: jest.fn(), deleteLocale: jest.fn(), upsertTranslation: jest.fn(), deleteTranslation: jest.fn(), importTranslationKeys: jest.fn(),
  },
}));
jest.mock('../../aiTranslate.service', () => ({ aiTranslateService: { coverage: jest.fn(), pending: jest.fn(), start: jest.fn() } }));

const svc = localizationService as unknown as Record<string, jest.Mock>;
const ai = aiTranslateService as unknown as Record<string, jest.Mock>;
const Q = localizationResolvers.Query as Record<string, (...a: any[]) => any>;
const M = localizationResolvers.Mutation as Record<string, (...a: any[]) => any>;
const manager = makeContext({ id: 'l1', roles: ['LOCALIZATION_MANAGER'] });
const support = makeContext({ id: 's1', roles: ['SUPPORT_USER'] });
const member = makeContext({ id: 'm1', roles: ['USER'] });

beforeEach(() => jest.clearAllMocks());

describe('reads', () => {
  it('serve the public ones to anyone, and the admin ones to the console roles', async () => {
    await Q.publicLocales();
    await Q.publicTranslations({}, { locale: 'hi' });
    expect(svc.listPublicLocales).toHaveBeenCalledTimes(1);
    expect(svc.publicTranslations).toHaveBeenCalledWith('hi');
    await Q.locales({}, {}, support);
    await Q.translationsTable({}, { query: { page: 2 } }, manager);
    await Q.translationGroups({}, { query: null }, support);
    await Q.localeCoverage({}, {}, manager);
    await Q.aiTranslationPending({}, { input: { scope: 'MISSING' } }, manager);
    expect(svc.listLocales).toHaveBeenCalledTimes(1);
    expect(svc.translationsTable).toHaveBeenCalledWith({ page: 2 });
    expect(svc.translationGroups).toHaveBeenCalledWith(null);
    expect(ai.coverage).toHaveBeenCalledTimes(1);
    expect(ai.pending).toHaveBeenCalledWith({ scope: 'MISSING' });
  });

  it('list the server’s own email copy for the import, as key and value', async () => {
    const seed = await Q.serverTranslationSeed({}, {}, manager);
    expect(seed).toHaveLength(Object.keys(EMAIL_FALLBACK).length);
    expect(seed[0]).toEqual({ key: Object.keys(EMAIL_FALLBACK)[0], value: Object.values(EMAIL_FALLBACK)[0] });
  });

  it('refuse a member, and a signed-out caller', async () => {
    for (const name of ['locales', 'translationsTable', 'translationGroups', 'serverTranslationSeed', 'localeCoverage', 'aiTranslationPending']) {
      await expect(Q[name]({}, { input: {} }, member)).rejects.toThrow(/access denied/i);
      await expect(Q[name]({}, { input: {} }, makeContext(null))).rejects.toThrow();
    }
  });
});

describe('writes', () => {
  it('reach their services for the languages and platform owners, and start AI translation as the signed-in user', async () => {
    await M.upsertLocale({}, { input: { code: 'hi' } }, manager);
    await M.deleteLocale({}, { code: 'hi' }, manager);
    await M.upsertTranslation({}, { input: { key: 'k' } }, manager);
    await M.deleteTranslation({}, { key: 'k' }, manager);
    await M.importTranslationKeys({}, { locale: 'en', entries: [{ key: 'k', value: 'v' }] }, manager);
    await M.startAiTranslation({}, { input: { scope: 'ALL' }, url: 'https://x/y' }, manager);
    expect(svc.upsertLocale).toHaveBeenCalledWith({ code: 'hi' });
    expect(svc.deleteLocale).toHaveBeenCalledWith('hi');
    expect(svc.upsertTranslation).toHaveBeenCalledWith({ key: 'k' });
    expect(svc.deleteTranslation).toHaveBeenCalledWith('k');
    expect(svc.importTranslationKeys).toHaveBeenCalledWith('en', [{ key: 'k', value: 'v' }]);
    expect(ai.start).toHaveBeenCalledWith(expect.objectContaining({ id: 'l1' }), { scope: 'ALL' }, 'https://x/y');
  });

  it('refuse support staff, who may read the catalogue but not change it', async () => {
    await expect(M.upsertLocale({}, { input: {} }, support)).rejects.toThrow(/access denied/i);
    await expect(M.deleteLocale({}, { code: 'x' }, support)).rejects.toThrow(/access denied/i);
    await expect(M.upsertTranslation({}, { input: {} }, support)).rejects.toThrow(/access denied/i);
    await expect(M.deleteTranslation({}, { key: 'k' }, support)).rejects.toThrow(/access denied/i);
    await expect(M.importTranslationKeys({}, { locale: 'en', entries: [] }, support)).rejects.toThrow(/access denied/i);
    await expect(Promise.resolve().then(() => M.startAiTranslation({}, { input: {} }, support))).rejects.toThrow(/access denied/i);
    expect(svc.upsertLocale).not.toHaveBeenCalled();
  });
});
