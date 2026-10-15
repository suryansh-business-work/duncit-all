/**
 * The AI Features switch that every OpenAI call passes through.
 *
 * It fails OPEN: only a stored `enabled: false` turns a feature off. No row, no
 * database connection, or a read that throws must all answer ON — an
 * unreadable switch must never silently stop moderation and support replies at
 * once. It is cached for 30 seconds because it sits in front of every call, and
 * a saved toggle clears that cache in the process that saved it.
 */
jest.mock('mongoose', () => ({
  __esModule: true,
  default: { connection: { readyState: 1 } },
}));
jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn() } } }));
jest.mock('../../aiFeature.model', () => ({ AiFeatureSettingModel: { find: jest.fn() } }));

import mongoose from 'mongoose';
import { logs } from '@observability/log';
import { AiFeatureSettingModel } from '../../aiFeature.model';
import { clearAiFeatureCache, isAiFeatureEnabled } from '../../aiFeature.guard';

const find = AiFeatureSettingModel.find as unknown as jest.Mock;
const warn = logs.server.warn as unknown as jest.Mock;
const connection = mongoose.connection as unknown as { readyState: number };

/** The switches stored as off, served through the find().select().lean() chain. */
const storedOff = (...keys: string[]) => {
  find.mockImplementation(() => ({
    select: () => ({ lean: async () => keys.map((key) => ({ key })) }),
  }));
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-10-15T10:00:00Z'));
  connection.readyState = 1;
  clearAiFeatureCache();
  storedOff();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('isAiFeatureEnabled', () => {
  it('answers ON for a feature nobody ever switched (no row)', async () => {
    await expect(isAiFeatureEnabled('moderation.pod')).resolves.toBe(true);
    // Only the switched-off rows are read — the set is what decides.
    expect(find).toHaveBeenCalledWith({ enabled: false });
  });

  it('answers OFF for a feature stored as disabled, and ON for every other one', async () => {
    storedOff('askbot.navigation');

    await expect(isAiFeatureEnabled('askbot.navigation')).resolves.toBe(false);
    await expect(isAiFeatureEnabled('moderation.pod')).resolves.toBe(true);
  });

  it('reads the switches once per window rather than once per call', async () => {
    storedOff('crm.call_assistant');

    await isAiFeatureEnabled('crm.call_assistant');
    jest.advanceTimersByTime(29_999);
    await isAiFeatureEnabled('crm.call_assistant');
    await isAiFeatureEnabled('moderation.pod');

    expect(find).toHaveBeenCalledTimes(1);
  });

  it('serves the cached answer inside the window even if the switch changed elsewhere', async () => {
    await expect(isAiFeatureEnabled('reels.director')).resolves.toBe(true);

    // Another process switched it off; this one learns at the end of the window.
    storedOff('reels.director');
    jest.advanceTimersByTime(10_000);

    await expect(isAiFeatureEnabled('reels.director')).resolves.toBe(true);
  });

  it('re-reads once the 30 second window has passed', async () => {
    await expect(isAiFeatureEnabled('reels.director')).resolves.toBe(true);
    storedOff('reels.director');

    jest.advanceTimersByTime(30_000);

    await expect(isAiFeatureEnabled('reels.director')).resolves.toBe(false);
    expect(find).toHaveBeenCalledTimes(2);
  });

  it('re-reads at once after clearAiFeatureCache (the toggle that was just saved)', async () => {
    await expect(isAiFeatureEnabled('support.assistant')).resolves.toBe(true);
    storedOff('support.assistant');

    clearAiFeatureCache();

    await expect(isAiFeatureEnabled('support.assistant')).resolves.toBe(false);
  });

  it('answers ON without touching the database when there is no connection', async () => {
    connection.readyState = 0;

    await expect(isAiFeatureEnabled('moderation.pod')).resolves.toBe(true);
    expect(find).not.toHaveBeenCalled();
  });

  it('fails open when the switch cannot be read, and logs which feature it could not read', async () => {
    find.mockImplementation(() => ({
      select: () => ({
        lean: async () => {
          throw new Error('db down');
        },
      }),
    }));

    await expect(isAiFeatureEnabled('moderation.image_scan')).resolves.toBe(true);
    expect(warn).toHaveBeenCalledWith(
      'aiFeature',
      'guard',
      expect.objectContaining({ feature: 'moderation.image_scan', error: expect.any(Error) }),
    );
  });

  it('does not cache a failed read — the next call tries the database again', async () => {
    find.mockImplementationOnce(() => ({
      select: () => ({
        lean: async () => {
          throw new Error('db down');
        },
      }),
    }));
    await isAiFeatureEnabled('moderation.pod');

    storedOff('moderation.pod');

    await expect(isAiFeatureEnabled('moderation.pod')).resolves.toBe(false);
    expect(find).toHaveBeenCalledTimes(2);
  });
});
