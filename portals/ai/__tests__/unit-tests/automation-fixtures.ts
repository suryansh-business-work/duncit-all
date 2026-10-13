import { AI_BUNDLE } from '../../../../packages/i18n/src/bundles/ai';
import { interpolate } from '../../../../packages/i18n/src/translator';
import type { CanvasNode } from '../../src/pages/automation/graph-io';
import type { AutomationFlow, AutomationOptions, AutomationRun } from '../../src/pages/automation/types';
import type { NodeKind } from '../../src/pages/automation/node-kinds';

/** Shared builders for the automation suites: one realistic options payload, flows, runs and canvas nodes. */
export const OPTIONS: AutomationOptions = {
  channel: 'WHATSAPP',
  variables: [{ name: 'user.city', description: 'City' }],
  prompts: [
    { id: 'p1', name: 'Friendly', category: 'Support', kind: 'TEXT' },
    { id: 'p2', name: 'Plain', category: '', kind: 'TEXT' },
  ],
  whatsapp_configured: true,
  project_configured: true,
  campaigns: [{ name: 'welcome', status: 'LIVE', template_name: 'welcome_tpl', type: 'template', media_url: '', media_filename: '' }],
  templates: [
    {
      id: 't1',
      name: 'welcome_tpl',
      status: 'APPROVED',
      category: 'UTILITY',
      language: 'en',
      body: 'Hi {{1}}, your code is {{2}}',
      param_count: 2,
      header: 'Hello',
      header_format: 'TEXT',
      needs_media: false,
      footer: 'Duncit',
      buttons: ['Yes'],
      cta_buttons: [{ type: 'URL', text: 'Open', url: 'https://x.test/{{1}}', url_param: 1 }],
    },
  ],
  saved_campaign_names: [{ id: 's1', name: 'saved-one', description: '' }],
  webhook_url: 'https://hooks.test/wa',
  webhook_secret_set: true,
  email_senders: [{ id: 'snd1', name: 'Support', from_address: 'help@duncit.test', is_default: true }],
  email_templates: [{ slug: 'automation-message', name: 'Message', subject: 'Re: you', variables: ['body', 'name'] }],
  email_categories: ['notification', 'marketing'],
  mailboxes: [
    { email: 'in@duncit.test', display_name: 'Inbox', is_active: true },
    { email: 'old@duncit.test', display_name: '', is_active: false },
  ],
};

export const node = (id: string, kind: NodeKind, config: Record<string, unknown> = {}, issues: string[] = []): CanvasNode => ({
  id,
  type: 'step',
  position: { x: 0, y: 0 },
  data: { kind, config, issues },
});

export const flow = (over: Partial<AutomationFlow> = {}): AutomationFlow => ({
  id: 'F1',
  name: 'Welcome flow',
  description: 'Greets new people',
  channel: 'WHATSAPP',
  status: 'DRAFT',
  trigger: 'INBOUND_MESSAGE',
  run_count: 3,
  last_run_at: null,
  created_at: null,
  updated_at: null,
  issues: [],
  nodes: [
    { id: 'trigger', kind: 'trigger', x: 80, y: 80, data: '{"trigger":"INBOUND_MESSAGE"}' },
    { id: 'n1', kind: 'delay', x: 80, y: 230, data: '{"amount":2,"unit":"HOURS"}' },
  ],
  edges: [{ id: 'e1', source: 'trigger', source_handle: 'next', target: 'n1' }],
  ...over,
});

export const run = (over: Partial<AutomationRun> = {}): AutomationRun => ({
  id: 'R1',
  flow_id: 'F1',
  flow_name: 'Welcome flow',
  channel: 'WHATSAPP',
  mode: 'TEST',
  deliver: false,
  status: 'COMPLETED',
  contact: { name: 'Asha', phone: '+910000000000', email: '' },
  trigger_text: 'hello',
  trigger_subject: '',
  variables_json: '{"intent":"sales"}',
  current_node_id: '',
  steps: [{ node_id: 'n1', kind: 'delay', status: 'OK', detail: 'waited', at: '2026-10-01T10:00:00.000Z' }],
  messages: [],
  error: '',
  started_at: '2026-10-01T10:00:00.000Z',
  finished_at: '2026-10-01T10:00:05.000Z',
  resume_at: null,
  wait_until: null,
  ...over,
});

/** The shipped English copy for a key, so a test asserts what the operator reads. */
export function en(key: string, vars: Record<string, string | number> = {}): string {
  let cursor: unknown = AI_BUNDLE;
  for (const part of key.split('.')) cursor = (cursor as Record<string, unknown> | undefined)?.[part];
  if (typeof cursor !== 'string') throw new Error(`No English copy for ${key}`);
  return interpolate(cursor, vars);
}

const escapeRegExp = (text: string) => text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/** A matcher for a field label whose required star is appended by the field. */
export const label = (key: string) => new RegExp(String.raw`^${escapeRegExp(en(key))}\s*\*?$`);
