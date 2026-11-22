/**
 * The monthly Host Performance run: when it is due, that it claims its month
 * once, that snapshots are idempotent, and that messages only go out when
 * Pod Settings has them on — and never for a club with nobody to worry about.
 */
jest.mock('@services/notify/notify.service', () => ({ notifyEach: jest.fn(async () => undefined) }));

import { notifyEach } from '@services/notify/notify.service';
import { claimRun, duePeriod, runHostPerformanceIfDue } from '../../hostPerformance.job';
import { HostPerformanceRunModel, HostPerformanceSnapshotModel } from '../../clubHosts.models';
import { hostEngagementSettingsOf } from '@modules/platform/settings/settings.hostEngagement';
import { settingsService } from '@modules/platform/settings/settings.service';
import { ClubModel } from '@modules/clubs/club/club.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { getAppTimeZone } from '@utils/app-time';
import { periodRange, shiftPeriod, periodOf } from '../../hostPerformance.math';

const notifyMock = notifyEach as jest.Mock;

async function seedMonth(now: Date) {
  const zone = getAppTimeZone();
  const last = shiftPeriod(periodOf(now, zone), -1);
  const { start } = periodRange(last, zone);
  const admin = await UserModel.create({ auth: { email: 'admin@example.com' }, profile: { first_name: 'Rohit' } });
  const host = await UserModel.create({ auth: { email: 'host@example.com' }, profile: { first_name: 'Meera' } });
  const club = await ClubModel.create({
    club_id: `c-${Math.random().toString(36).slice(2)}`,
    club_name: 'Noida Badminton',
    admin_user_ids: [admin._id],
    is_active: true,
  });
  for (let i = 0; i < 2; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await PodModel.create({
      pod_id: `p-${Math.random().toString(36).slice(2)}`,
      pod_title: 'Pod',
      club_id: club._id,
      pod_description: 'desc',
      pod_type: 'FREE',
      pod_hosts_id: [host._id],
      pod_date_time: new Date(start.getTime() + (i + 1) * 86_400_000),
      completed_at: new Date(start.getTime() + (i + 1) * 86_400_000 + 3_600_000),
      is_active: true,
    });
  }
  return { last, club, host, admin };
}

describe('duePeriod', () => {
  const settings = hostEngagementSettingsOf({ host_performance_notify_day: 5 });

  it('is not due before the configured day and is due for last month from it on', () => {
    expect(duePeriod(new Date('2026-11-04T06:00:00Z'), 'Asia/Kolkata', settings)).toBeNull();
    expect(duePeriod(new Date('2026-11-05T06:00:00Z'), 'Asia/Kolkata', settings)).toBe('2026-10');
    expect(duePeriod(new Date('2026-01-20T06:00:00Z'), 'Asia/Kolkata', settings)).toBe('2025-12');
  });
});

describe('claimRun', () => {
  it('claims a month once, refuses a second claim and takes over a failed run', async () => {
    const now = new Date();
    expect(await claimRun('2026-09', now)).not.toBeNull();
    expect(await claimRun('2026-09', now)).toBeNull();
    await HostPerformanceRunModel.updateOne({ period: '2026-09' }, { $set: { status: 'FAILED' } });
    expect(await claimRun('2026-09', now)).not.toBeNull();
  });

  it('takes over a run stuck in RUNNING for hours, not a fresh one', async () => {
    const now = new Date();
    await HostPerformanceRunModel.create({ period: '2026-08', status: 'RUNNING', started_at: new Date(now.getTime() - 7 * 3_600_000) });
    expect(await claimRun('2026-08', now)).not.toBeNull();
    expect(await claimRun('2026-08', now)).toBeNull();
  });
});

describe('runHostPerformanceIfDue', () => {
  beforeEach(() => notifyMock.mockClear());

  it('snapshots last month without messaging while notifications are off', async () => {
    const now = new Date();
    const { last, club, host } = await seedMonth(now);
    await expect(runHostPerformanceIfDue(now)).resolves.toBe(last);
    const snap = await HostPerformanceSnapshotModel.findOne({ club_id: club._id, host_user_id: host._id, period: last }).lean();
    expect(snap).toMatchObject({ completed: 2, target: 8, score: 25 });
    expect(notifyMock).not.toHaveBeenCalled();
    await expect(HostPerformanceRunModel.findOne({ period: last }).lean()).resolves.toMatchObject({
      status: 'COMPLETED',
      hosts: 1,
      notified: false,
    });
  });

  it('messages the host and the club admin once, and never runs the month twice', async () => {
    const now = new Date();
    const { last, admin, host, club } = await seedMonth(now);
    await settingsService.updateAppSettings({ host_performance_notify_enabled: true });
    await runHostPerformanceIfDue(now);
    await expect(runHostPerformanceIfDue(now)).resolves.toBeNull();
    expect(notifyMock).toHaveBeenCalledTimes(1);
    const inputs = notifyMock.mock.calls[0][0];
    expect(inputs.map((i: any) => i.event).sort()).toEqual(['CLUB_ADMIN_HOST_PERFORMANCE_ALERT', 'HOST_MONTHLY_PERFORMANCE']);
    const hostMsg = inputs.find((i: any) => i.event === 'HOST_MONTHLY_PERFORMANCE');
    expect(hostMsg.entityId).toBe(`${String(host._id)}:${String(club._id)}:${last}`);
    const adminMsg = inputs.find((i: any) => i.event === 'CLUB_ADMIN_HOST_PERFORMANCE_ALERT');
    expect(adminMsg.entityId).toBe(`${String(admin._id)}:${String(club._id)}:${last}`);
  });

  it('sends no admin alert when every host met the target and is active', async () => {
    const now = new Date();
    await seedMonth(now);
    await settingsService.updateAppSettings({
      host_performance_notify_enabled: true,
      host_monthly_pod_target: 2,
      host_inactivity_days: 90,
    });
    await runHostPerformanceIfDue(now);
    const inputs = notifyMock.mock.calls[0][0];
    expect(inputs.map((i: any) => i.event)).toEqual(['HOST_MONTHLY_PERFORMANCE']);
  });

  it('writes the same snapshot again rather than a duplicate on a retried month', async () => {
    const now = new Date();
    const { last } = await seedMonth(now);
    await runHostPerformanceIfDue(now);
    await HostPerformanceRunModel.updateOne({ period: last }, { $set: { status: 'FAILED' } });
    await runHostPerformanceIfDue(now);
    await expect(HostPerformanceSnapshotModel.countDocuments({ period: last })).resolves.toBe(1);
    await expect(HostPerformanceRunModel.findOne({ period: last }).lean()).resolves.toMatchObject({ status: 'COMPLETED' });
  });
});
