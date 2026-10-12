import { Types } from 'mongoose';
import { podChallengeService } from '../../runtime/podChallenge.service';
import { podChallengeScoring } from '../../runtime/podChallenge.scoring';
import { PodChallengeModel } from '../../runtime/podChallenge.model';
import { ChallengeScoreEventModel } from '../../runtime/challengeLedger.model';
import { world, input } from './podChallenge.fixture';

type World = Awaited<ReturnType<typeof world>>;

const tool = (id: string, type: string, config: Record<string, unknown>, toolId: unknown) => ({
  instance_id: id,
  tool_id: toolId,
  tool_type: type,
  label: id,
  config,
});

/** A LIVE challenge with two competitors and one of each scoring tool. */
async function live(w: World, status = 'LIVE', extra: Record<string, unknown> = {}) {
  const c = await podChallengeService.create(input(w), w.hostU);
  await PodChallengeModel.updateOne(
    { _id: c.id },
    {
      status,
      competitors: [
        { competitor_id: 'a', name: 'Alpha' },
        { competitor_id: 'b', name: 'Bravo' },
      ],
      tools: [
        tool('runs', 'SCORE_COUNTER', { increments: [1, 4, 6], max_value: 10, counts_toward_total: true }, w.tool._id),
        tool('neg', 'NUMERIC_COUNTER', { increments: [2], allow_negative: true }, w.tool._id),
        tool('clock', 'TIMER', { record_competitor_times: true }, w.tool._id),
        tool('slow', 'TIMER', { record_competitor_times: false }, w.tool._id),
        tool('rank', 'RANKING', {}, w.tool._id),
        tool('dist', 'MEASUREMENT', {}, w.tool._id),
        tool('poll', 'POLL', {}, w.tool._id),
        tool('bare', 'SCORE_COUNTER', {}, w.tool._id),
      ],
      ...extra,
    }
  );
  await PodChallengeModel.collection.updateOne(
    { _id: new Types.ObjectId(c.id) },
    { $unset: { 'tools.7.config': '' } }
  );
  return c.id;
}

const score = (w: World, id: string, over: Record<string, unknown> = {}) => ({
  challenge_id: id,
  tool_instance_id: 'runs',
  competitor_id: 'a',
  value: 4,
  client_event_id: `e-${Math.random().toString(36).slice(2)}`,
  ...over,
});

