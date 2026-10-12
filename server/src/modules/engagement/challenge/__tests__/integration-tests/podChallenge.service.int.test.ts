import { Types } from 'mongoose';
import { podChallengeService } from '../../runtime/podChallenge.service';
import { PodChallengeModel } from '../../runtime/podChallenge.model';
import { podChallengeNotify } from '../../runtime/podChallenge.notify';
import { ChallengeModel } from '../../challenge.model';
import { ChallengeToolModel } from '../../tools/challengeTool.model';
import { world, asUser, input } from './podChallenge.fixture';
import { ChallengeCategoryMappingModel } from '../../mapping/challengeMapping.model';
import { ChallengeScoreEventModel } from '../../runtime/challengeLedger.model';
import { PodModel } from '@modules/pods/pod/pod.model';

jest.mock('../../runtime/podChallenge.notify', () => ({
  ...jest.requireActual('../../runtime/podChallenge.notify'),
  podChallengeNotify: { auto: jest.fn().mockResolvedValue(undefined) },
}));


describe('podChallengeService.setup and create', () => {
  it('shows the host what the pod may run and refuses everyone else', async () => {
    const w = await world();
    const setup = await podChallengeService.setup(String(w.pod._id), w.hostU);
    expect(setup).toMatchObject({ enabled: true, require_challenge: true, allow_host_customization: false });
    expect(setup.template_ids).toEqual([String(w.template._id)]);
    await expect(podChallengeService.setup(String(w.pod._id), w.guestU)).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
    await expect(podChallengeService.setup('nope', w.hostU)).rejects.toThrow('Invalid pod id');
    await expect(podChallengeService.setup(String(new Types.ObjectId()), w.hostU)).rejects.toThrow('Pod not found');
  });

  it('staff may manage a pod they do not host', async () => {
    const w = await world();
    const staff = asUser(new Types.ObjectId(), ['CHALLENGE_MANAGER']);
    const view = await podChallengeService.create(input(w), staff);
    expect(view.status).toBe('DRAFT');
  });

  it('creates a DRAFT from the template, snapshotting tools and defaulting the name', async () => {
    const w = await world();
    const view = await podChallengeService.create(input(w), w.hostU);
    expect(view).toMatchObject({ name: 'Cup', status: 'DRAFT' });
    const stored = await PodChallengeModel.findById(view.id).lean();
    expect(stored?.tools).toHaveLength(1);
    expect(String(stored?.created_by)).toBe(String(w.host._id));
    const named = await podChallengeService.create({ ...input(w), name: '  Derby  ' }, w.hostU);
    expect(named.name).toBe('Derby');
  });

  it('refuses a bad, unknown, inactive or out-of-scope template', async () => {
    const w = await world();
    await expect(podChallengeService.create({ ...input(w), template_id: 'x' }, w.hostU)).rejects.toThrow('Invalid template id');
    await expect(
      podChallengeService.create({ ...input(w), template_id: String(new Types.ObjectId()) }, w.hostU)
    ).rejects.toThrow('This template is not available');
    await ChallengeModel.updateOne({ _id: w.template._id }, { is_active: false });
    await expect(podChallengeService.create(input(w), w.hostU)).rejects.toThrow('This template is not available');
    await expect(podChallengeService.create(input(w), w.guestU)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
  });

  it('applies host tool overrides only when the category allows customisation', async () => {
    const w = await world();
    const overrides = [{ instance_id: 'runs', config_json: JSON.stringify({ weight: 3 }) }];
    await expect(podChallengeService.create({ ...input(w), tool_overrides: overrides }, w.hostU)).rejects.toThrow(
      'Hosts cannot customise tools'
    );
    await ChallengeCategoryMappingModel.updateOne({ category_id: w.sub._id }, { allow_host_customization: true });
    const view = await podChallengeService.create({ ...input(w), tool_overrides: overrides }, w.hostU);
    const stored = await PodChallengeModel.findById(view.id).lean();
    expect((stored?.tools[0].config as { weight: number }).weight).toBe(3);
    await expect(
      podChallengeService.create(
        { ...input(w), tool_overrides: [{ instance_id: 'runs', config_json: '{nope' }] },
        w.hostU
      )
    ).rejects.toThrow('not valid JSON');
  });
});

describe('podChallengeService visibility', () => {
  it('lists drafts only for managers and published ones for attendees', async () => {
    const w = await world();
    const draft = await podChallengeService.create(input(w), w.hostU);
    expect(await podChallengeService.listForPod(String(w.pod._id), w.hostU)).toHaveLength(1);
    expect(await podChallengeService.listForPod(String(w.pod._id), w.guestU)).toHaveLength(0);
    expect(await podChallengeService.listForPod(String(w.pod._id), null)).toHaveLength(0);
    await expect(podChallengeService.get(draft.id, w.guestU)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    expect((await podChallengeService.get(draft.id, w.hostU)).id).toBe(draft.id);
  });

  it('flags an open challenge whose template left the category', async () => {
    const w = await world();
    await podChallengeService.create(input(w), w.hostU);
    expect((await podChallengeService.listForPod(String(w.pod._id), w.hostU))[0]).toMatchObject({ eligibility_warning: false });
    await ChallengeModel.updateOne({ _id: w.template._id }, { is_active: false });
    expect((await podChallengeService.listForPod(String(w.pod._id), w.hostU))[0]).toMatchObject({ eligibility_warning: true });
  });
});

describe('podChallengeService.updateSettings', () => {
  it('updates name, flags and schedule', async () => {
    const w = await world();
    const c = await podChallengeService.create(input(w), w.hostU);
    const when = '2026-08-01T17:00:00.000Z';
    const out = await podChallengeService.updateSettings(
      c.id,
      { name: ' Final ', show_on_pod_details: false, auto_email: true, scheduled_for: when },
      w.hostU
    );
    expect(out.name).toBe('Final');
    const stored = await PodChallengeModel.findById(c.id).lean();
    expect(stored).toMatchObject({ show_on_pod_details: false, auto_email: true });
    expect(stored?.scheduled_for?.toISOString()).toBe(when);
    await podChallengeService.updateSettings(c.id, { scheduled_for: null }, w.hostU);
    expect((await PodChallengeModel.findById(c.id).lean())?.scheduled_for).toBeNull();
  });

  it('refuses blank names, bad dates, non-managers and unknown challenges', async () => {
    const w = await world();
    const c = await podChallengeService.create(input(w), w.hostU);
    await expect(podChallengeService.updateSettings(c.id, { name: '  ' }, w.hostU)).rejects.toThrow('A challenge name is required');
    await expect(podChallengeService.updateSettings(c.id, { scheduled_for: 'soon' }, w.hostU)).rejects.toThrow('Invalid schedule time');
    await expect(podChallengeService.updateSettings(c.id, { enabled: false }, w.guestU)).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
    await expect(podChallengeService.updateSettings('x', {}, w.hostU)).rejects.toThrow('Invalid challenge id');
    await expect(podChallengeService.updateSettings(String(new Types.ObjectId()), {}, w.hostU)).rejects.toThrow('Challenge not found');
  });

  it('cannot switch a live challenge off', async () => {
    const w = await world();
    const c = await podChallengeService.create(input(w), w.hostU);
    await PodChallengeModel.updateOne({ _id: c.id }, { status: 'LIVE' });
    await expect(podChallengeService.updateSettings(c.id, { enabled: false }, w.hostU)).rejects.toThrow(
      'Pause or end the live challenge'
    );
    expect((await PodChallengeModel.findById(c.id).lean())?.enabled).toBe(true);
  });
});

describe('podChallengeService.setRoster', () => {
  const people = [{ competitor_id: 'a', name: ' Alpha ' }, { name: 'Bravo', user_id: undefined }];

  it('stores competitors with generated ids and an audit trail', async () => {
    const w = await world();
    const c = await podChallengeService.create(input(w), w.hostU);
    await podChallengeService.setRoster(c.id, { competitors: people, judge_user_ids: [String(w.guest._id)] }, w.hostU);
    const stored = await PodChallengeModel.findById(c.id).lean();
    expect(stored?.competitors.map((x) => x.name)).toEqual(['Alpha', 'Bravo']);
    expect(stored?.competitors[0].competitor_id).toBe('a');
    expect(stored?.competitors[1].competitor_id).toHaveLength(8);
    expect(stored?.judge_user_ids.map(String)).toEqual([String(w.guest._id)]);
  });

  it('enforces the category competitor cap and attendee-only linking', async () => {
    const w = await world({ maxCompetitors: 1 });
    const c = await podChallengeService.create(input(w), w.hostU);
    await expect(podChallengeService.setRoster(c.id, { competitors: people }, w.hostU)).rejects.toThrow('at most 1 competitors');
    await expect(
      podChallengeService.setRoster(c.id, { competitors: [{ name: 'Z', user_id: String(new Types.ObjectId()) }] }, w.hostU)
    ).rejects.toThrow('not a confirmed attendee');
    await expect(
      podChallengeService.setRoster(c.id, { competitors: [{ name: 'Z' }], judge_user_ids: [String(new Types.ObjectId())] }, w.hostU)
    ).rejects.toThrow('Judges must be hosts or confirmed attendees');
  });

  it('refuses to drop a competitor that already has scores', async () => {
    const w = await world();
    const c = await podChallengeService.create(input(w), w.hostU);
    await podChallengeService.setRoster(c.id, { competitors: people }, w.hostU);
    await ChallengeScoreEventModel.create({
      challenge_id: c.id,
      pod_id: w.pod._id,
      tool_instance_id: 'runs',
      competitor_id: 'a',
      event_type: 'INCREMENT',
      value: 1,
      voided: false,
      revision: 1,
      client_event_id: 'e1',
      performed_by: w.host._id,
    });
    await expect(
      podChallengeService.setRoster(c.id, { competitors: [{ competitor_id: 'b', name: 'Bravo' }] }, w.hostU)
    ).rejects.toThrow('cannot be removed');
  });

  it('freezes the roster once the challenge is finished', async () => {
    const w = await world();
    const c = await podChallengeService.create(input(w), w.hostU);
    await PodChallengeModel.updateOne({ _id: c.id }, { status: 'COMPLETED' });
    await expect(podChallengeService.setRoster(c.id, { competitors: people }, w.hostU)).rejects.toThrow(
      'cannot change'
    );
  });
});

describe('podChallengeService.transition', () => {
  it('walks DRAFT to LIVE and notifies attendees once the start is committed', async () => {
    const w = await world();
    const c = await podChallengeService.create(input(w), w.hostU);
    await expect(podChallengeService.transition(c.id, 'START', w.hostU)).rejects.toThrow('Add at least one competitor');
    await podChallengeService.setRoster(c.id, { competitors: [{ name: 'Alpha' }] }, w.hostU);
    const live = await podChallengeService.transition(c.id, 'START', w.hostU);
    expect(live.status).toBe('LIVE');
    const stored = await PodChallengeModel.findById(c.id).lean();
    expect(stored?.started_at).toBeInstanceOf(Date);
    expect(podChallengeNotify.auto).toHaveBeenCalledWith(expect.objectContaining({ status: 'LIVE' }), 'Sunday Match', 'LIVE', String(w.host._id));
    await expect(podChallengeService.transition(c.id, 'START', w.hostU)).rejects.toThrow('Cannot start a live challenge');
  });

  it('refuses to start a disabled or tool-less challenge', async () => {
    const w = await world();
    const c = await podChallengeService.create(input(w), w.hostU);
    await podChallengeService.setRoster(c.id, { competitors: [{ name: 'Alpha' }] }, w.hostU);
    await PodChallengeModel.updateOne({ _id: c.id }, { enabled: false });
    await expect(podChallengeService.transition(c.id, 'START', w.hostU)).rejects.toThrow('Turn the challenge on');
    await PodChallengeModel.updateOne({ _id: c.id }, { enabled: true, tools: [] });
    await expect(podChallengeService.transition(c.id, 'START', w.hostU)).rejects.toThrow('no tools to run');
  });

  it('pausing folds the running clock into elapsed time and keeps votes open; completing closes them', async () => {
    const w = await world();
    const c = await podChallengeService.create(input(w), w.hostU);
    await PodChallengeModel.updateOne(
      { _id: c.id },
      {
        status: 'LIVE',
        competitors: [{ competitor_id: 'a', name: 'Alpha' }],
        tool_state: [
          {
            instance_id: 'runs',
            clock_running: true,
            clock_started_at: new Date(Date.now() - 5000),
            clock_elapsed_ms: 1000,
            voting_open: true,
          },
          { instance_id: 'idle', clock_running: false, clock_elapsed_ms: 250, voting_open: true },
        ],
      }
    );
    await podChallengeService.transition(c.id, 'PAUSE', w.hostU);
    const paused = await PodChallengeModel.findById(c.id).lean();
    const [running, idle] = paused!.tool_state;
    expect(running.clock_running).toBe(false);
    expect(running.clock_elapsed_ms).toBeGreaterThanOrEqual(6000);
    expect(running.voting_open).toBe(true);
    expect(idle.clock_elapsed_ms).toBe(250);
    await podChallengeService.transition(c.id, 'RESUME', w.hostU);
    await podChallengeService.transition(c.id, 'COMPLETE', w.hostU);
    const done = await PodChallengeModel.findById(c.id).lean();
    expect(done?.status).toBe('COMPLETED');
    expect(done?.completed_at).toBeInstanceOf(Date);
    expect(done?.tool_state.every((s) => !s.voting_open)).toBe(true);
  });

  it('cancels a draft and rejects transitions a guest attempts', async () => {
    const w = await world();
    const c = await podChallengeService.create(input(w), w.hostU);
    await expect(podChallengeService.transition(c.id, 'CANCEL', w.guestU)).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
    const out = await podChallengeService.transition(c.id, 'CANCEL', w.hostU);
    expect(out.status).toBe('CANCELLED');
    await expect(podChallengeService.transition(c.id, 'PAUSE', w.hostU)).rejects.toThrow('Cannot pause a cancelled challenge');
  });

  it('a clock with no stored elapsed time starts from zero when paused', async () => {
    const w = await world();
    const c = await podChallengeService.create(input(w), w.hostU);
    await PodChallengeModel.collection.updateOne(
      { _id: new Types.ObjectId(c.id) },
      {
        $set: {
          status: 'LIVE',
          tool_state: [
            { instance_id: 'a', clock_running: true, clock_started_at: new Date(Date.now() - 2000) },
            { instance_id: 'b' },
          ],
        },
      }
    );
    await podChallengeService.transition(c.id, 'PAUSE', w.hostU);
    const [a, b] = (await PodChallengeModel.findById(c.id).lean())!.tool_state;
    expect(a.clock_elapsed_ms).toBeGreaterThanOrEqual(2000);
    expect(b.clock_elapsed_ms).toBe(0);
  });
});

describe('podChallengeService team mode and edge shapes', () => {
  it('keeps players of surviving teams when the players list is omitted, and replaces them when given', async () => {
    const w = await world();
    const c = await podChallengeService.create(input(w), w.hostU);
    await PodChallengeModel.updateOne({ _id: c.id }, { participant_mode: 'TEAM' });
    await podChallengeService.setRoster(
      c.id,
      { competitors: [{ competitor_id: 't1', name: 'Reds' }, { competitor_id: 't2', name: 'Blues' }], players: [
        { name: 'Ann', team_id: 't1' },
        { name: 'Bob', team_id: 't2' },
      ] },
      w.hostU
    );
    await podChallengeService.setRoster(c.id, { competitors: [{ competitor_id: 't1', name: 'Reds' }] }, w.hostU);
    let stored = await PodChallengeModel.findById(c.id).lean();
    expect(stored?.players.map((p) => p.name)).toEqual(['Ann']);
    await podChallengeService.setRoster(
      c.id,
      { competitors: [{ competitor_id: 't1', name: 'Reds' }], players: [{ name: 'Cy', team_id: 't1' }] },
      w.hostU
    );
    stored = await PodChallengeModel.findById(c.id).lean();
    expect(stored?.players.map((p) => p.name)).toEqual(['Cy']);
    await expect(
      podChallengeService.setRoster(c.id, { competitors: [{ competitor_id: 't1', name: 'Reds' }], players: [{ name: 'Dee', team_id: 'ghost' }] }, w.hostU)
    ).rejects.toThrow('team that does not exist');
  });

  it('individual mode never stores players', async () => {
    const w = await world();
    const c = await podChallengeService.create(input(w), w.hostU);
    await podChallengeService.setRoster(
      c.id,
      { competitors: [{ competitor_id: 'p1', name: 'Solo' }], players: [{ name: 'X', team_id: 'p1' }] },
      w.hostU
    );
    expect((await PodChallengeModel.findById(c.id).lean())?.players).toEqual([]);
  });

  it('a settings update without a schedule leaves it alone and may switch a draft off', async () => {
    const w = await world();
    const c = await podChallengeService.create(input(w), w.hostU);
    await podChallengeService.updateSettings(c.id, { enabled: false }, w.hostU);
    expect((await PodChallengeModel.findById(c.id).lean())?.enabled).toBe(false);
  });

  it('a pod with no club category has no eligibility mapping, so the competitor cap is 0 (unlimited)', async () => {
    const w = await world();
    const c = await podChallengeService.create(input(w), w.hostU);
    await PodModel.updateOne({ _id: w.pod._id }, { club_id: null });
    const many = Array.from({ length: 5 }, (_, i) => ({ name: `P${i}` }));
    await podChallengeService.setRoster(c.id, { competitors: many }, w.hostU);
    expect((await PodChallengeModel.findById(c.id).lean())?.competitors).toHaveLength(5);
  });

  it('only tools with live state get a tool_state row', async () => {
    const w = await world();
    const quiz = await ChallengeToolModel.create({ tool_type: 'QUIZ', name: 'Quiz', status: 'ACTIVE' });
    await ChallengeCategoryMappingModel.updateOne({ category_id: w.sub._id }, { $push: { allowed_tool_ids: quiz._id } });
    const instance = (id: string, type: string, toolId: unknown) => ({ instance_id: id, tool_id: toolId, tool_type: type, label: id });
    await ChallengeModel.updateOne(
      { _id: w.template._id },
      { tool_instances: [instance('runs', 'SCORE_COUNTER', w.tool._id), instance('q', 'QUIZ', quiz._id), instance('ghost', 'GHOST', w.tool._id)] }
    );
    const view = await podChallengeService.create(input(w), w.hostU);
    const stored = await PodChallengeModel.findById(view.id).lean();
    expect(stored?.tool_state.map((s) => s.instance_id)).toEqual(['q']);
  });
});
