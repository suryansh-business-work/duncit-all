import { gql } from '@apollo/client';

/** One automatic WhatsApp message, joined against what AiSensy holds now. */
export interface WaScenario {
  event_key: string;
  campaign: string;
  audience: string;
  category: string;
  fires: string;
  params: string[];
  enabled: boolean;
  can_disable: boolean;
  campaign_status: string;
  template_name: string;
  template_status: string;
  template_category: string;
  template_params: number;
  /** The header asset the CAMPAIGN carries — reconcile-owned, read from AiSensy. */
  media_url: string;
  /** The admin's own header asset. It wins over the campaign's; reconcile never touches it. */
  override_media_url: string;
  override_media_filename: string;
  /** Whether the template's header is media every send must carry an asset for. */
  needs_media: boolean;
  /** Why it cannot send right now; '' when it can. Composed by the server. */
  blocker: string;
}

export interface WaScenarioBoard {
  global_enabled: boolean;
  catalogue_ok: boolean;
  catalogue_error: string;
  rows: WaScenario[];
}

const SCENARIO_BOARD_FIELDS = `
  global_enabled
  catalogue_ok
  catalogue_error
  rows {
    event_key
    campaign
    audience
    category
    fires
    params
    enabled
    can_disable
    campaign_status
    template_name
    template_status
    template_category
    template_params
    media_url
    override_media_url
    override_media_filename
    needs_media
    blocker
  }
`;

export const WHATSAPP_SCENARIOS = gql`
  query WhatsappScenarios {
    whatsappScenarios {
      ${SCENARIO_BOARD_FIELDS}
    }
  }
`;

/** Pass the literal key `__global__` to flip the kill switch. */
export const SET_WHATSAPP_SCENARIO_ENABLED = gql`
  mutation SetWhatsappScenarioEnabled($event_key: String!, $enabled: Boolean!) {
    setWhatsappScenarioEnabled(event_key: $event_key, enabled: $enabled) {
      ${SCENARIO_BOARD_FIELDS}
    }
  }
`;

export const RECONCILE_WHATSAPP_SCENARIOS = gql`
  mutation ReconcileWhatsappScenarios {
    reconcileWhatsappScenarios {
      ${SCENARIO_BOARD_FIELDS}
    }
  }
`;

/** An empty url clears the override. Reconcile never overwrites what this sets. */
export const SET_WHATSAPP_SCENARIO_MEDIA = gql`
  mutation SetWhatsappScenarioMedia($event_key: String!, $url: String!, $filename: String) {
    setWhatsappScenarioMedia(event_key: $event_key, url: $url, filename: $filename) {
      ${SCENARIO_BOARD_FIELDS}
    }
  }
`;
