import { describe, expect, it } from 'vitest';
import { createTheme } from '@mui/material/styles';
import type { Translate } from '@duncit/shell';
import { issuesFromError } from '../../src/pages/automation/errors';
import {
  classifyLabelOf,
  exitsOf,
  newId,
  nextPosition,
  toCanvasEdges,
  toCanvasNodes,
  toEdgeInputs,
  toNodeInputs,
  type CanvasNode,
} from '../../src/pages/automation/graph-io';
import { NODE_KINDS, isNodeKind, paletteFor, type NodeKind } from '../../src/pages/automation/node-kinds';
import { summaryOf } from '../../src/pages/automation/builder/nodes/node-summary';
import { exitLabel } from '../../src/pages/automation/builder/nodes/ExitHandles';
import { toneColor } from '../../src/pages/automation/builder/nodes/tone';
import {
  aiClassifySchema,
  aiComposeSchema,
  conditionSchema,
  delaySchema,
  httpSchema,
  setVariableSchema,
  str,
  strList,
  waitSchema,
} from '../../src/pages/automation/builder/inspector/schemas';
import { channelFromSlug } from '../../src/pages/automation/types';

const t = ((key: string, opts?: { vars?: Record<string, unknown> }) =>
  opts?.vars ? `${key}|${JSON.stringify(opts.vars)}` : key) as unknown as Translate;

const canvasNode = (id: string, kind: CanvasNode['data']['kind'], x = 0, y = 0): CanvasNode => ({
  id,
  type: 'step',
  position: { x, y },
  data: { kind, config: {}, issues: [] },
});

describe('issuesFromError', () => {
  it('reads issues from Apollo 4 errors and coerces fields', () => {
    const error = { errors: [{ extensions: { issues: [{ node_id: 'n1', message: 'No campaign' }, { node_id: 7, message: 5 }, null, 'x'] } }] };
    expect(issuesFromError(error)).toEqual([
      { node_id: 'n1', message: 'No campaign' },
      { node_id: '7', message: '5' },
    ]);
  });

  it('falls back to graphQLErrors and blanks empty or unknown fields', () => {
    const error = { graphQLErrors: [{ extensions: { issues: [{ node_id: '', message: {} }] } }] };
    expect(issuesFromError(error)).toEqual([{ node_id: null, message: '' }]);
  });

  it('returns nothing when there are no issues', () => {
    expect(issuesFromError(null)).toEqual([]);
    expect(issuesFromError(new Error('boom'))).toEqual([]);
    expect(issuesFromError({ errors: [{ extensions: { issues: 'nope' } }] })).toEqual([]);
  });
});

