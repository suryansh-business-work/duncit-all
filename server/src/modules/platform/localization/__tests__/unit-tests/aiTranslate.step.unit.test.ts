import { translateNextWave, type AiTranslateParams } from '../../aiTranslate.step';
import { LocaleModel, TranslationModel } from '../../localization.model';
import { translateBatch } from '../../autoTranslate.runner';
import { BackgroundJobModel } from '@modules/platform/backgroundJob/backgroundJob.model';

jest.mock('../../localization.model', () => ({
  LocaleModel: { exists: jest.fn() },
  TranslationModel: { find: jest.fn(), bulkWrite: jest.fn() },
}));
jest.mock('../../aiTranslate.scope', () => ({
  pendingFilter: jest.fn((source: string, locale: string, scope: string) => ({ pending: `${source}>${locale}:${scope}` })),
}));
jest.mock('../../autoTranslate.runner', () => ({ BATCH_SIZE: 2, BATCH_CONCURRENCY: 2, translateBatch: jest.fn() }));
jest.mock('@modules/platform/backgroundJob/backgroundJob.model', () => ({ BackgroundJobModel: { updateOne: jest.fn() } }));

const params: AiTranslateParams = {
  locale: 'hi', source_locale: 'en', language: 'Hindi', source_language: 'English', scope: 'MISSING', surface: '', page: '',
};
const job = (over: Record<string, unknown> = {}) => ({ _id: 'j1', params, cursor: undefined, ...over }) as never;

const docs = (list: unknown[]) => {
  const chain = { sort: jest.fn(), limit: jest.fn(), select: jest.fn(), lean: jest.fn().mockResolvedValue(list) };
  chain.sort.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  (TranslationModel.find as jest.Mock).mockReturnValue(chain);
  return chain;
};
const doc = (key: string, text?: string) => ({ key, values: text === undefined ? undefined : { en: text } });
const ok = (written: { key: string; value: string }[], failed = 0) => ({ ok: true, written, failed });

beforeEach(() => {
  (LocaleModel.exists as jest.Mock).mockResolvedValue({ _id: 'l' });
});

