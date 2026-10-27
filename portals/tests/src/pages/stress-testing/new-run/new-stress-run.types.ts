import { z } from 'zod';
import type { StressSettings } from '../queries';

export interface NewStressRunMessages {
  whole: string;
  usersRange: string;
  botsRange: string;
  runnersRange: string;
  runnersAboveUsers: string;
  rampUpRange: string;
  holdRange: string;
  rampDownRange: string;
  thinkRange: string;
  journeysRequired: string;
  tooLong: string;
  confirmMismatch: string;
}

export interface ConfirmRule {
  required: boolean;
  text: string;
}

/** A whole number inside [min, max], typed into a text field. */
const wholeIn = (min: number, max: number, whole: string, range: string) =>
  z.coerce.number({ message: whole }).int(whole).min(min, range).max(max, range);

/**
 * The run form's rules. The ceilings come from Tech > Stress Testing > Settings
 * (the server enforces the same ones), so a number the server would refuse is
 * refused here first, next to the field it belongs to.
 */
export const newStressRunSchema = (limits: StressSettings, confirm: ConfirmRule, m: NewStressRunMessages) =>
  z
    .object({
      virtual_users: wholeIn(1, limits.max_virtual_users, m.whole, m.usersRange),
      browser_bots: wholeIn(0, limits.max_browser_bots, m.whole, m.botsRange),
      runners: wholeIn(1, limits.max_runners, m.whole, m.runnersRange),
      ramp_up_seconds: wholeIn(0, 1800, m.whole, m.rampUpRange),
      hold_seconds: wholeIn(10, 7200, m.whole, m.holdRange),
      ramp_down_seconds: wholeIn(0, 600, m.whole, m.rampDownRange),
      think_time_ms: wholeIn(0, 60_000, m.whole, m.thinkRange),
      journeys: z.array(z.string()).min(1, m.journeysRequired),
      confirm_text: z.string().trim(),
    })
    .superRefine((values, ctx) => {
      if (values.runners > values.virtual_users) {
        ctx.addIssue({ code: 'custom', path: ['runners'], message: m.runnersAboveUsers });
      }
      const total = values.ramp_up_seconds + values.hold_seconds + values.ramp_down_seconds;
      if (total > limits.max_duration_minutes * 60) {
        ctx.addIssue({ code: 'custom', path: ['hold_seconds'], message: m.tooLong });
      }
      if (confirm.required && values.confirm_text !== confirm.text) {
        ctx.addIssue({ code: 'custom', path: ['confirm_text'], message: m.confirmMismatch });
      }
    });

export type NewStressRunValues = z.infer<ReturnType<typeof newStressRunSchema>>;

export type StressPresetKey = 'smoke' | 'load' | 'stress' | 'spike' | 'soak';

export const STRESS_PRESETS: readonly StressPresetKey[] = ['smoke', 'load', 'stress', 'spike', 'soak'];

/**
 * The classic shapes of a performance test, scaled to the admin's ceilings so
 * a preset can never ask for more than the settings allow.
 */
export function presetValues(key: StressPresetKey, limits: StressSettings): Partial<NewStressRunValues> {
  const budget = limits.max_duration_minutes * 60;
  const users = (fraction: number) => Math.max(1, Math.round(limits.max_virtual_users * fraction));
  const bots = (n: number) => Math.min(n, limits.max_browser_bots);
  // The hold gives way first: a preset keeps its ramps and shortens the plateau
  // until the whole run fits the configured duration.
  const shape = (virtualUsers: number, browserBots: number, up: number, hold: number, down: number, think: number) => {
    const third = Math.floor(budget / 3);
    const rampUp = Math.min(up, third);
    const rampDown = Math.min(down, third);
    return {
      virtual_users: virtualUsers,
      browser_bots: browserBots,
      runners: 1,
      ramp_up_seconds: rampUp,
      hold_seconds: Math.max(10, Math.min(hold, budget - rampUp - rampDown)),
      ramp_down_seconds: rampDown,
      think_time_ms: think,
    };
  };
  const shapes: Record<StressPresetKey, Partial<NewStressRunValues>> = {
    smoke: shape(Math.min(10, limits.max_virtual_users), bots(1), 10, 60, 0, 1500),
    load: shape(users(0.3), bots(2), 60, 300, 30, 1000),
    stress: shape(users(1), limits.max_browser_bots, 300, 300, 60, 500),
    spike: shape(users(1), bots(2), 10, 120, 10, 250),
    soak: shape(users(0.2), bots(2), 120, budget, 60, 2000),
  };
  return shapes[key];
}

export function defaultValues(limits: StressSettings, journeys: string[]): NewStressRunValues {
  return {
    virtual_users: 1,
    browser_bots: 0,
    runners: 1,
    ramp_up_seconds: 0,
    hold_seconds: 60,
    ramp_down_seconds: 0,
    think_time_ms: 1000,
    ...presetValues('smoke', limits),
    journeys,
    confirm_text: '',
  };
}

/** What the mutation is sent — the confirmation only when one is asked for. */
export function toTriggerInput(values: NewStressRunValues, confirm: ConfirmRule) {
  const { confirm_text: confirmText, ...profile } = values;
  return confirm.required ? { ...profile, confirm_text: confirmText } : profile;
}

/** Total planned seconds, shown under the form so the operator sees the whole shape. */
export const plannedSeconds = (values: Partial<NewStressRunValues>) =>
  Number(values.ramp_up_seconds ?? 0) + Number(values.hold_seconds ?? 0) + Number(values.ramp_down_seconds ?? 0);