describe('graph-io', () => {
  it('maps API nodes to canvas nodes, dropping unknown kinds and tolerating bad JSON', () => {
    const nodes = toCanvasNodes([
      { id: 'a', kind: 'trigger', x: 1, y: 2, data: '{"trigger":"MANUAL"}' },
      { id: 'b', kind: 'delay', x: 3, y: 4, data: 'not json' },
      { id: 'c', kind: 'delay', x: 3, y: 4, data: '[1,2]' },
      { id: 'd', kind: 'mystery', x: 0, y: 0, data: '{}' },
    ]);
    expect(nodes.map((n) => n.id)).toEqual(['a', 'b', 'c']);
    expect(nodes[0]).toMatchObject({ deletable: false, position: { x: 1, y: 2 }, data: { config: { trigger: 'MANUAL' } } });
    expect(nodes[1].deletable).toBe(true);
    expect(nodes[1].data.config).toEqual({});
    expect(nodes[2].data.config).toEqual({});
  });

  it('round-trips edges and nodes into mutation inputs', () => {
    expect(toCanvasEdges([{ id: 'e', source: 'a', source_handle: 'yes', target: 'b' }])).toEqual([
      { id: 'e', source: 'a', sourceHandle: 'yes', target: 'b' },
    ]);
    expect(toEdgeInputs([{ id: 'e', source: 'a', target: 'b' }, { id: 'f', source: 'a', sourceHandle: 'no', target: 'c' }])).toEqual([
      { id: 'e', source: 'a', source_handle: 'next', target: 'b' },
      { id: 'f', source: 'a', source_handle: 'no', target: 'c' },
    ]);
    const node = canvasNode('a', 'delay', 10.6, 20.4);
    node.data.config = { amount: 2 };
    expect(toNodeInputs([node])).toEqual([{ id: 'a', kind: 'delay', x: 11, y: 20, data: '{"amount":2}' }]);
  });

  it('lists exits per kind, one per classify label plus other', () => {
    expect(exitsOf('condition', {})).toEqual(['yes', 'no']);
    expect(exitsOf('wait_for_reply', {})).toEqual(['reply', 'timeout']);
    expect(exitsOf('ai_classify', { labels: ['A', '', 'B'] })).toEqual(['label:0', 'label:1', 'other']);
    expect(exitsOf('ai_classify', {})).toEqual(['other']);
    expect(exitsOf('delay', {})).toEqual(['next']);
  });

  it('resolves classify handle labels', () => {
    expect(classifyLabelOf({ labels: ['Sales', 'Help'] }, 'label:1')).toBe('Help');
    expect(classifyLabelOf({ labels: ['Sales'] }, 'label:5')).toBe('');
    expect(classifyLabelOf({}, 'label:0')).toBe('');
    expect(classifyLabelOf({ labels: ['x'] }, 'other')).toBeNull();
  });

  it('places new steps under the lowest one in the trigger column', () => {
    expect(nextPosition([])).toEqual({ x: 80, y: 80 });
    expect(nextPosition([canvasNode('d', 'delay', 500, 400), canvasNode('t', 'trigger', 80, 80)])).toEqual({ x: 80, y: 550 });
    expect(nextPosition([canvasNode('d', 'delay', 33, 10)])).toEqual({ x: 33, y: 160 });
  });

  it('makes prefixed, distinct ids', () => {
    const [first, second] = [newId('node'), newId('node')];
    expect(first).toMatch(/^node_[a-z0-9]+$/);
    expect(first).not.toBe(second);
  });
});

describe('node-kinds and types', () => {
  it('offers channel-specific palettes without the trigger', () => {
    expect(paletteFor('WHATSAPP')).toContain('send_whatsapp');
    expect(paletteFor('WHATSAPP')).toContain('wait_for_reply');
    expect(paletteFor('WHATSAPP')).not.toContain('send_email');
    expect(paletteFor('EMAIL')).toContain('send_email');
    expect(paletteFor('EMAIL')).not.toContain('wait_for_reply');
    expect(paletteFor('EMAIL')).not.toContain('trigger');
  });

  it('gives fresh steps channel-aware defaults', () => {
    expect(NODE_KINDS.trigger.defaults('WHATSAPP').trigger).toBe('INBOUND_MESSAGE');
    expect(NODE_KINDS.trigger.defaults('EMAIL').trigger).toBe('INBOUND_EMAIL');
    expect(NODE_KINDS.delay.defaults('EMAIL')).toEqual({ amount: 1, unit: 'HOURS' });
    expect(isNodeKind('delay')).toBe(true);
    expect(isNodeKind('nope')).toBe(false);
  });

  it('maps route slugs to channels', () => {
    expect(channelFromSlug('whatsapp')).toBe('WHATSAPP');
    expect(channelFromSlug('email')).toBe('EMAIL');
    expect(channelFromSlug('sms')).toBeNull();
    expect(channelFromSlug(undefined)).toBeNull();
  });
});

