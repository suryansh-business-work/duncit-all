import { logs } from '@observability/log';
import {
  AutomationFlowModel,
  AutomationRunModel,
  type AutomationContact,
  type AutomationEdge,
  type AutomationGraph,
  type AutomationNode,
  type IAutomationRun,
} from '../../automation.model';
import {
  cancelRun,
  contactKey,
  resumeDelay,
  resumeTimeout,
  resumeWithReply,
  startRun,
  type StartRunInput,
} from '../../automation.engine';
import { sendWhatsappStep } from '../../automation.send';

// The send module talks to AiSensy / the mailer; the engine only needs a step
// that can throw, so it is replaced wholesale.
jest.mock('../../automation.send', () => ({ sendWhatsappStep: jest.fn(), sendEmailStep: jest.fn() }));

const contact: AutomationContact = { name: 'Asha', phone: '910000000000', email: '' };

const n = (id: string, kind: string, data: Record<string, unknown> = {}): AutomationNode => ({ id, kind, x: 0, y: 0, data });
const e = (source: string, target: string, source_handle = 'next'): AutomationEdge => ({
  id: `${source}-${source_handle}-${target}`,
  source,
  source_handle,
  target,
});

async function makeFlow() {
  const flow = await AutomationFlowModel.create({ name: 'Support', channel: 'WHATSAPP' });
  return { id: String(flow._id), name: 'Support', channel: 'WHATSAPP' as const };
}

async function start(graph: AutomationGraph, over: Partial<StartRunInput> = {}): Promise<IAutomationRun> {
  const flow = over.flow ?? (await makeFlow());
  return startRun({ flow, graph, contact, text: 'hello', subject: '', mode: 'TEST', deliver: false, ...over });
}

const stored = (run: IAutomationRun) => AutomationRunModel.findById(run._id).lean<Record<string, any>>();

describe('contactKey', () => {
  it('matches a reply on the phone, else the email', () => {
    expect(contactKey(contact)).toBe('910000000000');
    expect(contactKey({ name: '', phone: '', email: 'user@example.com' })).toBe('user@example.com');
  });
});

