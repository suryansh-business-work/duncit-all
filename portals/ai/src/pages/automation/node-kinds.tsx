import type { SvgIconComponent } from '@mui/icons-material';
import BoltIcon from '@mui/icons-material/Bolt';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailIcon from '@mui/icons-material/Email';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ScheduleIcon from '@mui/icons-material/Schedule';
import DataObjectIcon from '@mui/icons-material/DataObject';
import WebhookIcon from '@mui/icons-material/Webhook';
import type { AutomationChannel, NodeData } from './types';

/**
 * The palette: every step kind, what it looks like, which channel offers it and
 * what a fresh one carries. The server keeps the matching contract in
 * automation.graph.ts and is the one that decides whether a flow may run.
 *
 * Every key below is a literal, never composed — the localization gate greps
 * for them (see localization-literal-keys).
 */

export type NodeKind =
  | 'trigger'
  | 'send_whatsapp'
  | 'send_email'
  | 'ai_compose'
  | 'ai_classify'
  | 'condition'
  | 'wait_for_reply'
  | 'delay'
  | 'set_variable'
  | 'http_request';

/** The palette colour family a card's edge strip and icon take. */
export type NodeTone = 'primary' | 'info' | 'warning' | 'secondary' | 'neutral';

export interface NodeKindMeta {
  labelKey: string;
  hintKey: string;
  icon: SvgIconComponent;
  tone: NodeTone;
  channels: readonly AutomationChannel[];
  defaults: (channel: AutomationChannel) => NodeData;
}

const BOTH: readonly AutomationChannel[] = ['WHATSAPP', 'EMAIL'];

export const NODE_KINDS: Record<NodeKind, NodeKindMeta> = {
  trigger: {
    labelKey: 'ai.automation.kinds.trigger',
    hintKey: 'ai.automation.kindHints.trigger',
    icon: BoltIcon,
    tone: 'primary',
    channels: BOTH,
    defaults: (channel) => ({
      trigger: channel === 'WHATSAPP' ? 'INBOUND_MESSAGE' : 'INBOUND_EMAIL',
      keywords: '',
      mailbox: '',
    }),
  },
  send_whatsapp: {
    labelKey: 'ai.automation.kinds.send_whatsapp',
    hintKey: 'ai.automation.kindHints.send_whatsapp',
    icon: WhatsAppIcon,
    tone: 'info',
    channels: ['WHATSAPP'],
    defaults: () => ({ campaign_name: '', template_params: [], media_url: '', media_filename: '', buttons: [] }),
  },
  send_email: {
    labelKey: 'ai.automation.kinds.send_email',
    hintKey: 'ai.automation.kindHints.send_email',
    icon: EmailIcon,
    tone: 'info',
    channels: ['EMAIL'],
    defaults: () => ({ sender_id: '', template_slug: 'automation-message', subject: '', category: 'notification', vars: {} }),
  },
  ai_compose: {
    labelKey: 'ai.automation.kinds.ai_compose',
    hintKey: 'ai.automation.kindHints.ai_compose',
    icon: AutoAwesomeIcon,
    tone: 'warning',
    channels: BOTH,
    defaults: () => ({ prompt_id: '', instructions: '', input: '{{message.text}}', output_var: 'ai_reply' }),
  },
  ai_classify: {
    labelKey: 'ai.automation.kinds.ai_classify',
    hintKey: 'ai.automation.kindHints.ai_classify',
    icon: AccountTreeIcon,
    tone: 'warning',
    channels: BOTH,
    defaults: () => ({ prompt_id: '', instructions: '', input: '{{message.text}}', labels: [] }),
  },
  condition: {
    labelKey: 'ai.automation.kinds.condition',
    hintKey: 'ai.automation.kindHints.condition',
    icon: AltRouteIcon,
    tone: 'secondary',
    channels: BOTH,
    defaults: () => ({ variable: 'message.text', operator: 'contains', value: '' }),
  },
  wait_for_reply: {
    labelKey: 'ai.automation.kinds.wait_for_reply',
    hintKey: 'ai.automation.kindHints.wait_for_reply',
    icon: HourglassEmptyIcon,
    tone: 'neutral',
    channels: ['WHATSAPP'],
    defaults: () => ({ timeout_hours: 24 }),
  },
  delay: {
    labelKey: 'ai.automation.kinds.delay',
    hintKey: 'ai.automation.kindHints.delay',
    icon: ScheduleIcon,
    tone: 'neutral',
    channels: BOTH,
    defaults: () => ({ amount: 1, unit: 'HOURS' }),
  },
  set_variable: {
    labelKey: 'ai.automation.kinds.set_variable',
    hintKey: 'ai.automation.kindHints.set_variable',
    icon: DataObjectIcon,
    tone: 'neutral',
    channels: BOTH,
    defaults: () => ({ name: '', value: '' }),
  },
  http_request: {
    labelKey: 'ai.automation.kinds.http_request',
    hintKey: 'ai.automation.kindHints.http_request',
    icon: WebhookIcon,
    tone: 'neutral',
    channels: BOTH,
    defaults: () => ({ method: 'POST', url: '', body: '', output_var: 'webhook' }),
  },
};

