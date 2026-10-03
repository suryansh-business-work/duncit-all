import {
  exitsOf,
  isNodeKind,
  list,
  MAX_DELAY_AMOUNT,
  MAX_WAIT_HOURS,
  normalizeGraph,
  scalarText,
  str,
  triggerOf,
  validateGraph,
} from '../../automation.graph';
import type { AutomationEdge, AutomationGraph, AutomationNode } from '../../automation.model';

const n = (id: string, kind: string, data: Record<string, unknown> = {}): AutomationNode => ({ id, kind, x: 0, y: 0, data });
const e = (source: string, target: string, source_handle = 'next', id = `${source}-${target}`): AutomationEdge => ({
  id,
  source,
  source_handle,
  target,
});

const waTrigger = n('t', 'trigger', { trigger: 'INBOUND_MESSAGE' });

/** A one-step WhatsApp flow: trigger -> node. Issues are those of `node` alone. */
const issuesOf = (node: AutomationNode, channel: 'WHATSAPP' | 'EMAIL' = 'WHATSAPP') => {
  const trigger = channel === 'WHATSAPP' ? waTrigger : n('t', 'trigger', { trigger: 'MANUAL' });
  return validateGraph({ nodes: [trigger, node], edges: [e('t', node.id)] }, channel).map((i) => i.message);
};

describe('text helpers', () => {
  it('scalarText keeps scalars as written and blanks objects, arrays and nullish', () => {
    expect(scalarText('a')).toBe('a');
    expect(scalarText(3)).toBe('3');
    expect(scalarText(false)).toBe('false');
    expect(scalarText(BigInt(10))).toBe('10');
    expect(scalarText({ a: 1 })).toBe('');
    expect(scalarText(['x'])).toBe('');
    expect(scalarText(null)).toBe('');
    expect(scalarText(undefined)).toBe('');
  });

  it('str trims, list trims each entry and is empty for non-arrays', () => {
    expect(str('  hi ')).toBe('hi');
    expect(list([' a ', 2, {}])).toEqual(['a', '2', '']);
    expect(list('a,b')).toEqual([]);
  });

  it('isNodeKind accepts only the declared kinds', () => {
    expect(isNodeKind('delay')).toBe(true);
    expect(isNodeKind('teleport')).toBe(false);
  });
});

describe('exitsOf', () => {
  it('names the exits each kind offers', () => {
    expect(exitsOf(n('c', 'condition'))).toEqual(['yes', 'no']);
    expect(exitsOf(n('w', 'wait_for_reply'))).toEqual(['reply', 'timeout']);
    expect(exitsOf(n('d', 'delay'))).toEqual(['next']);
  });

  it('gives a classifier one exit per non-blank label plus other', () => {
    expect(exitsOf(n('a', 'ai_classify', { labels: ['yes', ' ', 'no'] }))).toEqual(['label:0', 'label:1', 'other']);
    expect(exitsOf(n('a', 'ai_classify'))).toEqual(['other']);
  });
});