describe('startRun / advance', () => {
  it('walks a test run to completion, branching on a condition and collapsing a delay', async () => {
    const graph: AutomationGraph = {
      nodes: [
        n('t', 'trigger', { trigger: 'MANUAL' }),
        n('s', 'set_variable', { name: 'tier', value: 'gold' }),
        n('c', 'condition', { variable: 'tier', operator: 'equals', value: 'GOLD' }),
        n('d', 'delay', { amount: 2, unit: 'HOURS' }),
        n('never', 'set_variable', { name: 'tier', value: 'silver' }),
      ],
      edges: [e('t', 's'), e('s', 'c'), e('c', 'd', 'yes'), e('c', 'never', 'no')],
    };
    const flow = await makeFlow();

    const run = await start(graph, { flow });

    expect(run.status).toBe('COMPLETED');
    expect(run.current_node_id).toBe('');
    expect(run.finished_at).toBeInstanceOf(Date);
    expect(run.steps.map((step) => [step.node_id, step.status])).toEqual([
      ['t', 'OK'],
      ['s', 'OK'],
      ['c', 'OK'],
      ['d', 'OK'],
    ]);
    expect(run.variables).toEqual(expect.objectContaining({ tier: 'gold', message: { text: 'hello', subject: '' } }));
    expect(run.messages.map((m) => [m.direction, m.text])).toEqual([
      ['IN', 'hello'],
      ['SYSTEM', 'Waits 2 hours — skipped in a test run'],
    ]);

    const saved = await stored(run);
    expect(saved?.status).toBe('COMPLETED');
    expect(saved?.contact_key).toBe('910000000000');
    expect(saved?.variables.tier).toBe('gold');
    // A test run is not counted on the flow.
    const flowDoc = await AutomationFlowModel.findById(flow.id).lean<Record<string, any>>();
    expect(flowDoc?.run_count).toBe(0);
    expect(flowDoc?.last_run_at).toBeNull();
  });

  it('completes at once when there is no trigger, with no transcript for an empty text', async () => {
    const run = await start({ nodes: [n('s', 'set_variable', { name: 'x', value: '1' })], edges: [] }, { text: '' });
    expect(run.status).toBe('COMPLETED');
    expect(run.steps).toHaveLength(0);
    expect(run.messages).toHaveLength(0);
  });

  it('ends a run whose edge points at a step that is not in the graph without recording it', async () => {
    const run = await start({ nodes: [n('t', 'trigger')], edges: [e('t', 'ghost')] });
    expect(run.status).toBe('COMPLETED');
    expect(run.steps.map((step) => step.node_id)).toEqual(['t']);
  });

  it('stops a flow that loops without a wait after 100 steps', async () => {
    const graph: AutomationGraph = {
      nodes: [n('t', 'trigger'), n('a', 'set_variable', { name: 'x', value: 'a' }), n('b', 'set_variable', { name: 'x', value: 'b' })],
      edges: [e('t', 'a'), e('a', 'b'), e('b', 'a')],
    };
    const run = await start(graph);
    expect(run.status).toBe('FAILED');
    expect(run.error).toBe('Stopped after 100 steps without a wait — the flow loops');
    expect(run.steps).toHaveLength(100);
    expect(run.current_node_id).toBe('');
    expect((await stored(run))?.status).toBe('FAILED');
  });

  it('records a step that throws as failed, logs it, and keeps walking', async () => {
    (sendWhatsappStep as jest.Mock).mockRejectedValueOnce(new Error('AiSensy down')).mockRejectedValueOnce('raw failure');
    const errorSpy = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined as never);
    const graph: AutomationGraph = {
      nodes: [n('t', 'trigger'), n('w1', 'send_whatsapp'), n('w2', 'send_whatsapp'), n('s', 'set_variable', { name: 'after', value: 'yes' })],
      edges: [e('t', 'w1'), e('w1', 'w2'), e('w2', 's')],
    };

    const run = await start(graph);

    expect(run.status).toBe('COMPLETED');
    expect(run.steps.map((step) => [step.node_id, step.status, step.detail])).toEqual([
      ['t', 'OK', 'Started by a run'],
      ['w1', 'FAILED', 'AiSensy down'],
      ['w2', 'FAILED', 'raw failure'],
      ['s', 'OK', 'Set {{after}} = "yes"'],
    ]);
    expect(errorSpy).toHaveBeenCalledWith('automation', 'step', expect.objectContaining({ node_id: 'w1', kind: 'send_whatsapp', run_id: String(run._id) }));
    errorSpy.mockRestore();
  });
});

