import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiteEventModel, type LiteEventDoc } from '../models/event.model';
import type { LiteUserDoc } from '../models/user.model';
import { startScheduler } from '../scheduler';
import { discoverService } from '../services/discover.service';
import { notifications } from '../services/notifications';
import { settingsService } from '../services/settings.service';
import { log } from '../utils/log';
import { HOUR, hostedEvent, makeUser } from './helpers/fixtures';
import { withTestDatabase } from './helpers/mongo';

withTestDatabase();

let host: LiteUserDoc;

beforeEach(async () => {
  host = await makeUser({ email: 'hema@lite.test', handle: 'hema' });
  vi.spyOn(notifications, 'reminder').mockResolvedValue(2);
  vi.spyOn(log, 'info').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Start the scheduler without letting it arm real timers, and hand back the
 * tick it would run plus the delays it asked for.
 */
function captureTick(): { tick: () => Promise<void>; firstDelay: number | undefined; every: number | undefined } {
  const handle = setTimeout(() => undefined, 0);
  clearTimeout(handle);
  let tick: (() => Promise<void>) | undefined;
  let firstDelay: number | undefined;
  let every: number | undefined;
  const timeout = vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback, ms) => {
    tick = callback as () => Promise<void>;
    firstDelay = ms;
    return handle;
  });
  const interval = vi.spyOn(globalThis, 'setInterval').mockImplementation((_callback, ms) => {
    every = ms;
    return handle;
  });
  startScheduler();
  timeout.mockRestore();
  interval.mockRestore();
  if (!tick) throw new Error('the scheduler armed no first tick');
  return { tick, firstDelay, every };
}

const startingIn = (hours: number) => {
  const start = new Date(Date.now() + hours * HOUR);
  return { start_at: start.toISOString(), end_at: new Date(start.getTime() + 2 * HOUR).toISOString() };
};

const remindersSent = async (event: LiteEventDoc) => (await LiteEventModel.findById(event._id).lean())?.reminders_sent ?? [];

describe('startScheduler', () => {
  it('runs a first tick after 15 seconds and then every five minutes', () => {
    const { firstDelay, every } = captureTick();
    expect(firstDelay).toBe(15_000);
    expect(every).toBe(5 * 60_000);
  });

  it('reminds each published event once per configured hour as it comes into range', async () => {
    await settingsService.update({ reminder_hours_before: [24, 1] });
    const soon = await hostedEvent(host, { title: 'Soon', ...startingIn(0.5) });
    const tomorrow = await hostedEvent(host, { title: 'Tomorrow', ...startingIn(20) });
    const later = await hostedEvent(host, { title: 'Later', ...startingIn(48) });
    const draft = await hostedEvent(host, { title: 'Draft', ...startingIn(0.5) }, false);
    const refresh = vi.spyOn(discoverService, 'refreshGoingCounts').mockResolvedValue();
    const { tick } = captureTick();

    await tick();

    expect(await remindersSent(soon)).toEqual([24, 1]);
    expect(await remindersSent(tomorrow)).toEqual([24]);
    expect(await remindersSent(later)).toEqual([]);
    expect(await remindersSent(draft)).toEqual([]);
    expect(notifications.reminder).toHaveBeenCalledTimes(3);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(log.info).toHaveBeenCalledWith('scheduler', 'reminder', { event: 'soon', hours: 1, sent: 2 });

    await tick();
    expect(notifications.reminder).toHaveBeenCalledTimes(3);
  });

  it('sends nothing while reminders are switched off, but still refreshes the going counts', async () => {
    await settingsService.update({ reminders_enabled: false });
    await hostedEvent(host, { title: 'Soon', ...startingIn(0.5) });
    const refresh = vi.spyOn(discoverService, 'refreshGoingCounts').mockResolvedValue();
    await captureTick().tick();
    expect(notifications.reminder).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('logs a failed tick instead of crashing the process', async () => {
    const failure = new Error('db down');
    vi.spyOn(settingsService, 'get').mockRejectedValue(failure);
    const error = vi.spyOn(log, 'error').mockImplementation(() => undefined);
    await expect(captureTick().tick()).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith('scheduler', 'tick', { error: failure });
  });
});
