import { gql } from '@apollo/client';

/** A connected mailbox, as both portals read it. The rule fields are here too
 * because the Tech page shows what its grant is being used for — it just
 * cannot edit them (that is the Support portal's half). */
export interface MailAutomationAccount {
  id: string;
  email: string;
  display_name: string;
  is_active: boolean;
  ticket_type: 'SUPPORT' | 'GRIEVANCE' | 'REPORT_PROBLEM';
  sla_label: string;
  ai_enabled: boolean;
  is_connected: boolean;
  last_polled_at: string | null;
  last_error: string;
  connected_at: string;
}

export const MAIL_AUTOMATION_CONFIGURED = gql`
  query MailAutomationConfigured {
    mailAutomationConfigured
  }
`;

export const MAIL_AUTOMATION_ACCOUNTS = gql`
  query MailAutomationAccounts {
    mailAutomationAccounts {
      id
      email
      display_name
      is_active
      ticket_type
      sla_label
      ai_enabled
      is_connected
      last_polled_at
      last_error
      connected_at
    }
  }
`;

export const MAIL_AUTOMATION_CONNECT_URL = gql`
  mutation MailAutomationConnectUrl($login_hint: String) {
    mailAutomationConnectUrl(login_hint: $login_hint)
  }
`;

export const DISCONNECT_MAIL_AUTOMATION_ACCOUNT = gql`
  mutation DisconnectMailAutomationAccount($id: ID!) {
    disconnectMailAutomationAccount(id: $id)
  }
`;