describe('summaryOf', () => {
  it('summarises triggers', () => {
    expect(summaryOf('trigger', { trigger: 'INBOUND_EMAIL', mailbox: 'a@x.test' }, t)).toContain('summary.mailbox|{"email":"a@x.test"}');
    expect(summaryOf('trigger', { trigger: 'INBOUND_EMAIL' }, t)).toBe('ai.automation.summary.noMailbox');
    expect(summaryOf('trigger', { trigger: 'INBOUND_MESSAGE', keywords: ' hi ' }, t)).toContain('"list":"hi"');
    expect(summaryOf('trigger', { trigger: 'INBOUND_MESSAGE' }, t)).toBe('ai.automation.summary.keywordsAny');
    expect(summaryOf('trigger', { trigger: 'MANUAL' }, t)).toBe('ai.automation.trigger.MANUAL');
    expect(summaryOf('trigger', {}, t)).toBe('ai.automation.trigger.none');
  });

  it('summarises sends, compose, classify and requests', () => {
    expect(summaryOf('send_whatsapp', { campaign_name: 'Welcome' }, t)).toBe('Welcome');
    expect(summaryOf('send_whatsapp', {}, t)).toBe('ai.automation.summary.pickCampaign');
    expect(summaryOf('send_email', { template_slug: 'tpl' }, t)).toBe('tpl');
    expect(summaryOf('send_email', {}, t)).toBe('ai.automation.summary.pickTemplate');
    expect(summaryOf('ai_compose', {}, t)).toContain('{{ai_reply}}');
    expect(summaryOf('ai_compose', { output_var: 'out' }, t)).toContain('{{out}}');
    expect(summaryOf('ai_classify', { labels: ['a', ' ', 'b'] }, t)).toContain('"count":2');
    expect(summaryOf('ai_classify', {}, t)).toBe('ai.automation.summary.noLabels');
    expect(summaryOf('http_request', { url: 'https://x.test' }, t)).toBe('https://x.test');
    expect(summaryOf('http_request', {}, t)).toBe('ai.automation.summary.url');
  });

  it('summarises conditions, waits, delays and variables', () => {
    expect(summaryOf('condition', {}, t)).toBe('ai.automation.summary.conditionEmpty');
    expect(summaryOf('condition', { variable: 'v', operator: 'equals', value: 'x' }, t)).toContain('ops.equals');
    expect(summaryOf('condition', { variable: 'v', operator: 'weird' }, t)).toContain('"operator":"weird"');
    expect(summaryOf('wait_for_reply', {}, t)).toContain('"hours":"24"');
    expect(summaryOf('wait_for_reply', { timeout_hours: 5 }, t)).toContain('"hours":"5"');
    expect(summaryOf('delay', { amount: 3, unit: 'DAYS' }, t)).toContain('units.DAYS');
    expect(summaryOf('delay', { unit: 'WEEKS' }, t)).toContain('"amount":"1","unit":"weeks"');
    expect(summaryOf('set_variable', {}, t)).toBe('ai.automation.summary.variableUnnamed');
    expect(summaryOf('set_variable', { name: 'x' }, t)).toContain('{{x}}');
  });

  it('has no line for a kind a newer server sent that this portal does not know', () => {
    expect(summaryOf(String('send_sms') as NodeKind, { body: 'hi' }, t)).toBe('');
  });
});

describe('exitLabel', () => {
  it('reads a known exit through its copy key and a classify exit as its own label', () => {
    expect(exitLabel('yes', {}, t)).toBe('ai.automation.handles.yes');
    expect(exitLabel('label:1', { labels: ['Sales', 'Help'] }, t)).toBe('Help');
  });

  it('shows an exit with no copy as its raw name rather than nothing', () => {
    expect(exitLabel('escalate', {}, t)).toBe('escalate');
  });
});

describe('toneColor', () => {
  it('reads each tone from the live theme', () => {
    const theme = createTheme();
    expect(toneColor(theme, 'primary')).toBe(theme.palette.primary.main);
    expect(toneColor(theme, 'info')).toBe(theme.palette.info.main);
    expect(toneColor(theme, 'warning')).toBe(theme.palette.warning.main);
    expect(toneColor(theme, 'secondary')).toBe(theme.palette.secondary.main);
    expect(toneColor(theme, 'neutral')).toBe(theme.palette.text.secondary);
  });
});

