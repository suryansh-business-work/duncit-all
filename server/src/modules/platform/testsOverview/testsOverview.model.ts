import { model, Schema, type Document } from 'mongoose';

/**
 * The signals the confidence score is built from. Each one is a 0-100 reading
 * of one kind of testing; the score is their weighted mean over the signals
 * that have data (a signal with no runs yet is left out, not read as zero).
 */
export const CONFIDENCE_SIGNALS = [
  'UNIT_PASS_RATE',
  'CODE_COVERAGE',
  'E2E_PASS_RATE',
  'SCENARIO_COVERAGE',
  'STRESS_HEALTH',
  'REGRESSION_FREE',
  'MANUAL_PASS_RATE',
] as const;
export type ConfidenceSignal = (typeof CONFIDENCE_SIGNALS)[number];

export interface ISignalWeight {
  signal: ConfidenceSignal;
  /** Relative weight; 0 switches the signal off. */
  weight: number;
}

/** The Tests console's own settings: how the confidence score is weighed and banded. */
export interface ITestsSettings extends Document {
  key: string;
  weights: ISignalWeight[];
  /** A score at or above this reads HIGH. */
  high_min: number;
  /** A score at or above this (and below high_min) reads MEDIUM; below it, LOW. */
  medium_min: number;
  /** Points one regressed test takes off REGRESSION_FREE (100 = one regression zeroes it). */
  regression_penalty: number;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
}

export const TESTS_SETTINGS_KEY = 'tests_console';

/**
 * Defaults for a fresh database. Coverage and unit pass rate lead because they
 * are measured on every push; scenario coverage and manual results trail
 * because they move by hand. Admins change all of it in Tests → Settings.
 */
export const DEFAULT_WEIGHTS: Readonly<Record<ConfidenceSignal, number>> = {
  UNIT_PASS_RATE: 20,
  CODE_COVERAGE: 20,
  E2E_PASS_RATE: 20,
  SCENARIO_COVERAGE: 10,
  STRESS_HEALTH: 10,
  REGRESSION_FREE: 10,
  MANUAL_PASS_RATE: 10,
};

const weightSchema = new Schema<ISignalWeight>(
  {
    signal: { type: String, enum: CONFIDENCE_SIGNALS, required: true },
    weight: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false }
);

const testsSettingsSchema = new Schema<ITestsSettings>(
  {
    key: { type: String, required: true, unique: true },
    weights: {
      type: [weightSchema],
      default: () => CONFIDENCE_SIGNALS.map((signal) => ({ signal, weight: DEFAULT_WEIGHTS[signal] })),
    },
    high_min: { type: Number, default: 80, min: 1, max: 100 },
    medium_min: { type: Number, default: 60, min: 0, max: 99 },
    regression_penalty: { type: Number, default: 10, min: 1, max: 100 },
    updated_by: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const TestsSettingsModel = model<ITestsSettings>('TestsSettings', testsSettingsSchema);
