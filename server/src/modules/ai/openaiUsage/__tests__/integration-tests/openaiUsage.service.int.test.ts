/**
 * The OpenAI usage ledger: pricing a call against the rate card, editing that
 * card, and the dashboard's roll-ups — including the fallbacks for rows the
 * catalogue no longer knows and the range clamp on the dashboard window.
 */
import { Types } from 'mongoose';
import {
  DEFAULT_MODEL_PRICES,
  OpenAiModelPriceModel,
  OpenAiUsageLogModel,
} from '../../openaiUsage.model';
import { openAiUsageService, type RecordUsageInput } from '../../openaiUsage.service';

const DAY_MS = 24 * 60 * 60 * 1000;

const call = (over: Partial<RecordUsageInput> = {}): RecordUsageInput => ({
  task: 'support.assistant',
  task_label: 'Support chat reply',
  module: 'Support',
  detail: 'ticket 42',
  model: 'gpt-test',
  status: 'SUCCESS',
  http_status: 200,
  prompt_tokens: 1000,
  completion_tokens: 500,
  total_tokens: 1500,
  duration_ms: 120,
  request_preview: 'hi',
  response_preview: 'hello',
  error_message: '',
  ...over,
});

const refused = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (err) {
    return err as { message: string; extensions?: { code?: string } };
  }
  throw new Error('expected the call to be refused');
};

beforeEach(async () => {
  // The rate card is cached in-process for a minute; an upsert is the service's
  // own way to drop that cache, so every test starts from an empty, uncached card.
  await openAiUsageService.upsertPrice({ model: 'cache-reset', input_per_1m: 0, output_per_1m: 0 });
  await OpenAiModelPriceModel.deleteMany({});
});

describe('openAiUsageService.recordUsage + rate card', () => {
  it('stores a call for a model with no rate at zero cost, flagged unpriced', async () => {
    await openAiUsageService.recordUsage(call());

    const row = await OpenAiUsageLogModel.findOne({ model: 'gpt-test' }).lean();
    expect(row).toMatchObject({ cost_usd: 0, priced: false, task: 'support.assistant', total_tokens: 1500 });
  });

  it('prices the next call as soon as a rate is added, without waiting for the cache', async () => {
    await openAiUsageService.recordUsage(call({ detail: 'before' }));
    await openAiUsageService.upsertPrice({ model: '  gpt-test  ', input_per_1m: 2, output_per_1m: 8 });
    await openAiUsageService.recordUsage(call({ detail: 'after' }));

    const before = await OpenAiUsageLogModel.findOne({ detail: 'before' }).lean();
    const after = await OpenAiUsageLogModel.findOne({ detail: 'after' }).lean();
    expect(before).toMatchObject({ cost_usd: 0, priced: false });
    // 1000 in at $2/1M + 500 out at $8/1M.
    expect(after?.priced).toBe(true);
    expect(after?.cost_usd).toBeCloseTo(0.006, 6);
  });

  it('seeds the default rates and prices the next call against them', async () => {
    const seeded = DEFAULT_MODEL_PRICES.find((p) => p.model === 'gpt-4o-mini');
    await openAiUsageService.recordUsage(call({ model: 'gpt-4o-mini', detail: 'before' }));

    await openAiUsageService.seedDefaults();
    await openAiUsageService.recordUsage(call({ model: 'gpt-4o-mini', detail: 'after' }));

    expect(await OpenAiModelPriceModel.countDocuments()).toBe(DEFAULT_MODEL_PRICES.length);
    expect((await OpenAiUsageLogModel.findOne({ detail: 'before' }).lean())?.priced).toBe(false);
    const after = await OpenAiUsageLogModel.findOne({ detail: 'after' }).lean();
    expect(after?.priced).toBe(true);
    expect(after?.cost_usd).toBeCloseTo(
      (1000 / 1e6) * (seeded?.input_per_1m ?? NaN) + (500 / 1e6) * (seeded?.output_per_1m ?? NaN),
      6,
    );
  });
});

describe('openAiUsageService.upsertPrice', () => {
  it('trims the model name and updates the existing row in place', async () => {
    const created = await openAiUsageService.upsertPrice({ model: ' gpt-x ', input_per_1m: 1, output_per_1m: 2 });
    const updated = await openAiUsageService.upsertPrice({ model: 'gpt-x', input_per_1m: 3, output_per_1m: 4 });

    expect(created).toMatchObject({ model: 'gpt-x', input_per_1m: 1, output_per_1m: 2 });
    expect(updated).toMatchObject({ id: created.id, model: 'gpt-x', input_per_1m: 3, output_per_1m: 4 });
    expect(await OpenAiModelPriceModel.countDocuments()).toBe(1);
    await expect(openAiUsageService.prices()).resolves.toEqual([expect.objectContaining({ model: 'gpt-x' })]);
  });

  it('refuses a blank model name', async () => {
    const error = await refused(openAiUsageService.upsertPrice({ model: '   ', input_per_1m: 1, output_per_1m: 1 }));

    expect(error).toMatchObject({ message: 'Model is required', extensions: { code: 'BAD_USER_INPUT' } });
    expect(await OpenAiModelPriceModel.countDocuments()).toBe(0);
  });

  it.each([
    { input_per_1m: -0.01, output_per_1m: 1 },
    { input_per_1m: 1, output_per_1m: -5 },
  ])('refuses a negative rate (%o)', async (rates) => {
    const error = await refused(openAiUsageService.upsertPrice({ model: 'gpt-x', ...rates }));

    expect(error).toMatchObject({ message: 'Rates cannot be negative', extensions: { code: 'BAD_USER_INPUT' } });
    expect(await OpenAiModelPriceModel.countDocuments()).toBe(0);
  });
});