describe('inspector schemas', () => {
  it('coerces scalar settings to text', () => {
    expect(str(5)).toBe('5');
    expect(str(false)).toBe('false');
    expect(str({})).toBe('');
    expect(strList([1, 'a', null])).toEqual(['1', 'a', '']);
    expect(strList('x')).toEqual([]);
  });

  it('validates variable names and required AI settings', () => {
    const compose = aiComposeSchema(t);
    const base = { prompt_id: '', instructions: 'Do it', input: '', output_var: 'reply' };
    expect(compose.safeParse(base).success).toBe(true);
    expect(compose.safeParse({ ...base, instructions: '  ' }).error?.issues[0].message).toBe('ai.automation.inspector.ai.instructionsRequired');
    expect(compose.safeParse({ ...base, output_var: '9bad' }).error?.issues[0].message).toBe('ai.automation.inspector.ai.outputInvalid');
    expect(setVariableSchema(t).safeParse({ name: 'ok_1', value: '' }).success).toBe(true);
    expect(setVariableSchema(t).safeParse({ name: 'has space', value: '' }).success).toBe(false);
  });

  it('needs two classify labels', () => {
    const schema = aiClassifySchema(t);
    const base = { prompt_id: '', instructions: 'Sort', input: '' };
    expect(schema.safeParse({ ...base, labels_text: 'a\n\nb' }).success).toBe(true);
    expect(schema.safeParse({ ...base, labels_text: 'a\n \n' }).error?.issues[0].message).toBe('ai.automation.inspector.ai.labelsRequired');
  });

  it('bounds condition, wait, delay and http settings', () => {
    expect(conditionSchema(t).safeParse({ variable: ' ', operator: 'equals', value: '' }).success).toBe(false);
    expect(conditionSchema(t).safeParse({ variable: 'v', operator: 'bogus', value: '' }).success).toBe(false);
    expect(waitSchema(t).safeParse({ timeout_hours: '0' }).success).toBe(false);
    expect(waitSchema(t).safeParse({ timeout_hours: '721' }).success).toBe(false);
    expect(waitSchema(t).parse({ timeout_hours: '48' })).toEqual({ timeout_hours: 48 });
    expect(delaySchema(t).safeParse({ amount: '1.5', unit: 'HOURS' }).success).toBe(false);
    expect(delaySchema(t).parse({ amount: '10', unit: 'DAYS' })).toEqual({ amount: 10, unit: 'DAYS' });
    const http = httpSchema(t);
    const base = { method: 'POST', url: 'https://x.test/hook', body: '', output_var: 'webhook' };
    expect(http.safeParse(base).success).toBe(true);
    expect(http.safeParse({ ...base, url: 'http://x.test' }).error?.issues[0].message).toBe('ai.automation.inspector.http.urlInvalid');
  });
});

describe('step defaults', () => {
  it('gives every kind a plain JSON-safe starting config', () => {
    for (const channel of ['WHATSAPP', 'EMAIL'] as const) {
      for (const meta of Object.values(NODE_KINDS)) {
        const config = meta.defaults(channel);
        expect(JSON.parse(JSON.stringify(config))).toEqual(config);
      }
    }
    expect(NODE_KINDS.send_whatsapp.defaults('WHATSAPP')).toMatchObject({ campaign_name: '', template_params: [], buttons: [] });
    expect(NODE_KINDS.send_email.defaults('EMAIL')).toMatchObject({ template_slug: 'automation-message', category: 'notification' });
    expect(NODE_KINDS.ai_compose.defaults('EMAIL')).toMatchObject({ output_var: 'ai_reply', input: '{{message.text}}' });
    expect(NODE_KINDS.ai_classify.defaults('EMAIL')).toMatchObject({ labels: [] });
    expect(NODE_KINDS.condition.defaults('EMAIL')).toMatchObject({ operator: 'contains' });
    expect(NODE_KINDS.wait_for_reply.defaults('WHATSAPP')).toEqual({ timeout_hours: 24 });
    expect(NODE_KINDS.set_variable.defaults('EMAIL')).toEqual({ name: '', value: '' });
    expect(NODE_KINDS.http_request.defaults('EMAIL')).toMatchObject({ method: 'POST', output_var: 'webhook' });
  });
});
