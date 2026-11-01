/**
 * The marketing run log against a real database: a workflow wrapped in
 * withRun records its steps and outcome; a person decides, stops and retries
 * runs; the table and summary read them back.
 */
import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { MarketingRunModel } from '../../marketingRun.model';
import {
  continueRun,
  decideRun,
  marketingRunService as svc,
  registerRunHandlers,
  startRun,
  statusFromSteps,
  userActor,
  withRun,
} from '../../marketingRun.service';

const actor = { kind: 'USER' as const, id: new Types.ObjectId().toHexString(), name: 'Asha Marketing', email: 'asha@duncit.test' };

afterEach(async () => {
  await Promise.all([MarketingRunModel.deleteMany({}), UserModel.deleteMany({})]);
});

describe('statusFromSteps', () => {
  it('reads the outcome off the steps', () => {
    expect(statusFromSteps([])).toBe('COMPLETED');
    expect(statusFromSteps([{ status: 'OK' }, { status: 'SKIPPED' }])).toBe('COMPLETED');
    expect(statusFromSteps([{ status: 'OK' }, { status: 'FAILED' }])).toBe('PARTIAL');
    expect(statusFromSteps([{ status: 'FAILED' }])).toBe('FAILED');
  });
});

describe('withRun', () => {
  it('records each step with its summary and timing, and completes', async () => {
    const result = await withRun(
      { workflow: 'SOCIAL_PUBLISH', name: 'Publish: hello to 2 accounts', trigger: 'SCHEDULE', actor, links: { post_id: 'p1' } },
      async (run) => {
        const first = await run.step('ig', 'Instagram', async () => ({ id: 'ig-9' }), {
          tool: 'instagram.publish',
          input_summary: 'hello',
          summarize: (r) => `posted ${r.id}`,
        });
        await run.api({ service: 'Instagram', method: 'POST', url: '/media', status: 200, ms: 120, summary: 'container' });
        await run.cost({ tokens_in: 10, tokens_out: 5, amount: 0.02 });
        return first.id;
      }
    );
    expect(result).toBe('ig-9');
    const [doc] = await svc.table().then((page) => page.rows);
    expect(doc).toMatchObject({
      workflow: 'SOCIAL_PUBLISH',
      status: 'COMPLETED',
      trigger: 'SCHEDULE',
      actor: { kind: 'USER', name: 'Asha Marketing' },
      links: { post_id: 'p1', account_id: '' },
      cost: { tokens_in: 10, tokens_out: 5, amount: 0.02 },
      can_retry: false,
    });
    expect(doc.steps).toHaveLength(1);
    expect(doc.steps[0]).toMatchObject({ key: 'ig', label: 'Instagram', status: 'OK', tool: 'instagram.publish', input_summary: 'hello', output_summary: 'posted ig-9' });
    expect(doc.steps[0].finished_at).not.toBeNull();
    expect(doc.api_log).toHaveLength(1);
    expect(doc.api_log[0]).toMatchObject({ service: 'Instagram', status: 200, summary: 'container' });
    expect(doc.started_at).not.toBeNull();
    expect(doc.finished_at).not.toBeNull();
  });

  it('is PARTIAL when a step failed but the body carried on, FAILED when the body threw', async () => {
    await withRun({ workflow: 'SOCIAL_SYNC', name: 'Sync 2 accounts' }, async (run) => {
      await run.step('a', 'A', async () => 'ok');
      await run.step('b', 'B', async () => {
        throw new Error('rate limited');
      }).catch(() => undefined);
    });
    await expect(
      withRun({ workflow: 'LEAD_SEARCH', name: 'Find cafes' }, async (run) => {
        await run.step('plan', 'Plan', async () => 'ok');
        throw new Error('search quota exhausted');
      })
    ).rejects.toThrow('search quota exhausted');
    const rows = (await svc.table({ sort_by: 'created_at', sort_dir: 'asc' })).rows;
    expect(rows.map((r) => [r.workflow, r.status, r.error])).toEqual([
      ['SOCIAL_SYNC', 'PARTIAL', ''],
      ['LEAD_SEARCH', 'FAILED', 'search quota exhausted'],
    ]);
    expect(rows[0].steps.map((s) => [s.key, s.status, s.error])).toEqual([
      ['a', 'OK', ''],
      ['b', 'FAILED', 'rate limited'],
    ]);
  });

  it('ends CANCELLED when a stop was requested while it ran', async () => {
    let seen = false;
    await withRun({ workflow: 'AGENT', name: 'Agent' }, async (run) => {
      await svc.cancel(run.id);
      seen = await run.cancelled();
    });
    expect(seen).toBe(true);
    expect((await svc.table()).rows[0]).toMatchObject({ status: 'CANCELLED', cancel_requested: true });
  });
});

