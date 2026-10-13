import type { WaScenario, WaScenarioBoard } from '../../src/pages/whatsapp-page/wa-automation/queries';

/** A board row as the server sends it; override only what a case is about. */
export const makeScenario = (over: Partial<WaScenario> = {}): WaScenario => ({
  event_key: 'order_placed',
  campaign: 'order_camp',
  audience: 'USER',
  category: 'TRANSACTIONAL',
  fires: 'When an order is placed',
  params: ['name', 'order id'],
  enabled: true,
  can_disable: true,
  campaign_status: 'LIVE',
  template_name: 'order_tpl',
  template_status: 'APPROVED',
  template_category: 'UTILITY',
  template_params: 2,
  template_header_format: 'IMAGE',
  media_url: '',
  override_media_url: '',
  override_media_filename: '',
  needs_media: false,
  provision_step: '',
  blocker: '',
  ...over,
});

export const makeBoard = (over: Partial<WaScenarioBoard> = {}): WaScenarioBoard => ({
  global_enabled: true,
  default_media_url: 'https://cdn.example.test/default.png',
  default_document_url: '',
  catalogue_ok: true,
  catalogue_error: '',
  rows: [makeScenario()],
  ...over,
});
