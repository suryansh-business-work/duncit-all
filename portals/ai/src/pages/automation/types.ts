/**
 * The automation API as the portal reads it. Node `data` travels as JSON, so
 * the graph stays one shape however many step kinds there are.
 */

export type AutomationChannel = 'WHATSAPP' | 'EMAIL';
export type FlowStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED';
export type RunMode = 'LIVE' | 'TEST';
export type RunStatus = 'RUNNING' | 'WAITING_REPLY' | 'WAITING_DELAY' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type StepStatus = 'OK' | 'SKIPPED' | 'FAILED' | 'WAITING';

/** A step's settings: whatever its kind stores. */
export type NodeData = Record<string, unknown>;

export interface FlowNodeDto {
  id: string;
  kind: string;
  x: number;
  y: number;
  /** JSON. */
  data: string;
}

export interface FlowEdgeDto {
  id: string;
  source: string;
  source_handle: string;
  target: string;
}

export interface FlowIssue {
  node_id: string | null;
  message: string;
}

export interface AutomationFlow {
  id: string;
  name: string;
  description: string;
  channel: AutomationChannel;
  status: FlowStatus;
  nodes: FlowNodeDto[];
  edges: FlowEdgeDto[];
  trigger: string;
  issues: FlowIssue[];
  run_count: number;
  last_run_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface RunContact {
  name: string;
  phone: string;
  email: string;
}

export interface RunStep {
  node_id: string;
  kind: string;
  status: StepStatus;
  detail: string;
  at: string;
}

export interface RunMessage {
  id: string;
  direction: 'IN' | 'OUT' | 'SYSTEM';
  kind: string;
  text: string;
  subject: string;
  html: string;
  template_name: string;
  buttons: string[];
  delivered: boolean;
  at: string;
}

export interface AutomationRun {
  id: string;
  flow_id: string;
  flow_name: string;
  channel: AutomationChannel;
  mode: RunMode;
  deliver: boolean;
  status: RunStatus;
  contact: RunContact;
  trigger_text: string;
  trigger_subject: string;
  variables_json: string;
  current_node_id: string;
  steps: RunStep[];
  messages: RunMessage[];
  error: string;
  started_at: string | null;
  finished_at: string | null;
  resume_at: string | null;
  wait_until: string | null;
}

export interface AisensyCampaignOption {
  name: string;
  status: string;
  template_name: string;
  type: string;
  media_url: string;
  media_filename: string;
}

export interface AisensyTemplateButton {
  type: string;
  text: string;
  url: string;
  url_param: number;
}

export interface AisensyTemplateOption {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  body: string;
  param_count: number;
  header: string;
  header_format: string;
  needs_media: boolean;
  footer: string;
  buttons: string[];
  cta_buttons: AisensyTemplateButton[];
}

export interface EmailSenderOption {
  id: string;
  name: string;
  from_address: string;
  is_default: boolean;
}

export interface EmailTemplateOption {
  slug: string;
  name: string;
  subject: string;
  variables: string[];
}

export interface MailboxOption {
  email: string;
  display_name: string;
  is_active: boolean;
}

export interface PromptOption {
  id: string;
  name: string;
  category: string;
  kind: string;
}

export interface AutomationOptions {
  channel: AutomationChannel;
  variables: { name: string; description: string }[];
  prompts: PromptOption[];
  whatsapp_configured: boolean;
  project_configured: boolean;
  campaigns: AisensyCampaignOption[];
  templates: AisensyTemplateOption[];
  saved_campaign_names: { id: string; name: string; description: string }[];
  webhook_url: string;
  webhook_secret_set: boolean;
  email_senders: EmailSenderOption[];
  email_templates: EmailTemplateOption[];
  email_categories: string[];
  mailboxes: MailboxOption[];
}

/** What the test window and the Run-for-a-contact dialog collect. */
export interface ContactInput {
  name: string;
  phone?: string;
  email?: string;
}

/** The route segment for each channel — /automation/whatsapp, /automation/email. */
export const CHANNEL_SLUGS: Record<AutomationChannel, string> = { WHATSAPP: 'whatsapp', EMAIL: 'email' };

export function channelFromSlug(slug: string | undefined): AutomationChannel | null {
  if (slug === 'whatsapp') return 'WHATSAPP';
  if (slug === 'email') return 'EMAIL';
  return null;
}
