import { aiTranslateService } from '../../aiTranslate.service';
import { LocaleModel, TranslationModel } from '../../localization.model';
import { localizationService } from '../../localization.service';
import { BackgroundJobModel } from '@modules/platform/backgroundJob/backgroundJob.model';
import { scheduleJob } from '@modules/platform/backgroundJob/backgroundJob.runner';
import { requestIdentity } from '@observability/requestIdentity';

jest.mock('../../localization.model', () => ({
  LocaleModel: { find: jest.fn(), findOne: jest.fn() },
  TranslationModel: { countDocuments: jest.fn(), collection: { updateMany: jest.fn() } },
}));
jest.mock('../../localization.service', () => ({
  PROJECTABLE_LOCALE: /^[A-Za-z]{2,3}(?:[-_][A-Za-z\d]{2,8})*$/,
  localizationService: { defaultLocaleCode: jest.fn() },
}));
jest.mock('../../aiTranslate.scope', () => ({
  AI_TRANSLATE_SCOPES: ['MISSING', 'OUTDATED', 'ALL'],
  outdatedFilter: jest.fn((source: string, code: string) => ({ outdated: `${source}>${code}` })),
  pendingFilter: jest.fn((source: string, code: string, scope: string) => ({ pending: `${source}>${code}:${scope}` })),
}));
jest.mock('@modules/platform/backgroundJob/backgroundJob.model', () => ({
  BackgroundJobModel: { find: jest.fn(), create: jest.fn() },
}));
jest.mock('@modules/platform/backgroundJob/backgroundJob.runner', () => ({ scheduleJob: jest.fn() }));
jest.mock('@modules/platform/backgroundJob/backgroundJob.service', () => ({
  actorOf: jest.fn((user: { id: string }) => `actor:${user.id}`),
  toJob: jest.fn((job: { id: string }) => ({ id: job.id })),
}));
jest.mock('@observability/requestIdentity', () => ({ requestIdentity: { current: jest.fn() } }));

const user = { id: 'u1' } as never;
const lean = <T>(value: T) => ({ lean: () => Promise.resolve(value) });
const select = <T>(value: T) => ({ select: () => lean(value) });
const count = TranslationModel.countDocuments as jest.Mock;

const mockSource = (code: string | null) => (localizationService.defaultLocaleCode as jest.Mock).mockResolvedValue(code);
const mockLocales = (docs: unknown[]) => (LocaleModel.find as jest.Mock).mockReturnValue(lean(docs));

describe('coverage', () => {
  it('counts translated and outdated keys per active locale', async () => {
    (LocaleModel.find as jest.Mock).mockReturnValue({ sort: () => ({ select: () => lean([{ code: 'en' }, { code: 'hi' }, { code: 'bad code!' }]) }) });
    mockSource('en');
    count.mockImplementation(async (filter: Record<string, unknown>) => {
      if ('outdated' in filter) return 3;
      if (Object.keys(filter).length === 0) return 100;
      return 40;
    });
    const rows = await aiTranslateService.coverage();
    expect(rows).toEqual([
      { locale: 'en', total_keys: 100, translated_keys: 40, outdated_keys: 0 },
      { locale: 'hi', total_keys: 100, translated_keys: 40, outdated_keys: 3 },
      { locale: 'bad code!', total_keys: 100, translated_keys: 0, outdated_keys: 0 },
    ]);
    expect(count).toHaveBeenCalledWith({ 'values.hi': { $nin: ['', null] } });
    expect(LocaleModel.find).toHaveBeenCalledWith({ is_active: true });
  });

  it('reports no outdated keys when there is no default language', async () => {
    (LocaleModel.find as jest.Mock).mockReturnValue({ sort: () => ({ select: () => lean([{ code: 'hi' }]) }) });
    mockSource(null);
    count.mockResolvedValue(7);
    await expect(aiTranslateService.coverage()).resolves.toEqual([{ locale: 'hi', total_keys: 7, translated_keys: 7, outdated_keys: 0 }]);
  });
});

