import { GraphQLError } from 'graphql';
import { CATEGORY_LABELS } from './envEntry.fields';
import { ENV_CATEGORIES, EnvEntryModel, type EnvCategory } from './envEntry.model';
import {
  DEFAULT_ATTEMPT_WINDOW_HOURS,
  ENV_ATTEMPT_SETTINGS_KEY,
  EnvAttemptSettingsModel,
  type IEnvAttemptSettings,
} from './envAttempt.model';

/**
 * The cap on how often one entry may be tested, and the count against it.
 *
 * Every test of an entry — Test connection, a test email, a test call — spends
 * one attempt of that entry's window. The count lives on the entry, so it
 * outlives a deploy and two operators testing at once cannot both take the
 * last attempt (the increment is conditional on the count still being under
 * the cap). When the window has run its length the next test starts a new one.
 */

/** What a category is capped at until an operator sets its own. ShipRocket locks an API user after a few wrong sign-ins. */
const DEFAULT_LIMITS: Partial<Record<EnvCategory, number>> = { SHIPROCKET: 5 };

const BOUNDS = {
  window_hours: { min: 1, max: 720 },
  max_attempts: { min: 0, max: 1000 },
};

const HOUR_MS = 3_600_000;

export interface EnvTestAttempts {
  /** Tests run in the current window, this one included. */
  used: number;
  /** The cap. 0 = unlimited. */
  max: number;
  /** Tests left in the window; null when unlimited. */
  left: number | null;
  window_hours: number;
  /** When the count starts again; null before the first test of a window. */
  resets_at: string | null;
}

export interface EnvAttemptLimitInput {
  category: string;
  max_attempts: number;
}

function intIn(value: unknown, bounds: { min: number; max: number }, what: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < bounds.min || n > bounds.max) {
    throw new GraphQLError(`${what} must be a whole number from ${bounds.min} to ${bounds.max}`, {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return n;
}

async function settingsDoc(): Promise<IEnvAttemptSettings> {
  const doc = await EnvAttemptSettingsModel.findOneAndUpdate(
    { key: ENV_ATTEMPT_SETTINGS_KEY },
    { $setOnInsert: { key: ENV_ATTEMPT_SETTINGS_KEY } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).exec();
  return doc as IEnvAttemptSettings;
}

/** The cap for one category: the saved one, else its default, else unlimited. */
function limitOf(doc: IEnvAttemptSettings, category: string): number {
  const saved = doc.limits?.[category];
  if (Number.isInteger(saved) && saved >= 0) return saved;
  return DEFAULT_LIMITS[category as EnvCategory] ?? 0;
}

const windowHoursOf = (doc: IEnvAttemptSettings) =>
  doc.window_hours >= BOUNDS.window_hours.min ? doc.window_hours : DEFAULT_ATTEMPT_WINDOW_HOURS;

function toPublic(doc: IEnvAttemptSettings) {
  return {
    window_hours: windowHoursOf(doc),
    limits: ENV_CATEGORIES.map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      max_attempts: limitOf(doc, category),
    })),
    updated_at: doc.updated_at.toISOString(),
  };
}

interface Counted {
  test_attempts?: number | null;
  test_window_started_at?: Date | null;
}

/** The count as a reader sees it: a window that has run out reads as empty before anything resets it. */
function attemptsOf(entry: Counted | null, max: number, windowHours: number): EnvTestAttempts {
  const now = Date.now();
  const started = entry?.test_window_started_at?.getTime() ?? 0;
  const live = started > 0 && now - started < windowHours * HOUR_MS;
  const used = live ? (entry?.test_attempts ?? 0) : 0;
  return {
    used,
    max,
    left: max > 0 ? Math.max(0, max - used) : null,
    window_hours: windowHours,
    resets_at: live ? new Date(started + windowHours * HOUR_MS).toISOString() : null,
  };
}

const notFound = () => new GraphQLError('Environment entry not found', { extensions: { code: 'NOT_FOUND' } });

export const envAttemptService = {
  async settings() {
    return toPublic(await settingsDoc());
  },

  /** Save the window and the caps. A category left out keeps what it had; one this server does not know is refused. */
  async updateSettings(input: { window_hours: unknown; limits?: EnvAttemptLimitInput[] | null }) {
    const current = await settingsDoc();
    const limits: Record<string, number> = { ...current.limits };
    for (const { category, max_attempts } of input.limits ?? []) {
      if (!(ENV_CATEGORIES as readonly string[]).includes(category)) {
        throw new GraphQLError(`Unknown category ${category}`, { extensions: { code: 'BAD_USER_INPUT' } });
      }
      limits[category] = intIn(max_attempts, BOUNDS.max_attempts, `Max attempts for ${CATEGORY_LABELS[category as EnvCategory]}`);
    }
    const doc = await EnvAttemptSettingsModel.findOneAndUpdate(
      { key: ENV_ATTEMPT_SETTINGS_KEY },
      { $set: { window_hours: intIn(input.window_hours, BOUNDS.window_hours, 'The window'), limits } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).exec();
    return toPublic(doc as IEnvAttemptSettings);
  },

  /** Where one entry's count stands, without spending anything. */
  async forEntry(id: string): Promise<EnvTestAttempts> {
    const [settings, entry] = await Promise.all([
      settingsDoc(),
      EnvEntryModel.findById(id).select('category test_attempts test_window_started_at').lean(),
    ]);
    if (!entry) throw notFound();
    return attemptsOf(entry, limitOf(settings, entry.category), windowHoursOf(settings));
  },

  /**
   * Spend one attempt of the entry's window. `allowed: false` means the cap was
   * already reached and nothing was spent — the caller must not reach the vendor.
   */
  async spend(id: string): Promise<{ allowed: boolean; attempts: EnvTestAttempts }> {
    const settings = await settingsDoc();
    const windowHours = windowHoursOf(settings);
    const now = new Date();
    // A window that has run out (or never started) begins again at zero. Two
    // tests racing here both match at most once: the second sees the new start.
    await EnvEntryModel.updateOne(
      {
        _id: id,
        $or: [
          { test_window_started_at: null },
          { test_window_started_at: { $lte: new Date(now.getTime() - windowHours * HOUR_MS) } },
        ],
      },
      { $set: { test_window_started_at: now, test_attempts: 0 } }
    );
    const known = await EnvEntryModel.findById(id).select('category').lean();
    if (!known) throw notFound();
    const max = limitOf(settings, known.category);
    // Conditional on still being under the cap, so the last attempt is taken once.
    const spent = await EnvEntryModel.findOneAndUpdate(
      { _id: id, ...(max > 0 ? { test_attempts: { $lt: max } } : {}) },
      { $inc: { test_attempts: 1 } },
      { new: true }
    )
      .select('test_attempts test_window_started_at')
      .lean();
    if (spent) return { allowed: true, attempts: attemptsOf(spent, max, windowHours) };
    const held = await EnvEntryModel.findById(id).select('test_attempts test_window_started_at').lean();
    return { allowed: false, attempts: attemptsOf(held, max, windowHours) };
  },
};