describe('translateNextWave', () => {
  it('fails the job when the language was removed mid-run', async () => {
    (LocaleModel.exists as jest.Mock).mockResolvedValue(null);
    await expect(translateNextWave(job())).rejects.toThrow('This language was removed while it was being translated.');
    expect(TranslationModel.find).not.toHaveBeenCalled();
  });

  it('returns false when no key in scope is left', async () => {
    docs([]);
    await expect(translateNextWave(job())).resolves.toBe(false);
    expect(translateBatch).not.toHaveBeenCalled();
    expect(BackgroundJobModel.updateOne).not.toHaveBeenCalled();
  });

  it('walks keys in order from the first wave, projecting only the source text', async () => {
    const chain = docs([]);
    await translateNextWave(job());
    expect(TranslationModel.find).toHaveBeenCalledWith({ pending: 'en>hi:MISSING' });
    expect(chain.sort).toHaveBeenCalledWith({ key: 1 });
    expect(chain.limit).toHaveBeenCalledWith(4);
    expect(chain.select).toHaveBeenCalledWith({ key: 1, 'values.en': 1 });
  });

  it('resumes after the cursor key', async () => {
    docs([]);
    await translateNextWave(job({ cursor: 'k5' }));
    expect(TranslationModel.find).toHaveBeenCalledWith({ pending: 'en>hi:MISSING', key: { $gt: 'k5' } });
  });

  it('ignores a cursor that is not a string', async () => {
    docs([]);
    await translateNextWave(job({ cursor: 7 }));
    expect(TranslationModel.find).toHaveBeenCalledWith({ pending: 'en>hi:MISSING' });
  });

  it('translates in batches, writes values with the source text they came from and advances the cursor', async () => {
    docs([doc('a', ' Hello '), doc('b', 'World'), doc('c', 'Bye')]);
    (translateBatch as jest.Mock)
      .mockResolvedValueOnce(ok([{ key: 'a', value: 'नमस्ते' }, { key: 'b', value: 'दुनिया' }]))
      .mockResolvedValueOnce(ok([{ key: 'c', value: 'अलविदा' }], 0));
    await expect(translateNextWave(job())).resolves.toBe(true);

    expect(translateBatch).toHaveBeenCalledTimes(2);
    expect(translateBatch).toHaveBeenNthCalledWith(1, {
      entries: [{ key: 'a', text: 'Hello' }, { key: 'b', text: 'World' }], language: 'Hindi', languageCode: 'hi', sourceLanguage: 'English',
    });
    expect(translateBatch).toHaveBeenNthCalledWith(2, expect.objectContaining({ entries: [{ key: 'c', text: 'Bye' }] }));
    const ops = (TranslationModel.bulkWrite as jest.Mock).mock.calls[0][0];
    expect(ops).toEqual([
      { updateOne: { filter: { key: 'a' }, update: { $set: { 'values.hi': 'नमस्ते', 'synced_from.hi': 'Hello' } } } },
      { updateOne: { filter: { key: 'b' }, update: { $set: { 'values.hi': 'दुनिया', 'synced_from.hi': 'World' } } } },
      { updateOne: { filter: { key: 'c' }, update: { $set: { 'values.hi': 'अलविदा', 'synced_from.hi': 'Bye' } } } },
    ]);
    expect(BackgroundJobModel.updateOne).toHaveBeenCalledWith(
      { _id: 'j1' },
      { $inc: { succeeded: 3, failed: 0 }, $set: { cursor: 'c' }, $push: { failures: { $each: [], $slice: 20 } } }
    );
  });

  it('treats a key with no source text as empty', async () => {
    docs([doc('a'), doc('b', '  ')]);
    (translateBatch as jest.Mock).mockResolvedValue(ok([]));
    await translateNextWave(job());
    expect((translateBatch as jest.Mock).mock.calls[0][0].entries).toEqual([{ key: 'a', text: '' }, { key: 'b', text: '' }]);
  });

  it('counts a whole failed batch against the job and records its first key', async () => {
    docs([doc('a', 'A'), doc('b', 'B'), doc('c', 'C')]);
    (translateBatch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, fatal: false, message: 'rate limited' })
      .mockResolvedValueOnce(ok([{ key: 'c', value: 'सी' }], 0));
    await translateNextWave(job());
    expect(BackgroundJobModel.updateOne).toHaveBeenCalledWith(
      { _id: 'j1' },
      {
        $inc: { succeeded: 1, failed: 2 },
        $set: { cursor: 'c' },
        $push: { failures: { $each: [{ id: 'a', message: 'rate limited' }], $slice: 20 } },
      }
    );
    expect((TranslationModel.bulkWrite as jest.Mock).mock.calls[0][0]).toHaveLength(1);
  });

  it('adds the keys a successful batch could not translate to the failed count and skips an empty write', async () => {
    docs([doc('a', 'A')]);
    (translateBatch as jest.Mock).mockResolvedValue(ok([], 1));
    await expect(translateNextWave(job())).resolves.toBe(true);
    expect(TranslationModel.bulkWrite).not.toHaveBeenCalled();
    expect(BackgroundJobModel.updateOne).toHaveBeenCalledWith({ _id: 'j1' }, expect.objectContaining({ $inc: { succeeded: 0, failed: 1 } }));
  });

  it('stops the job on a fatal batch failure without writing anything', async () => {
    docs([doc('a', 'A'), doc('b', 'B'), doc('c', 'C')]);
    (translateBatch as jest.Mock)
      .mockResolvedValueOnce(ok([{ key: 'a', value: 'x' }]))
      .mockResolvedValueOnce({ ok: false, fatal: true, message: 'OPENAI_API_KEY is not configured' });
    await expect(translateNextWave(job())).rejects.toThrow('OPENAI_API_KEY is not configured');
    expect(TranslationModel.bulkWrite).not.toHaveBeenCalled();
    expect(BackgroundJobModel.updateOne).not.toHaveBeenCalled();
  });

  it('shares the in-flight request limit across jobs running at the same time', async () => {
    let active = 0;
    let peak = 0;
    const releases: Array<() => void> = [];
    (translateBatch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          active += 1;
          peak = Math.max(peak, active);
          releases.push(() => {
            active -= 1;
            resolve(ok([]));
          });
        })
    );
    // Two jobs x two batches each = four requests against a limit of two.
    docs([doc('a', 'A'), doc('b', 'B'), doc('c', 'C'), doc('d', 'D')]);
    const first = translateNextWave(job());
    const second = translateNextWave(job({ _id: 'j2' }));
    await new Promise((resolve) => setImmediate(resolve));
    expect(releases).toHaveLength(2);
    while (releases.length > 0) {
      releases.shift()?.();
      await new Promise((resolve) => setImmediate(resolve));
    }
    await Promise.all([first, second]);
    expect(peak).toBe(2);
    expect(translateBatch).toHaveBeenCalledTimes(4);
  });
});