describe('validateGraph — structure', () => {
  it('a complete connected flow has no issues', () => {
    const graph: AutomationGraph = {
      nodes: [waTrigger, n('s', 'send_whatsapp', { campaign_name: 'c1', template_params: ['{{contact.name}}'] })],
      edges: [e('t', 's')],
    };
    expect(validateGraph(graph, 'WHATSAPP')).toEqual([]);
  });

  it('a lone trigger is valid without any edge', () => {
    expect(validateGraph({ nodes: [waTrigger], edges: [] }, 'WHATSAPP')).toEqual([]);
  });

  it('requires exactly one trigger and skips the reachability check otherwise', () => {
    expect(validateGraph({ nodes: [n('d', 'delay', { amount: 1, unit: 'DAYS' })], edges: [] }, 'WHATSAPP')).toEqual([
      { node_id: null, message: 'A flow has exactly one trigger' },
    ]);
    const two = validateGraph({ nodes: [waTrigger, { ...waTrigger, id: 't2' }], edges: [] }, 'WHATSAPP');
    expect(two).toEqual([{ node_id: null, message: 'A flow has exactly one trigger' }]);
  });

  it('flags a step the channel does not offer, and an unknown kind, without checking their data', () => {
    const issues = validateGraph(
      { nodes: [waTrigger, n('m', 'send_email'), n('x', 'teleport')], edges: [e('t', 'm'), e('m', 'x')] },
      'WHATSAPP'
    );
    expect(issues).toEqual([
      { node_id: 'm', message: 'This step is not available on a whatsapp flow' },
      { node_id: 'x', message: 'This step is not available on a whatsapp flow' },
    ]);
    expect(issuesOf(n('w', 'wait_for_reply', { timeout_hours: 2 }), 'EMAIL')).toEqual([
      'This step is not available on a email flow',
    ]);
  });

  it('flags a dangling edge, a duplicated exit, an unreachable step and an unconnected trigger', () => {
    const issues = validateGraph(
      {
        nodes: [
          waTrigger,
          n('a', 'delay', { amount: 1, unit: 'HOURS' }),
          n('b', 'delay', { amount: 1, unit: 'HOURS' }),
          n('orphan', 'delay', { amount: 1, unit: 'HOURS' }),
        ],
        edges: [e('t', 'a'), e('t', 'b', 'next', 'dup'), e('a', 'ghost')],
      },
      'WHATSAPP'
    );
    expect(issues).toEqual([
      { node_id: 't', message: 'One exit leads to two steps' },
      { node_id: null, message: 'An arrow points at a step that no longer exists' },
      { node_id: 'orphan', message: 'This step is not connected to the flow' },
    ]);

    const noLink = validateGraph({ nodes: [waTrigger, n('a', 'delay', { amount: 1, unit: 'DAYS' })], edges: [] }, 'WHATSAPP');
    expect(noLink).toEqual([
      { node_id: 'a', message: 'This step is not connected to the flow' },
      { node_id: 't', message: 'Connect the trigger to a first step' },
    ]);
  });

  it('walks through cycles without looping forever', () => {
    const graph = {
      nodes: [waTrigger, n('a', 'delay', { amount: 1, unit: 'DAYS' }), n('b', 'delay', { amount: 2, unit: 'DAYS' })],
      edges: [e('t', 'a'), e('a', 'b'), e('b', 'a')],
    };
    expect(validateGraph(graph, 'WHATSAPP')).toEqual([]);
  });
});

describe('validateGraph — per-step checks', () => {
  it('trigger must be one the channel offers; an inbound email trigger needs a mailbox', () => {
    expect(validateGraph({ nodes: [n('t', 'trigger', { trigger: 'INBOUND_EMAIL' })], edges: [] }, 'WHATSAPP')).toEqual([
      { node_id: 't', message: 'Pick what starts the flow' },
      { node_id: 't', message: 'Pick the mailbox the flow listens on' },
    ]);
    expect(validateGraph({ nodes: [n('t', 'trigger', { trigger: 'INBOUND_EMAIL', mailbox: 'support' })], edges: [] }, 'EMAIL')).toEqual([]);
  });

  it('send_whatsapp needs a campaign and every template variable filled', () => {
    expect(issuesOf(n('s', 'send_whatsapp', { template_params: ['a', ''] }))).toEqual([
      'Pick an AiSensy campaign',
      'Fill template variable 2',
    ]);
  });

  it('send_email needs a template', () => {
    expect(issuesOf(n('s', 'send_email'), 'EMAIL')).toEqual(['Pick an email template']);
    expect(issuesOf(n('s', 'send_email', { template_slug: 'welcome' }), 'EMAIL')).toEqual([]);
  });

  it('ai_compose needs instructions and a valid output variable', () => {
    expect(issuesOf(n('a', 'ai_compose', { output_var: '1bad' }))).toEqual([
      'Tell the model what to do',
      'Name the output variable (letters, numbers, underscores)',
    ]);
    expect(issuesOf(n('a', 'ai_compose', { instructions: 'reply', output_var: 'reply_text' }))).toEqual([]);
  });

  it('ai_classify needs at least two non-blank labels', () => {
    expect(issuesOf(n('a', 'ai_classify', { instructions: 'sort', labels: ['yes', ''] }))).toEqual(['Add at least two labels']);
    expect(issuesOf(n('a', 'ai_classify', { instructions: 'sort', labels: ['yes', 'no'] }))).toEqual([]);
  });

  it('condition needs a variable and a known operator', () => {
    expect(issuesOf(n('c', 'condition', { operator: 'like' }))).toEqual(['Name the variable to check', 'Pick an operator']);
    expect(issuesOf(n('c', 'condition', { variable: 'reply', operator: 'is_empty' }))).toEqual([]);
  });

  it.each([
    [0, false],
    [1, true],
    [MAX_DELAY_AMOUNT, true],
    [MAX_DELAY_AMOUNT + 1, false],
    [1.5, false],
    ['abc', false],
  ])('delay amount %p valid=%p', (amount, ok) => {
    const issues = issuesOf(n('d', 'delay', { amount, unit: 'MINUTES' }));
    expect(issues).toEqual(ok ? [] : [`Wait for a whole number from 1 to ${MAX_DELAY_AMOUNT}`]);
  });

  it('delay needs a known unit', () => {
    expect(issuesOf(n('d', 'delay', { amount: 3, unit: 'WEEKS' }))).toEqual(['Pick a unit']);
  });

  it.each([
    [0.5, false],
    [1, true],
    [MAX_WAIT_HOURS, true],
    [MAX_WAIT_HOURS + 1, false],
    [undefined, false],
  ])('wait_for_reply timeout %p valid=%p', (timeout_hours, ok) => {
    const issues = issuesOf(n('w', 'wait_for_reply', { timeout_hours }));
    expect(issues).toEqual(ok ? [] : [`Give up after 1 to ${MAX_WAIT_HOURS} hours`]);
  });

  it('set_variable needs a valid name (max 64 chars, no leading digit)', () => {
    expect(issuesOf(n('s', 'set_variable', { name: 'a'.repeat(64) }))).toEqual([]);
    expect(issuesOf(n('s', 'set_variable', { name: 'a'.repeat(65) }))).toEqual([
      'Name the variable (letters, numbers, underscores)',
    ]);
    expect(issuesOf(n('s', 'set_variable', { name: '9lives' }))).toHaveLength(1);
  });

  it('http_request needs an https URL and POST or GET', () => {
    expect(issuesOf(n('h', 'http_request', { url: 'http://x.com', method: 'PUT' }))).toEqual([
      'Enter an https:// URL',
      'Pick a method',
    ]);
    expect(issuesOf(n('h', 'http_request', { url: 'HTTPS://hooks.x.com/a', method: 'GET' }))).toEqual([]);
  });
});