describe('approval', () => {
  it('starts waiting, continues through the workflow handler once approved', async () => {
    const continued: string[] = [];
    registerRunHandlers('REEL', {
      onDecision: async (run, decision) => {
        continued.push(decision);
        if (decision === 'APPROVED') await continueRun(String(run._id), async (ctx) => ctx.step('publish', 'Publish', async () => 'out'));
      },
    });
    const id = await startRun({ workflow: 'REEL', name: 'Diwali reel', actor, approval_required: true });
    expect(await svc.get(id)).toMatchObject({ status: 'AWAITING_APPROVAL', approval: { required: true, decision: null } });
    expect(await svc.summary(actor.id)).toMatchObject({ awaiting_approval: 1, mine_open: 1 });

    const decided = await decideRun(id, 'APPROVED', { id: 'mgr', name: 'Meera' }, '');
    expect(decided.approval).toMatchObject({ decision: 'APPROVED', decided_by: 'mgr', decided_by_name: 'Meera' });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(continued).toEqual(['APPROVED']);
    expect(await svc.get(id)).toMatchObject({ status: 'COMPLETED' });
  });

  it('needs a note to reject or ask for changes, and then cancels the run', async () => {
    const id = await startRun({ workflow: 'OUTREACH', name: 'Venue sequence', approval_required: true });
    await expect(decideRun(id, 'REJECTED', { id: 'mgr', name: 'Meera' }, '  ')).rejects.toThrow('a note is required');
    const rejected = await decideRun(id, 'CHANGES_REQUESTED', { id: 'mgr', name: 'Meera' }, 'Soften the opener');
    expect(rejected).toMatchObject({ status: 'CANCELLED', approval: { decision: 'CHANGES_REQUESTED', note: 'Soften the opener' } });
    expect(rejected.finished_at).not.toBeNull();
    await expect(decideRun(id, 'APPROVED', { id: 'mgr', name: 'Meera' }, '')).rejects.toThrow('not waiting for a decision');
  });
});

describe('cancel and retry', () => {
  it('stops a pending run at once and only flags a running one', async () => {
    const pending = await startRun({ workflow: 'OTHER', name: 'Pending' });
    expect(await svc.cancel(pending)).toMatchObject({ status: 'CANCELLED', cancel_requested: true });
    await expect(svc.cancel(pending)).rejects.toThrow('already finished');

    const running = await startRun({ workflow: 'OTHER', name: 'Running' });
    await MarketingRunModel.updateOne({ _id: running }, { $set: { status: 'RUNNING' } });
    expect(await svc.cancel(running)).toMatchObject({ status: 'RUNNING', cancel_requested: true });
  });

  it('retries through the workflow handler, counting the attempt', async () => {
    const retried: string[] = [];
    registerRunHandlers('CAMPAIGN', { retry: async (run) => void retried.push(String(run._id)) });
    const id = await startRun({ workflow: 'CAMPAIGN', name: 'Send' });
    await MarketingRunModel.updateOne({ _id: id }, { $set: { status: 'FAILED', error: 'smtp down', finished_at: new Date() } });
    expect(await svc.get(id)).toMatchObject({ can_retry: true });
    const again = await svc.retry(id);
    expect(again).toMatchObject({ status: 'PENDING', retries: 1, error: '' });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(retried).toEqual([id]);
    await expect(svc.retry(id)).rejects.toThrow('Only a failed or partly completed run');
  });

  it('fails the run again when the retry itself throws', async () => {
    registerRunHandlers('AGENT', {
      retry: async () => {
        throw new Error('the agent is gone');
      },
    });
    const id = await startRun({ workflow: 'AGENT', name: 'Agent' });
    await MarketingRunModel.updateOne({ _id: id }, { $set: { status: 'FAILED' } });
    await svc.retry(id);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(await svc.get(id)).toMatchObject({ status: 'FAILED', retries: 1, error: 'the agent is gone' });
    expect((await svc.get(id)).finished_at).not.toBeNull();
  });

  it('refuses a retry for a workflow that has no way to run again', async () => {
    const id = await startRun({ workflow: 'OTHER', name: 'One-off' });
    await MarketingRunModel.updateOne({ _id: id }, { $set: { status: 'FAILED' } });
    expect(await svc.get(id)).toMatchObject({ can_retry: false });
    await expect(svc.retry(id)).rejects.toThrow('cannot be retried');
  });

  it('answers not found for an unknown id', async () => {
    await expect(svc.get(new Types.ObjectId().toHexString())).rejects.toThrow('Run not found');
    await expect(svc.get('nope')).rejects.toThrow('Run not found');
  });
});

describe('table and summary', () => {
  it('filters by workflow, status and what a run touched, and counts the week’s failures', async () => {
    await startRun({ workflow: 'SOCIAL_PUBLISH', name: 'Post A', links: { account_id: 'acc-1' } });
    await startRun({ workflow: 'LEAD_SEARCH', name: 'Search B', actor });
    const failedId = await startRun({ workflow: 'SOCIAL_PUBLISH', name: 'Post C', links: { account_id: 'acc-1' } });
    await MarketingRunModel.updateOne({ _id: failedId }, { $set: { status: 'FAILED', finished_at: new Date() } });

    const byWorkflow = await svc.table({ filters: [{ field: 'workflow', op: 'eq', value: 'SOCIAL_PUBLISH' }] });
    expect(byWorkflow.total).toBe(2);
    const byAccount = await svc.table({ filters: [{ field: 'account_id', op: 'eq', value: 'acc-1' }, { field: 'status', op: 'eq', value: 'FAILED' }] });
    expect(byAccount.rows.map((r) => r.name)).toEqual(['Post C']);
    const searched = await svc.table({ search: 'Search' });
    expect(searched.rows.map((r) => r.name)).toEqual(['Search B']);

    expect(await svc.summary(actor.id)).toEqual({ awaiting_approval: 0, running: 2, failed_7d: 1, mine_open: 1 });
  });
});

describe('userActor', () => {
  it('names the signed-in person from their account', async () => {
    // Written raw: only the name and email matter here, not the account's other required fields.
    const userId = new Types.ObjectId();
    await UserModel.collection.insertOne({ _id: userId, profile: { first_name: 'Asha', last_name: 'Rao' }, auth: { email: 'asha@duncit.test' } });
    expect(await userActor({ id: String(userId) })).toEqual({ kind: 'USER', id: String(userId), name: 'Asha Rao', email: 'asha@duncit.test' });
    expect(await userActor({ id: new Types.ObjectId().toHexString(), email: 'x@duncit.test' })).toMatchObject({ name: '', email: 'x@duncit.test' });
  });
});
