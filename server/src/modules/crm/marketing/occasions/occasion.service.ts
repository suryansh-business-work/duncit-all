import { logs } from '@observability/log';
import { AppSettingsModel } from '@modules/platform/settings/settings.model';
import { themeTokensToPub } from '@modules/platform/settings/theme-tokens';
import { BUILTIN_LOOKS, builtinLook } from './occasion.catalogue';
import { NO_FIREWORKS, garland } from './occasion.catalogue.build';
import { OccasionSettingsModel, OccasionThemeModel, type OccasionSettingsDoc } from './occasion.model';
import type { OccasionLiveMode, OccasionLook, OccasionThemeDoc } from './occasion.types';
import { badInput, keyFrom, lookFrom, scheduleFrom } from './occasion.validate';

type Input = Record<string, unknown>;

const SETTINGS_KEY = 'occasions';

/** A look nobody has designed yet: the house colours and nothing over the screen. */
const BLANK_LOOK: OccasionLook = {
  name: '',
  description: '',
  region: 'CUSTOM',
  color_mode: 'AUTO',
  palette_light: themeTokensToPub(null),
  palette_dark: themeTokensToPub(null),
  particles: [],
  flyers: [],
  fireworks: NO_FIREWORKS,
  overlays: [],
  garland: garland('NONE'),
  greeting: '',
};

const REGION_ORDER = ['INDIAN', 'NATIONAL', 'WESTERN', 'GLOBAL', 'CUSTOM'];

const notFound = (key: string): never => badInput(`There is no look called "${key}"`);

/**
 * "Now" on the application clock — the time source an admin picks in
 * Settings, so a custom test time switches the scheduled look exactly as it
 * switches every date in the apps (twin of @duncit/datetime `resolveNow`).
 */
async function appNowMs(): Promise<number> {
  const settings = await AppSettingsModel.findOne({ singleton_key: 'app' }, { time_source: 1, custom_time: 1, custom_time_set_at: 1 }).lean();
  const anchor = settings?.custom_time?.getTime();
  const setAt = settings?.custom_time_set_at?.getTime();
  if (settings?.time_source !== 'CUSTOM' || anchor === undefined || setAt === undefined) return Date.now();
  return anchor + (Date.now() - setAt);
}

async function settingsDoc(): Promise<OccasionSettingsDoc> {
  return OccasionSettingsModel.findOneAndUpdate(
    { singleton_key: SETTINGS_KEY },
    { $setOnInsert: { singleton_key: SETTINGS_KEY } },
    { new: true, upsert: true, lean: true }
  ) as Promise<OccasionSettingsDoc>;
}

async function liveTheme(key: string) {
  return key ? OccasionThemeModel.findOne({ key, is_archived: false }).lean() : null;
}

/** Overlapping windows: the higher sort order wins, ties to the later start. */
function pickWindow(windows: OccasionThemeDoc[], now: number): OccasionThemeDoc | null {
  let best: OccasionThemeDoc | null = null;
  for (const window of windows) {
    const start = window.starts_at?.getTime() ?? Number.POSITIVE_INFINITY;
    const end = window.ends_at?.getTime() ?? Number.NEGATIVE_INFINITY;
    if (now < start || now > end) continue;
    const better =
      !best ||
      window.sort_order > best.sort_order ||
      (window.sort_order === best.sort_order && start > (best.starts_at?.getTime() ?? 0));
    if (better) best = window;
  }
  return best;
}

/** The next instant any window opens or closes after `now` — when the scheduled look may change. */
function nextChange(windows: OccasionThemeDoc[], now: number): Date | null {
  const edges = windows
    .flatMap((window) => [window.starts_at?.getTime(), window.ends_at?.getTime()])
    .filter((edge): edge is number => edge !== undefined && edge > now);
  return edges.length > 0 ? new Date(Math.min(...edges)) : null;
}

export interface OccasionLive {
  mode: OccasionLiveMode;
  /** Why this look is on: MANUAL, SCHEDULE or PREVIEW; NONE for the house look. */
  source: 'MANUAL' | 'SCHEDULE' | 'PREVIEW' | 'NONE';
  theme: OccasionThemeDoc | null;
  next_change_at: Date | null;
}

