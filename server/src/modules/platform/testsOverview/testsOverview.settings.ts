import { GraphQLError } from 'graphql';
import {
  CONFIDENCE_SIGNALS,
  DEFAULT_WEIGHTS,
  TESTS_SETTINGS_KEY,
  TestsSettingsModel,
  type ConfidenceSignal,
  type ITestsSettings,
} from './testsOverview.model';

export interface TestsSettingsInput {
  weights: { signal: ConfidenceSignal; weight: number }[];
  high_min: number;
  medium_min: number;
  regression_penalty: number;
}

const badInput = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

function intIn(value: unknown, min: number, max: number, message: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw badInput(message);
  return n;
}

/** An upsert with `new: true` always answers a document; anything else is a database fault. */
function required(doc: ITestsSettings | null): ITestsSettings {
  if (!doc) throw new Error('The Tests settings document could not be read or created.');
  return doc;
}

/** The singleton, created with the defaults by the first read. */
async function settingsDoc(): Promise<ITestsSettings> {
  const doc = await TestsSettingsModel.findOneAndUpdate(
    { key: TESTS_SETTINGS_KEY },
    { $setOnInsert: { key: TESTS_SETTINGS_KEY } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean<ITestsSettings>();
  return required(doc);
}

/**
 * Every signal exactly once, in catalogue order — a signal added to the
 * catalogue after a database saved its weights reads with its default.
 */
function withEverySignal(settings: ITestsSettings) {
  const saved = new Map(settings.weights.map((w) => [w.signal, w.weight]));
  return {
    weights: CONFIDENCE_SIGNALS.map((signal) => ({ signal, weight: saved.get(signal) ?? DEFAULT_WEIGHTS[signal] })),
    high_min: settings.high_min,
    medium_min: settings.medium_min,
    regression_penalty: settings.regression_penalty,
    updated_by: settings.updated_by,
    updated_at: settings.updated_at,
  };
}

export type TestsSettings = ReturnType<typeof withEverySignal>;

export async function getTestsSettings(): Promise<TestsSettings> {
  return withEverySignal(await settingsDoc());
}

function validWeights(input: TestsSettingsInput['weights']) {
  const seen = new Set<string>();
  const weights = input.map(({ signal, weight }) => {
    if (!CONFIDENCE_SIGNALS.includes(signal)) throw badInput(`Unknown signal ${signal}.`);
    if (seen.has(signal)) throw badInput(`${signal} is listed twice.`);
    seen.add(signal);
    return { signal, weight: intIn(weight, 0, 100, 'Each weight must be a whole number between 0 and 100.') };
  });
  if (!weights.some((w) => w.weight > 0)) throw badInput('At least one signal needs a weight above 0.');
  return weights;
}

export async function updateTestsSettings(input: TestsSettingsInput, actor: string): Promise<TestsSettings> {
  const highMin = intIn(input.high_min, 1, 100, 'The high band must start between 1 and 100.');
  const mediumMin = intIn(input.medium_min, 0, 99, 'The medium band must start between 0 and 99.');
  if (mediumMin >= highMin) throw badInput('The medium band must start below the high band.');
  const set = {
    weights: validWeights(input.weights),
    high_min: highMin,
    medium_min: mediumMin,
    regression_penalty: intIn(input.regression_penalty, 1, 100, 'The regression penalty must be between 1 and 100.'),
    updated_by: actor,
  };
  const doc = await TestsSettingsModel.findOneAndUpdate(
    { key: TESTS_SETTINGS_KEY },
    { $set: set },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean<ITestsSettings>();
  return withEverySignal(required(doc));
}