describe('podChallengeScoring.record', () => {
  it('appends an INCREMENT event and reflects it in the standings', async () => {
    const w = await world();
    const id = await live(w);
    await podChallengeScoring.record(score(w, id), w.hostU);
    await podChallengeScoring.record(score(w, id, { value: 6 }), w.hostU);
    const events = await ChallengeScoreEventModel.find({ challenge_id: id }).sort({ revision: 1 }).lean();
    expect(events.map((e) => [e.event_type, e.value, e.voided])).toEqual([
      ['INCREMENT', 4, false],
      ['INCREMENT', 6, false],
    ]);
    expect(events[1].revision).toBe(events[0].revision + 1);
    expect((await PodChallengeModel.findById(id).lean())?.revision).toBeGreaterThanOrEqual(2);
  });

  it('is idempotent on client_event_id', async () => {
    const w = await world();
    const id = await live(w);
    const input1 = score(w, id, { client_event_id: 'same' });
    await podChallengeScoring.record(input1, w.hostU);
    await podChallengeScoring.record(input1, w.hostU);
    expect(await ChallengeScoreEventModel.countDocuments({ challenge_id: id })).toBe(1);
  });

  it('absorbs a duplicate-key race as an already-recorded event', async () => {
    const w = await world();
    const id = await live(w);
    const spy = jest.spyOn(ChallengeScoreEventModel, 'exists').mockResolvedValueOnce(null as never);
    await podChallengeScoring.record(score(w, id, { client_event_id: 'race' }), w.hostU);
    // the second call passes the exists() check (mocked) but hits the unique index
    spy.mockResolvedValueOnce(null as never);
    const view = await podChallengeScoring.record(score(w, id, { client_event_id: 'race' }), w.hostU);
    spy.mockRestore();
    expect(view.id).toBe(id);
    expect(await ChallengeScoreEventModel.countDocuments({ challenge_id: id })).toBe(1);
  });

  it('surfaces an unexpected write failure instead of treating it as a duplicate', async () => {
    const w = await world();
    const id = await live(w);
    const spy = jest.spyOn(ChallengeScoreEventModel, 'create').mockRejectedValueOnce(new Error('disk full'));
    await expect(podChallengeScoring.record(score(w, id), w.hostU)).rejects.toThrow('disk full');
    spy.mockRestore();
    expect(await ChallengeScoreEventModel.countDocuments({ challenge_id: id })).toBe(0);
  });

  it('rejects a missing or oversized client event id', async () => {
    const w = await world();
    const id = await live(w);
    await expect(podChallengeScoring.record(score(w, id, { client_event_id: '  ' }), w.hostU)).rejects.toThrow('client event id');
    await expect(podChallengeScoring.record(score(w, id, { client_event_id: 'x'.repeat(65) }), w.hostU)).rejects.toThrow(
      'client event id'
    );
  });

  it('only the pod host or staff may score', async () => {
    const w = await world();
    const id = await live(w);
    await expect(podChallengeScoring.record(score(w, id), w.guestU)).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
  });

  it('validates the competitor, the tool and the value for each tool kind', async () => {
    const w = await world();
    const id = await live(w);
    const run = (over: Record<string, unknown>) => podChallengeScoring.record(score(w, id, over), w.hostU);
    await expect(run({ competitor_id: 'zzz' })).rejects.toThrow('Unknown competitor');
    await expect(run({ tool_instance_id: 'nope' })).rejects.toThrow('not part of the challenge');
    await expect(run({ value: Number.NaN })).rejects.toThrow('Score must be a number');
    await expect(run({ value: 5 })).rejects.toThrow('not one of this tool');
    await expect(run({ tool_instance_id: 'neg', value: -2 })).resolves.toBeDefined();
    await expect(run({ tool_instance_id: 'bare', value: 1 })).rejects.toThrow('not one of this tool');
    await expect(run({ tool_instance_id: 'slow', value: 3 })).rejects.toThrow('does not record times');
    await expect(run({ tool_instance_id: 'clock', value: 12.5 })).resolves.toBeDefined();
    await expect(run({ tool_instance_id: 'clock', value: -1 })).rejects.toThrow('cannot be negative');
    await expect(run({ tool_instance_id: 'poll', value: 1 })).rejects.toThrow('does not take scores');
    await expect(run({ tool_instance_id: 'dist', value: 7.25 })).resolves.toBeDefined();
    await expect(run({ tool_instance_id: 'rank', value: 3 })).rejects.toThrow('Rank must be between 1 and 2');
    await expect(run({ tool_instance_id: 'rank', value: 1.5 })).rejects.toThrow('Rank must be between 1 and 2');
    await expect(run({ tool_instance_id: 'rank', value: 2 })).resolves.toBeDefined();
  });

  it('stops a counter at its max_value', async () => {
    const w = await world();
    const id = await live(w);
    await podChallengeScoring.record(score(w, id, { value: 6 }), w.hostU);
    await podChallengeScoring.record(score(w, id, { value: 4 }), w.hostU);
    await expect(podChallengeScoring.record(score(w, id, { value: 1 }), w.hostU)).rejects.toThrow(
      'cannot go above 10'
    );
    // another competitor has their own running sum
    await expect(podChallengeScoring.record(score(w, id, { competitor_id: 'b', value: 6 }), w.hostU)).resolves.toBeDefined();
  });

  it('refuses scores while a draft and demands a reason for corrections after completion', async () => {
    const w = await world();
    const draft = await live(w, 'DRAFT');
    await expect(podChallengeScoring.record(score(w, draft), w.hostU)).rejects.toThrow('only change while the challenge is live');
    const done = await live(w, 'COMPLETED');
    await expect(podChallengeScoring.record(score(w, done), w.hostU)).rejects.toThrow('needs a reason');
    await podChallengeScoring.record(score(w, done, { reason: 'Missed boundary' }), w.hostU);
    const audit = await PodChallengeModel.findById(done).lean();
    expect(audit?.status).toBe('COMPLETED');
  });

  it('after publishing, only staff may correct', async () => {
    const w = await world();
    const id = await live(w, 'COMPLETED', { result_version: 1 });
    await expect(podChallengeScoring.record(score(w, id, { reason: 'fix' }), w.hostU)).rejects.toMatchObject({
      message: 'Published results can only be corrected by Challenge staff',
    });
    const staff = { ...w.hostU, roles: ['CHALLENGE_MANAGER'] } as typeof w.hostU;
    await expect(podChallengeScoring.record(score(w, id, { reason: 'fix' }), staff)).resolves.toBeDefined();
  });
});