describe('pending', () => {
  it('quotes the number of keys per distinct target language', async () => {
    mockSource('en');
    count.mockResolvedValue(12);
    const out = await aiTranslateService.pending({ locales: ['hi', ' hi ', 'ta', ''], scope: 'MISSING' });
    expect(out).toEqual([{ locale: 'hi', keys: 12 }, { locale: 'ta', keys: 12 }]);
    expect(count).toHaveBeenCalledWith({ pending: 'en>hi:MISSING' });
  });

  it.each([
    ['no default language', null, { locales: ['hi'], scope: 'ALL' }, 'Set a default language first — it is what gets translated'],
    ['an unknown scope', 'en', { locales: ['hi'], scope: 'NOPE' }, 'Choose what to translate'],
    ['no languages', 'en', { locales: [' ', ''], scope: 'ALL' }, 'Choose at least one language'],
    ['the source language', 'en', { locales: ['en', 'hi'], scope: 'ALL' }, 'The default language is the source everything is translated from'],
    ['an unsafe code', 'en', { locales: ['hi', 'x.y'], scope: 'ALL' }, 'One of the languages has a code that cannot be translated into'],
  ])('refuses %s', async (_label, source, input, message) => {
    mockSource(source);
    await expect(aiTranslateService.pending(input as never)).rejects.toMatchObject({ message, extensions: { code: 'BAD_USER_INPUT' } });
  });
});

describe('start', () => {
  const setup = (over: { source?: unknown; targets?: unknown[]; running?: unknown[]; pending?: number } = {}) => {
    mockSource('en');
    (LocaleModel.findOne as jest.Mock).mockReturnValue(lean('source' in over ? over.source : { code: 'en', english_label: ' English ', label: 'E', }));
    (LocaleModel.find as jest.Mock).mockReturnValue(
      lean(over.targets ?? [{ code: 'hi', english_label: '', label: ' हिन्दी ' }, { code: 'ta', english_label: 'Tamil', label: 'T' }])
    );
    (BackgroundJobModel.find as jest.Mock).mockReturnValue(select(over.running ?? []));
    count.mockResolvedValue(over.pending ?? 5);
    (BackgroundJobModel.create as jest.Mock).mockImplementation(async (doc: { params: { locale: string } }) => ({ id: `job-${doc.params.locale}` }));
    (requestIdentity.current as jest.Mock).mockReturnValue(null);
  };

  it('creates one job per language with work, schedules each and returns them', async () => {
    setup();
    const out = await aiTranslateService.start(user, { locales: ['hi', 'ta'], scope: 'OUTDATED', surface: ' web ', page: ' home ' }, 'https://p/x');
    expect(out).toEqual([{ id: 'job-hi' }, { id: 'job-ta' }]);
    expect((BackgroundJobModel.create as jest.Mock).mock.calls[0][0]).toEqual({
      kind: 'AI_TRANSLATE',
      label: 'हिन्दी (hi)',
      url: 'https://p/x',
      params: { locale: 'hi', source_locale: 'en', language: 'हिन्दी', source_language: 'English', scope: 'OUTDATED', surface: 'web', page: 'home' },
      total: 5,
      actor: 'actor:u1',
      identity: { user: 'actor:u1' },
    });
    expect((BackgroundJobModel.create as jest.Mock).mock.calls[1][0].params.language).toBe('Tamil');
    expect(scheduleJob).toHaveBeenCalledWith('job-hi');
    expect(scheduleJob).toHaveBeenCalledWith('job-ta');
    expect(BackgroundJobModel.find).toHaveBeenCalledWith({ kind: 'AI_TRANSLATE', status: 'RUNNING', 'params.locale': { $in: ['hi', 'ta'] } });
  });

  it('uses the request identity, trims the url to 2000 characters and defaults surface and page', async () => {
    setup({ targets: [{ code: 'hi', label: 'Hindi' }] });
    (requestIdentity.current as jest.Mock).mockReturnValue({ user: 'from-request', ip: '1.1.1.1' });
    await aiTranslateService.start(user, { locales: ['hi'], scope: 'ALL' }, 'x'.repeat(2500));
    const arg = (BackgroundJobModel.create as jest.Mock).mock.calls[0][0];
    expect(arg.identity).toEqual({ user: 'from-request', ip: '1.1.1.1' });
    expect(arg.url).toHaveLength(2000);
    expect(arg.params).toMatchObject({ language: 'Hindi', surface: '', page: '' });
    await aiTranslateService.start(user, { locales: ['hi'], scope: 'ALL' });
    expect((BackgroundJobModel.create as jest.Mock).mock.calls[1][0].url).toBe('');
  });

  it('names a language by its code when it has no labels', async () => {
    setup({ source: { code: 'en', label: ' ' }, targets: [{ code: 'hi', label: ' ' }] });
    await aiTranslateService.start(user, { locales: ['hi'], scope: 'ALL' });
    expect((BackgroundJobModel.create as jest.Mock).mock.calls[0][0].params).toMatchObject({ language: 'hi', source_language: 'en' });
  });

  it('skips languages already in sync', async () => {
    setup();
    count.mockImplementation(async (filter: { pending: string }) => (filter.pending.includes('>hi') ? 0 : 3));
    const out = await aiTranslateService.start(user, { locales: ['hi', 'ta'], scope: 'MISSING' });
    expect(out).toEqual([{ id: 'job-ta' }]);
  });

  it('refuses a request where nothing is pending', async () => {
    setup({ pending: 0 });
    await expect(aiTranslateService.start(user, { locales: ['hi', 'ta'], scope: 'MISSING' })).rejects.toMatchObject({
      message: 'Nothing to translate — these languages are already in sync',
    });
    expect(BackgroundJobModel.create).not.toHaveBeenCalled();
    expect(scheduleJob).not.toHaveBeenCalled();
  });

  it('refuses when the default language document is missing', async () => {
    setup({ source: null });
    await expect(aiTranslateService.start(user, { locales: ['hi'], scope: 'MISSING' })).rejects.toMatchObject({ message: 'The default language is missing' });
  });

  it('refuses when a requested language no longer exists', async () => {
    setup({ targets: [{ code: 'hi', label: 'Hindi' }] });
    await expect(aiTranslateService.start(user, { locales: ['hi', 'ta'], scope: 'MISSING' })).rejects.toMatchObject({
      message: 'One of the languages is not set up any more',
    });
  });

  it('refuses a language that is already being translated, naming it', async () => {
    setup({ running: [{ params: { locale: 'hi' } }, { params: { locale: 'ta' } }] });
    await expect(aiTranslateService.start(user, { locales: ['hi', 'ta'], scope: 'MISSING' })).rejects.toMatchObject({
      message: 'A translation is already running for hi, ta — wait for it or stop it first',
    });
    expect(BackgroundJobModel.create).not.toHaveBeenCalled();
  });
});