export const NODE_KIND_LIST = Object.keys(NODE_KINDS) as NodeKind[];

export const isNodeKind = (kind: string): kind is NodeKind => kind in NODE_KINDS;

/** The kinds a channel's palette offers, minus the trigger every flow already has. */
export const paletteFor = (channel: AutomationChannel): NodeKind[] =>
  NODE_KIND_LIST.filter((kind) => kind !== 'trigger' && NODE_KINDS[kind].channels.includes(channel));

export const HANDLE_LABEL_KEYS: Record<string, string> = {
  next: 'ai.automation.handles.next',
  yes: 'ai.automation.handles.yes',
  no: 'ai.automation.handles.no',
  reply: 'ai.automation.handles.reply',
  timeout: 'ai.automation.handles.timeout',
  other: 'ai.automation.handles.other',
};

export const TRIGGER_LABEL_KEYS: Record<string, string> = {
  INBOUND_MESSAGE: 'ai.automation.trigger.INBOUND_MESSAGE',
  INBOUND_EMAIL: 'ai.automation.trigger.INBOUND_EMAIL',
  MANUAL: 'ai.automation.trigger.MANUAL',
};

export const FLOW_STATUS_KEYS: Record<string, string> = {
  DRAFT: 'ai.automation.status.DRAFT',
  ACTIVE: 'ai.automation.status.ACTIVE',
  PAUSED: 'ai.automation.status.PAUSED',
};

export const RUN_STATUS_KEYS: Record<string, string> = {
  RUNNING: 'ai.automation.runs.statuses.RUNNING',
  WAITING_REPLY: 'ai.automation.runs.statuses.WAITING_REPLY',
  WAITING_DELAY: 'ai.automation.runs.statuses.WAITING_DELAY',
  COMPLETED: 'ai.automation.runs.statuses.COMPLETED',
  FAILED: 'ai.automation.runs.statuses.FAILED',
  CANCELLED: 'ai.automation.runs.statuses.CANCELLED',
};

export const RUN_MODE_KEYS: Record<string, string> = {
  LIVE: 'ai.automation.runs.modes.LIVE',
  TEST: 'ai.automation.runs.modes.TEST',
};

export const STEP_STATUS_KEYS: Record<string, string> = {
  OK: 'ai.automation.runs.stepStatuses.OK',
  SKIPPED: 'ai.automation.runs.stepStatuses.SKIPPED',
  FAILED: 'ai.automation.runs.stepStatuses.FAILED',
  WAITING: 'ai.automation.runs.stepStatuses.WAITING',
};

export const CONDITION_OP_KEYS: Record<string, string> = {
  contains: 'ai.automation.inspector.condition.ops.contains',
  equals: 'ai.automation.inspector.condition.ops.equals',
  starts_with: 'ai.automation.inspector.condition.ops.starts_with',
  matches: 'ai.automation.inspector.condition.ops.matches',
  is_empty: 'ai.automation.inspector.condition.ops.is_empty',
  not_empty: 'ai.automation.inspector.condition.ops.not_empty',
};

export const DELAY_UNIT_KEYS: Record<string, string> = {
  MINUTES: 'ai.automation.inspector.delay.units.MINUTES',
  HOURS: 'ai.automation.inspector.delay.units.HOURS',
  DAYS: 'ai.automation.inspector.delay.units.DAYS',
};
