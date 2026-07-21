import { Types } from 'mongoose';
import {
  diffSnapshots,
  heuristicRisk,
  heuristicSummary,
  parseAiVerdict,
  podAuditService,
  reviewLogWithAi,
  snapshotPod,
} from '../../podAudit.service';
import { PodAuditLogModel } from '../../podAudit.model';
import { podService } from '@modules/pods/pod/pod.service';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/pods/club/club.model';
import { UserModel } from '@modules/access/user/user.model';
import { getRuntimeEnvValue } from '@config/runtimeEnv';

jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn().mockResolvedValue('') }));
const mockEnv = getRuntimeEnvValue as jest.Mock;

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000);

const seedPod = (over: Record<string, unknown> = {}) =>
  PodModel.create({
    pod_id: `pod-${new Types.ObjectId().toString()}`,
    pod_title: 'Sunset jam',
    pod_hosts_id: [new Types.ObjectId()],
    club_id: new Types.ObjectId(),
    location_id: new Types.ObjectId(),
    pod_description: 'A relaxed evening jam session',
    pod_date_time: inDays(2),
    pod_type: 'NATIVE_PAID',
    pod_amount: 500,
    ...over,
  });

beforeEach(() => {
  mockEnv.mockReset().mockResolvedValue('');
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('snapshot + diff + heuristics', () => {
  it('diffs only the tracked fields that changed', async () => {
    const pod = await seedPod();
    const before = snapshotPod(pod);
    pod.pod_title = 'Sunrise jam';
    pod.pod_amount = 900;
    const changes = diffSnapshots(before, snapshotPod(pod));
    expect(changes.map((c) => c.field).sort()).toEqual(['pod_amount', 'pod_title']);
    expect(changes.find((c) => c.field === 'pod_amount')).toMatchObject({ from: '500', to: '900' });
  });

  it('grades risk deterministically', () => {
    expect(heuristicRisk('DELETE', [])).toBe('HIGH');
    expect(heuristicRisk('VENUE_DECLINED', [])).toBe('MEDIUM');
    expect(heuristicRisk('UPDATE', [{ field: 'pod_amount', from: '500', to: '900' }])).toBe('HIGH');
    expect(heuristicRisk('UPDATE', [{ field: 'pod_amount', from: '0', to: '100' }])).toBe('HIGH');
    expect(heuristicRisk('UPDATE', [{ field: 'pod_amount', from: '500', to: '600' }])).toBe('MEDIUM');
    expect(heuristicRisk('UPDATE', [{ field: 'pod_date_time', from: 'a', to: 'b' }])).toBe('MEDIUM');
    expect(heuristicRisk('UPDATE', [{ field: 'is_active', from: 'true', to: 'false' }])).toBe('MEDIUM');
    expect(heuristicRisk('UPDATE', [{ field: 'pod_title', from: 'a', to: 'b' }])).toBe('LOW');
    expect(heuristicRisk('CREATE', [])).toBe('LOW');
  });

  it('summarises deterministically with and without notes/changes', () => {
    expect(heuristicSummary({ action: 'CREATE', changes: [], note: '' } as any)).toBe('CREATE');
    expect(
      heuristicSummary({ action: 'UPDATE', changes: [{ field: 'pod_title', from: 'a', to: 'b' }], note: 'x' } as any),
    ).toBe('UPDATE touching pod_title — x');
  });

  it('parses only well-shaped AI verdicts', () => {
    expect(parseAiVerdict('{"risk":"HIGH","summary":"Big price jump"}')).toEqual({
      risk: 'HIGH',
      summary: 'Big price jump',
    });
    expect(parseAiVerdict('{"risk":"low","summary":1}')).toEqual({ risk: 'LOW', summary: '' });
    expect(parseAiVerdict('{"risk":"WILD"}')).toBeNull();
    expect(parseAiVerdict('not-json')).toBeNull();
  });
});

describe('record()', () => {
  it('writes an entry with diff, actor name and heuristic verdict', async () => {
    const actor = await UserModel.create({
      auth: { email: 'ops@x.com' },
      profile: { first_name: 'Ada', last_name: 'Ops' },
    } as never);
    const pod = await seedPod();
    const before = snapshotPod(pod);
    pod.pod_amount = 1200;
    await pod.save();

    await podAuditService.record({
      pod,
      action: 'UPDATE',
      source: 'ADMIN',
      actorUserId: String(actor._id),
      before,
    });

    const log = await PodAuditLogModel.findOne({ pod_id: pod._id });
    expect(log).toMatchObject({
      pod_title: 'Sunset jam',
      actor_name: 'Ada Ops',
      source: 'ADMIN',
      action: 'UPDATE',
      ai_risk: 'HIGH',
    });
    expect(log!.changes).toEqual([expect.objectContaining({ field: 'pod_amount', from: '500', to: '1200' })]);
  });

  it('skips a no-op UPDATE and tolerates unknown actors + record failures', async () => {
    const pod = await seedPod();
    const before = snapshotPod(pod);
    await podAuditService.record({ pod, action: 'UPDATE', source: 'ADMIN', before });
    expect(await PodAuditLogModel.countDocuments({ pod_id: pod._id })).toBe(0);

    // CREATE without a before snapshot always records; bad actor id → null.
    await podAuditService.record({ pod, action: 'CREATE', source: 'CLUB_ADMIN', actorUserId: 'not-an-id' });
    const log = await PodAuditLogModel.findOne({ pod_id: pod._id });
    expect(log!.actor_user_id).toBeNull();
    expect(log!.actor_name).toBe('');

    // A storage failure is swallowed (best-effort) — the mutation never fails.
    jest.spyOn(PodAuditLogModel, 'create').mockRejectedValueOnce(new Error('db down') as never);
    await expect(
      podAuditService.record({ pod, action: 'DELETE', source: 'ADMIN' }),
    ).resolves.toBeUndefined();
  });
});

describe('reviewLogWithAi()', () => {
  const seedLog = async (over: Record<string, unknown> = {}) => {
    const pod = await seedPod();
    return PodAuditLogModel.create({
      pod_id: pod._id,
      pod_title: pod.pod_title,
      club_id: pod.club_id,
      source: 'ADMIN',
      action: 'UPDATE',
      changes: [{ field: 'pod_amount', from: '500', to: '900' }],
      note: 'test',
      ...over,
    });
  };

  it('falls back to the heuristic verdict when no key is configured', async () => {
    const log = await seedLog();
    await reviewLogWithAi(log);
    const saved = await PodAuditLogModel.findById(log._id);
    expect(saved!.ai_risk).toBe('HIGH');
    expect(saved!.ai_reviewed_at).not.toBeNull();
    expect(saved!.ai_summary).toContain('UPDATE');
  });

  it('applies the AI verdict when the call succeeds', async () => {
    mockEnv.mockImplementation(async (key: string) => (key === 'OPENAI_API_KEY' ? 'sk-test' : ''));
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"risk":"MEDIUM","summary":"Price nudged up before the event."}' } }],
      }),
    } as never);
    const log = await seedLog();
    await reviewLogWithAi(log);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );
    const saved = await PodAuditLogModel.findById(log._id);
    expect(saved!.ai_risk).toBe('MEDIUM');
    expect(saved!.ai_summary).toBe('Price nudged up before the event.');
  });

  it('keeps the heuristic on HTTP failure, bad JSON and thrown errors', async () => {
    mockEnv.mockImplementation(async (key: string) => (key === 'OPENAI_API_KEY' ? 'sk-test' : ''));
    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false } as never);
    const log = await seedLog();
    await reviewLogWithAi(log);
    expect((await PodAuditLogModel.findById(log._id))!.ai_risk).toBe('HIGH');

    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'garbage' } }] }),
    } as never);
    const log2 = await seedLog();
    await reviewLogWithAi(log2);
    expect((await PodAuditLogModel.findById(log2._id))!.ai_risk).toBe('HIGH');

    jest.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('net down') as never);
    const log3 = await seedLog({ ai_risk: 'LOW' });
    await expect(reviewLogWithAi(log3)).resolves.toBeUndefined();
  });
});