describe('podChallengeScoring.void and recent', () => {
  it('voids a score once, with the reason on record', async () => {
    const w = await world();
    const id = await live(w);
    await podChallengeScoring.record(score(w, id), w.hostU);
    const event = (await ChallengeScoreEventModel.findOne({ challenge_id: id }).lean())!;
    await podChallengeScoring.void(String(event._id), ' typo ', w.hostU);
    const after = await ChallengeScoreEventModel.findById(event._id).lean();
    expect(after).toMatchObject({ voided: true, void_reason: 'typo' });
    expect(String(after?.voided_by)).toBe(String(w.host._id));
    await expect(podChallengeScoring.void(String(event._id), null, w.hostU)).rejects.toThrow('already removed');
  });

  it('rejects bad, unknown and unauthorised voids', async () => {
    const w = await world();
    const id = await live(w);
    await podChallengeScoring.record(score(w, id), w.hostU);
    const event = (await ChallengeScoreEventModel.findOne({ challenge_id: id }).lean())!;
    await expect(podChallengeScoring.void('x', null, w.hostU)).rejects.toThrow('Invalid score id');
    await expect(podChallengeScoring.void(String(new Types.ObjectId()), null, w.hostU)).rejects.toThrow('Score not found');
    await expect(podChallengeScoring.void(String(event._id), null, w.guestU)).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
  });

  it('voiding after completion needs a reason', async () => {
    const w = await world();
    const id = await live(w);
    await podChallengeScoring.record(score(w, id), w.hostU);
    await PodChallengeModel.updateOne({ _id: id }, { status: 'COMPLETED' });
    const event = (await ChallengeScoreEventModel.findOne({ challenge_id: id }).lean())!;
    await expect(podChallengeScoring.void(String(event._id), '  ', w.hostU)).rejects.toThrow('needs a reason');
    await podChallengeScoring.void(String(event._id), 'wrong player', w.hostU);
    expect((await ChallengeScoreEventModel.findById(event._id).lean())?.voided).toBe(true);
  });

  it('lists recent entries newest first and bounds the limit', async () => {
    const w = await world();
    const id = await live(w);
    for (const [i, value] of [1, 4, 4].entries()) {
      await podChallengeScoring.record(score(w, id, { value, client_event_id: `r${i}` }), w.hostU);
      await ChallengeScoreEventModel.collection.updateOne(
        { challenge_id: new Types.ObjectId(id), client_event_id: `r${i}` },
        { $set: { created_at: new Date(2026, 0, 1, 0, 0, i) } }
      );
    }
    const all = await podChallengeScoring.recent(id, w.hostU);
    expect(all.map((e) => e.value)).toEqual([4, 4, 1]);
    expect(all[0]).toMatchObject({ voided: false, void_reason: '', competitor_id: 'a' });
    expect(all[0].created_at).toBe(new Date(2026, 0, 1, 0, 0, 2).toISOString());
    expect(await podChallengeScoring.recent(id, w.hostU, 0)).toHaveLength(1);
    expect(await podChallengeScoring.recent(id, w.hostU, 1000)).toHaveLength(3);
    await expect(podChallengeScoring.recent(id, w.guestU)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
  });
});