export const occasionService = {
  async list(includeArchived: boolean): Promise<OccasionThemeDoc[]> {
    const themes = await OccasionThemeModel.find(includeArchived ? {} : { is_archived: false }).lean();
    return themes.sort(
      (a, b) => REGION_ORDER.indexOf(a.region) - REGION_ORDER.indexOf(b.region) || a.sort_order - b.sort_order || a.name.localeCompare(b.name)
    );
  },

  async get(key: string) {
    return OccasionThemeModel.findOne({ key }).lean();
  },

  /** Create a look (no key) or change one; only the fields sent change. */
  async save(key: string | null, input: Input): Promise<OccasionThemeDoc> {
    if (key) {
      const current = await OccasionThemeModel.findOne({ key }).lean();
      if (!current) return notFound(key);
      const look = lookFrom(input, current);
      const saved = await OccasionThemeModel.findOneAndUpdate({ key }, { $set: look }, { new: true, runValidators: true }).lean();
      return saved ?? notFound(key);
    }
    const look = lookFrom(input, BLANK_LOOK);
    const wanted = keyFrom(input.key, look.name);
    let unique = wanted;
    for (let n = 2; await OccasionThemeModel.exists({ key: unique }); n += 1) unique = `${wanted}-${n}`;
    const created = await OccasionThemeModel.create({ ...look, key: unique, is_builtin: false });
    return created.toObject();
  },

  async duplicate(key: string, name: string): Promise<OccasionThemeDoc> {
    const source = await OccasionThemeModel.findOne({ key }).lean();
    if (!source) return notFound(key);
    const { _id, key: _key, created_at, updated_at, is_builtin, is_archived, ...look } = source as OccasionThemeDoc & { _id: unknown };
    return this.save(null, { ...look, name, region: 'CUSTOM', schedule_enabled: false });
  },

  /** Put a built-in look back the way it shipped; its schedule is left alone. */
  async reset(key: string): Promise<OccasionThemeDoc> {
    const shipped = builtinLook(key);
    if (!shipped) badInput(`"${key}" is not a built-in look, so there is nothing to reset it to`);
    const { key: _key, ...look } = shipped;
    const saved = await OccasionThemeModel.findOneAndUpdate({ key }, { $set: { ...look, is_builtin: true } }, { new: true }).lean();
    return saved ?? notFound(key);
  },

  async setArchived(key: string, archived: boolean): Promise<OccasionThemeDoc> {
    const settings = await settingsDoc();
    if (archived && settings.mode === 'MANUAL' && settings.manual_key === key) {
      badInput('This look is live right now. Switch the apps to another look first.');
    }
    const saved = await OccasionThemeModel.findOneAndUpdate({ key }, { $set: { is_archived: archived } }, { new: true }).lean();
    return saved ?? notFound(key);
  },

  /** Delete a look someone made. Built-in festivals are archived instead, so they can come back. */
  async remove(key: string): Promise<boolean> {
    const theme = await OccasionThemeModel.findOne({ key }).lean();
    if (!theme) return notFound(key);
    if (theme.is_builtin) badInput('Built-in looks cannot be deleted — archive it instead.');
    const settings = await settingsDoc();
    if (settings.mode === 'MANUAL' && settings.manual_key === key) badInput('This look is live right now. Switch the apps to another look first.');
    await OccasionThemeModel.deleteOne({ key, is_builtin: false });
    return true;
  },

  async setSchedule(key: string, input: Input): Promise<OccasionThemeDoc> {
    const schedule = scheduleFrom(input);
    const saved = await OccasionThemeModel.findOneAndUpdate({ key }, { $set: schedule }, { new: true }).lean();
    return saved ?? notFound(key);
  },

  settings: settingsDoc,

  /** Switch what the apps wear: the house look, one pinned look, or the schedule. */
  async setLive(input: { mode: OccasionLiveMode; manual_key?: string | null }, actorId: string): Promise<OccasionSettingsDoc> {
    const manualKey = input.mode === 'MANUAL' ? String(input.manual_key ?? '').trim() : '';
    if (input.mode === 'MANUAL' && !(await liveTheme(manualKey))) badInput('Pick a look to pin — that one does not exist or is archived.');
    const settings = (await OccasionSettingsModel.findOneAndUpdate(
      { singleton_key: SETTINGS_KEY },
      { $set: { mode: input.mode, manual_key: manualKey } },
      { new: true, upsert: true, lean: true }
    )) as OccasionSettingsDoc;
    logs.server.info('occasions', 'liveChanged', { mode: input.mode, manual_key: manualKey, actor: actorId });
    return settings;
  },

  /**
   * The look the apps wear right now, worked out on the application clock.
   * `preview` (any look's key) shows that look instead — Marketing's preview
   * link — without changing anything for anyone else.
   */
  async live(preview?: string | null): Promise<OccasionLive> {
    const settings = await settingsDoc();
    const previewed = preview ? await liveTheme(preview.trim().toLowerCase()) : null;
    if (previewed) return { mode: settings.mode, source: 'PREVIEW', theme: previewed, next_change_at: null };
    if (settings.mode === 'MANUAL') {
      const pinned = await liveTheme(settings.manual_key);
      return { mode: settings.mode, source: pinned ? 'MANUAL' : 'NONE', theme: pinned, next_change_at: null };
    }
    if (settings.mode === 'SCHEDULE') {
      const windows = await OccasionThemeModel.find({ schedule_enabled: true, is_archived: false }).lean();
      const now = await appNowMs();
      const open = pickWindow(windows, now);
      return { mode: settings.mode, source: open ? 'SCHEDULE' : 'NONE', theme: open, next_change_at: nextChange(windows, now) };
    }
    return { mode: settings.mode, source: 'NONE', theme: null, next_change_at: null };
  },

  /** Ship every built-in look the database does not have yet. Never touches one that exists. */
  async seedBuiltins(): Promise<number> {
    const result = await OccasionThemeModel.bulkWrite(
      BUILTIN_LOOKS.map(({ key, ...look }, index) => ({
        updateOne: {
          filter: { key },
          update: { $setOnInsert: { ...look, key, is_builtin: true, sort_order: index, schedule_enabled: false, starts_at: null, ends_at: null, is_archived: false } },
          upsert: true,
        },
      })),
      { ordered: false }
    );
    return result.upsertedCount;
  },
};