describe('openAiUsageService.log', () => {
  it('returns one call by id, and null for an id that is not in the ledger', async () => {
    const [row] = await OpenAiUsageLogModel.create([{ task: 'support.assistant', status: 'FAILED', error_message: 'boom' }]);

    await expect(openAiUsageService.log(String(row._id))).resolves.toMatchObject({
      id: String(row._id),
      task: 'support.assistant',
      status: 'FAILED',
      error_message: 'boom',
      user_id: null,
    });
    await expect(openAiUsageService.log(String(new Types.ObjectId()))).resolves.toBeNull();
  });
});

describe('openAiUsageService.dashboard', () => {
  const seedLedger = async () => {
    await OpenAiUsageLogModel.create([
      {
        task: 'moderation.pod',
        task_label: '',
        module: 'Moderation',
        model: 'gpt-4o-mini',
        status: 'SUCCESS',
        total_tokens: 1000,
        cost_usd: 0.5,
        priced: true,
        duration_ms: 100,
      },
      {
        task: 'moderation.pod',
        task_label: '',
        module: 'Moderation',
        model: 'gpt-4o-mini',
        status: 'FAILED',
        total_tokens: 0,
        cost_usd: 0,
        priced: true,
        duration_ms: 300,
      },
      // A task since removed from the catalogue, with no label and no module.
      {
        task: 'legacy.removed',
        task_label: '',
        module: '',
        model: 'mystery-model',
        status: 'SKIPPED',
        total_tokens: 50,
        cost_usd: 0,
        priced: false,
        duration_ms: 0,
      },
    ]);
    const now = new Date();
    // Legacy rows written before duration was recorded, one in range, one long ago.
    await OpenAiUsageLogModel.collection.insertMany([
      {
        task: 'support.assistant',
        task_label: 'Support reply',
        module: 'Support',
        model: 'gpt-4o',
        status: 'SUCCESS',
        total_tokens: 10,
        cost_usd: 0.25,
        priced: true,
        created_at: now,
        updated_at: now,
      },
      {
        task: 'moderation.pod',
        task_label: '',
        module: 'Moderation',
        model: 'gpt-4o-mini',
        status: 'SUCCESS',
        total_tokens: 5,
        cost_usd: 1,
        priced: true,
        created_at: new Date(now.getTime() - 30 * DAY_MS),
        updated_at: now,
      },
    ]);
  };

  it('totals the window and all time separately, by status', async () => {
    await seedLedger();

    const dash = await openAiUsageService.dashboard(7);

    expect(dash).toMatchObject({
      range_days: 7,
      total_calls: 4,
      success_calls: 2,
      failed_calls: 1,
      skipped_calls: 1,
      total_tokens: 1060,
      total_cost_usd: 0.75,
      // Rows with no duration are left out of the average: (100 + 300 + 0) / 3.
      avg_duration_ms: 133,
      all_time_calls: 5,
      all_time_cost_usd: 1.75,
      unpriced_models: ['mystery-model'],
      prices: [],
    });
    expect(dash.series.reduce((sum, day) => sum + day.calls, 0)).toBe(4);
  });

  it('labels each task from the row, then the catalogue, then the task key itself', async () => {
    await seedLedger();

    const { by_task } = await openAiUsageService.dashboard(7);
    const byKey = new Map(by_task.map((row) => [row.task, row]));

    expect(byKey.get('moderation.pod')).toEqual({
      task: 'moderation.pod',
      label: 'Pod moderation scan',
      module: 'Moderation',
      calls: 2,
      tokens: 1000,
      cost_usd: 0.5,
      failures: 1,
      avg_duration_ms: 200,
    });
    expect(byKey.get('support.assistant')).toMatchObject({
      label: 'Support reply',
      module: 'Support',
      failures: 0,
      avg_duration_ms: 0,
    });
    expect(byKey.get('legacy.removed')).toMatchObject({
      label: 'legacy.removed',
      module: '—',
      failures: 1,
    });
    // Most expensive first.
    expect(by_task[0].task).toBe('moderation.pod');
  });

  it('groups spend by module and model, naming a blank module with a dash', async () => {
    await seedLedger();

    const { by_module, by_model } = await openAiUsageService.dashboard(7);

    expect(by_module).toEqual([
      { key: 'Moderation', calls: 2, tokens: 1000, cost_usd: 0.5 },
      { key: 'Support', calls: 1, tokens: 10, cost_usd: 0.25 },
      { key: '—', calls: 1, tokens: 50, cost_usd: 0 },
    ]);
    expect(by_model.map((row) => row.key)).toEqual(['gpt-4o-mini', 'gpt-4o', 'mystery-model']);
  });

  it('reads an empty ledger as zeros', async () => {
    const dash = await openAiUsageService.dashboard(7);

    expect(dash).toMatchObject({
      total_calls: 0,
      total_cost_usd: 0,
      avg_duration_ms: 0,
      all_time_calls: 0,
      by_task: [],
      by_module: [],
      series: [],
      unpriced_models: [],
    });
  });

  it.each([
    [undefined, 7],
    [null, 7],
    [0, 7],
    [-3, 7],
    [Number.NaN, 7],
    [3.9, 3],
    [90, 90],
    [365, 90],
  ])('clamps a requested range of %p days to %p', async (requested, expected) => {
    await expect(openAiUsageService.dashboard(requested)).resolves.toMatchObject({ range_days: expected });
  });
});