describe('baselineSync', () => {
  const updateMany = TranslationModel.collection.updateMany as jest.Mock;

  it('stamps what each existing translation was written against and totals the changes', async () => {
    mockSource('en');
    mockLocales([{ code: 'hi' }, { code: 'bad code!' }, { code: 'ta' }]);
    (LocaleModel.find as jest.Mock).mockReturnValue(select([{ code: 'hi' }, { code: 'bad code!' }, { code: 'ta' }]));
    updateMany.mockResolvedValueOnce({ modifiedCount: 4 }).mockResolvedValueOnce({ modifiedCount: 6 });
    await expect(aiTranslateService.baselineSync()).resolves.toBe(10);
    expect(LocaleModel.find).toHaveBeenCalledWith({ code: { $ne: 'en' } });
    expect(updateMany).toHaveBeenCalledTimes(2);
    const [filter, pipeline] = updateMany.mock.calls[0];
    expect(filter).toEqual({
      'values.hi': { $nin: ['', null] },
      'values.en': { $nin: ['', null] },
      'synced_from.hi': { $exists: false },
    });
    expect(pipeline[0].$set.synced_from.$setField).toMatchObject({ field: 'hi', value: { $getField: { field: 'en', input: '$values' } } });
  });

  it.each([
    ['no default language', null],
    ['an unsafe default language code', 'en us!'],
  ])('does nothing with %s', async (_label, source) => {
    mockSource(source);
    await expect(aiTranslateService.baselineSync()).resolves.toBe(0);
    expect(updateMany).not.toHaveBeenCalled();
  });
});