describe('normalizeGraph', () => {
  it('coerces every field: ids trimmed and capped at 64, bad coordinates to 0, handle defaults to next', () => {
    const graph = normalizeGraph({
      nodes: [
        { id: ` ${'n'.repeat(70)} `, kind: ' delay ', x: 12.5, y: Number.NaN, data: '{"amount":2}' },
        { id: 'b', kind: 'trigger', x: null, y: undefined, data: null },
      ],
      edges: [{ id: 'e1', source: ' a ', source_handle: null, target: 'b' }],
    });
    expect(graph.nodes[0]).toEqual({ id: 'n'.repeat(64), kind: 'delay', x: 12.5, y: 0, data: { amount: 2 } });
    expect(graph.nodes[1]).toEqual({ id: 'b', kind: 'trigger', x: 0, y: 0, data: {} });
    expect(graph.edges).toEqual([{ id: 'e1', source: 'a', source_handle: 'next', target: 'b' }]);
  });

  it('blanks node data that is not a JSON object', () => {
    const graph = normalizeGraph({
      nodes: [
        { id: 'a', kind: 'delay', data: '[1,2]' },
        { id: 'b', kind: 'delay', data: 'null' },
        { id: 'c', kind: 'delay', data: '{broken' },
      ],
    });
    expect(graph.nodes.map((node) => node.data)).toEqual([{}, {}, {}]);
  });

  it('treats missing lists as empty and caps nodes at 200 and edges at 400', () => {
    expect(normalizeGraph({ nodes: null, edges: null })).toEqual({ nodes: [], edges: [] });
    const many = normalizeGraph({
      nodes: Array.from({ length: 250 }, (_v, i) => ({ id: `n${i}`, kind: 'delay' })),
      edges: Array.from({ length: 450 }, (_v, i) => ({ id: `e${i}`, source: 'a', target: 'b' })),
    });
    expect(many.nodes).toHaveLength(200);
    expect(many.edges).toHaveLength(400);
  });
});

describe('triggerOf', () => {
  it('reads the trigger node type, or empty when there is none', () => {
    expect(triggerOf({ nodes: [n('x', 'delay'), waTrigger], edges: [] })).toBe('INBOUND_MESSAGE');
    expect(triggerOf({ nodes: [], edges: [] })).toBe('');
  });
});