describe('monitoring queries + mutation hooks', () => {
  it('records ADMIN updates end-to-end through podService.update', async () => {
    const pod = await seedPod();
    await podService.update(String(pod._id), { pod_title: 'Renamed by ops' }, {
      actorUserId: String(new Types.ObjectId()),
      source: 'ADMIN',
    });
    const log = await PodAuditLogModel.findOne({ pod_id: pod._id });
    expect(log).toMatchObject({ action: 'UPDATE', source: 'ADMIN' });
    expect(log!.changes[0]).toMatchObject({ field: 'pod_title', to: 'Renamed by ops' });
  });

  it('serves the admin table with search, filters and paging', async () => {
    const pod = await seedPod();
    await podAuditService.record({ pod, action: 'CREATE', source: 'ADMIN' });
    await podAuditService.record({ pod, action: 'DELETE', source: 'CLUB_ADMIN', note: 'cleanup' });

    const all = await podAuditService.table();
    expect(all.total).toBe(2);
    expect(all.rows[0].pod_title).toBe('Sunset jam');

    const deletes = await podAuditService.table({
      filters: [{ field: 'action', op: 'eq', value: 'DELETE' }],
    });
    expect(deletes.total).toBe(1);
    expect(deletes.rows[0].ai_risk).toBe('HIGH');

    const searched = await podAuditService.table({ search: 'Sunset' });
    expect(searched.total).toBe(2);
    const paged = await podAuditService.table({ page: 2, page_size: 1 });
    expect(paged.rows).toHaveLength(1);
  });

  it('scopes the club-admin table to administered clubs (SUPER_ADMIN sees all)', async () => {
    const adminUser = new Types.ObjectId();
    const myClub = await ClubModel.create({
      club_id: `club-${new Types.ObjectId().toString()}`,
      club_name: 'Mine',
      admin_user_ids: [adminUser],
    });
    const minePod = await seedPod({ club_id: myClub._id });
    const otherPod = await seedPod();
    await podAuditService.record({ pod: minePod, action: 'UPDATE', source: 'CLUB_ADMIN', before: null });
    await podAuditService.record({ pod: otherPod, action: 'UPDATE', source: 'ADMIN', before: null });

    const scoped = await podAuditService.tableForClubAdmin({ id: String(adminUser), roles: ['CLUB_ADMIN'] });
    expect(scoped.total).toBe(1);
    expect(scoped.rows[0].pod_id).toBe(String(minePod._id));

    const all = await podAuditService.tableForClubAdmin({ id: String(adminUser), roles: ['SUPER_ADMIN'] });
    expect(all.total).toBe(2);
  });

  it('lists a single pod trail newest first and rejects junk ids', async () => {
    const pod = await seedPod();
    await podAuditService.record({ pod, action: 'CREATE', source: 'HOST' });
    await podAuditService.record({ pod, action: 'DELETE', source: 'HOST', note: 'bye' });
    const trail = await podAuditService.listForPod(String(pod._id));
    expect(trail).toHaveLength(2);
    expect(trail[0].action).toBe('DELETE');
    expect(await podAuditService.listForPod('junk')).toEqual([]);
  });
});