describe('waits and resumes', () => {
  const replyGraph: AutomationGraph = {
    nodes: [
      n('t', 'trigger'),
      n('w', 'wait_for_reply', { timeout_hours: 2 }),
      n('r', 'set_variable', { name: 'got', value: '{{message.text}}' }),
      n('o', 'set_variable', { name: 'got', value: 'nothing' }),
    ],
    edges: [e('t', 'w'), e('w', 'r', 'reply'), e('w', 'o', 'timeout')],
  };

  it('parks a live run on a reply wait and counts the run on the flow', async () => {
    const flow = await makeFlow();
    const before = Date.now();

    const run = await start(replyGraph, { flow, mode: 'LIVE' });

    expect(run.status).toBe('WAITING_REPLY');
    expect(run.current_node_id).toBe('w');
    expect(run.resume_at).toBeNull();
    expect(run.wait_until?.getTime()).toBeGreaterThanOrEqual(before + 2 * 3_600_000);
    expect(run.steps.at(-1)?.status).toBe('WAITING');
    const flowDoc = await AutomationFlowModel.findById(flow.id).lean<Record<string, any>>();
    expect(flowDoc?.run_count).toBe(1);
    expect(flowDoc?.last_run_at).toBeInstanceOf(Date);
    expect((await stored(run))?.status).toBe('WAITING_REPLY');
  });

  it('takes the reply exit with the reply as the current message', async () => {
    const parked = await start(replyGraph, { mode: 'LIVE' });

    const run = await resumeWithReply(parked, 'yes please');

    expect(run.status).toBe('COMPLETED');
    expect(run.wait_until).toBeNull();
    expect(run.variables).toEqual(expect.objectContaining({ got: 'yes please', message: { text: 'yes please', subject: '' } }));
    const waitStep = run.steps.find((step) => step.node_id === 'w');
    expect(waitStep?.status).toBe('OK');
    expect(waitStep?.detail).toBe('The contact replied');
    expect(run.messages.at(-1)).toEqual(expect.objectContaining({ direction: 'IN', text: 'yes please', delivered: true }));
    expect(run.steps.map((step) => step.node_id)).toEqual(['t', 'w', 'r']);
    expect((await stored(run))?.variables.got).toBe('yes please');
  });

  it('takes the no-reply exit when the window closes', async () => {
    const parked = await start(replyGraph, { mode: 'LIVE' });

    const run = await resumeTimeout(parked);

    expect(run.status).toBe('COMPLETED');
    expect(run.steps.map((step) => step.node_id)).toEqual(['t', 'w', 'o']);
    expect(run.steps[1].detail).toBe('No reply in time — took the No reply exit');
    expect(run.variables).toEqual(expect.objectContaining({ got: 'nothing' }));
    expect(run.messages.at(-1)).toEqual(
      expect.objectContaining({ direction: 'SYSTEM', text: 'No reply in time — took the No reply exit', delivered: false })
    );
  });

  it('parks a live delay with a resume time and moves on when it is up', async () => {
    const graph: AutomationGraph = {
      nodes: [n('t', 'trigger'), n('d', 'delay', { amount: 30, unit: 'MINUTES' }), n('s', 'set_variable', { name: 'done', value: '1' })],
      edges: [e('t', 'd'), e('d', 's')],
    };
    const before = Date.now();
    const parked = await start(graph, { mode: 'LIVE' });
    expect(parked.status).toBe('WAITING_DELAY');
    expect(parked.wait_until).toBeNull();
    expect(parked.resume_at?.getTime()).toBeGreaterThanOrEqual(before + 30 * 60_000);

    const run = await resumeDelay(parked);

    expect(run.status).toBe('COMPLETED');
    expect(run.resume_at).toBeNull();
    expect(run.steps.find((step) => step.node_id === 'd')?.detail).toBe('Waited — moving on');
    expect(run.variables).toEqual(expect.objectContaining({ done: '1' }));
  });

  it('collapses a delay in a test run even with delivery on', async () => {
    const graph: AutomationGraph = {
      nodes: [n('t', 'trigger'), n('d', 'delay', { amount: 1, unit: 'DAYS' })],
      edges: [e('t', 'd')],
    };
    const run = await start(graph, { mode: 'TEST', deliver: true });
    expect(run.status).toBe('COMPLETED');
    expect(run.steps.at(-1)?.detail).toBe('Waits 1 days (skipped in test)');
  });

  it('leaves an already-settled last step alone when woken', async () => {
    const parked = await start(replyGraph, { mode: 'LIVE' });
    const last = parked.steps[parked.steps.length - 1];
    last.status = 'FAILED';
    last.detail = 'manual';

    const run = await resumeTimeout(parked);

    expect(run.steps[1]).toEqual(expect.objectContaining({ status: 'FAILED', detail: 'manual' }));
    expect(run.status).toBe('COMPLETED');
  });
});

describe('cancelRun', () => {
  it('cancels a waiting run and clears its pointer and timers', async () => {
    const graph: AutomationGraph = {
      nodes: [n('t', 'trigger'), n('w', 'wait_for_reply', { timeout_hours: 1 })],
      edges: [e('t', 'w')],
    };
    const parked = await start(graph, { mode: 'LIVE' });

    const run = await cancelRun(parked);

    expect(run.status).toBe('CANCELLED');
    const saved = await stored(run);
    expect(saved).toEqual(
      expect.objectContaining({ status: 'CANCELLED', current_node_id: '', resume_at: null, wait_until: null })
    );
    expect(saved?.finished_at).toBeInstanceOf(Date);
  });
});
