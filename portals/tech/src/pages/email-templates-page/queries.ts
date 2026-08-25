import { gql } from '@apollo/client';

export const TEMPLATES = gql`
  query EmailTemplates {
    emailTemplates {
      template_id
      slug
      name
      description
      subject
      mjml
      fragment_key
      footer_note
      variables {
        key
        description
        sample
      }
      is_active
      updated_at
    }
  }
`;

/**
 * How often each template has actually been used, from the email log.
 *
 * A separate query from TEMPLATES on purpose: that one carries every MJML body
 * on the page, and these numbers move after a send while the bodies do not.
 */
export const TEMPLATE_USAGE = gql`
  query EmailTemplateUsage {
    emailTemplateUsage {
      slug
      sent
      skipped
      failed
      total
      last_sent_at
      last_attempt_at
    }
  }
`;

/** One template's tally. Absent from the list entirely when it has never sent. */
export interface TemplateUsage {
  slug: string;
  sent: number;
  skipped: number;
  failed: number;
  total: number;
  /** Null when it has only ever failed — which is not the same as never used. */
  last_sent_at?: string | null;
  last_attempt_at?: string | null;
}

export const RENDER = gql`
  query RenderTpl($mjml: String!, $vars: String, $fragment: String) {
    renderEmailTemplate(mjml: $mjml, vars: $vars, fragment_key: $fragment) {
      html
      errors
      detected_variables
    }
  }
`;

export const CREATE = gql`
  mutation CreateTpl($input: CreateEmailTemplateInput!) {
    createEmailTemplate(input: $input) {
      template_id
    }
  }
`;
export const UPDATE = gql`
  mutation UpdateTpl($id: ID!, $input: UpdateEmailTemplateInput!) {
    updateEmailTemplate(template_id: $id, input: $input) {
      template_id
    }
  }
`;
export const DELETE = gql`
  mutation DeleteTpl($id: ID!) {
    deleteEmailTemplate(template_id: $id)
  }
`;
export const SEND_TEST = gql`
  mutation SendTest($id: ID!, $to: String!, $vars: String) {
    sendTestEmail(template_id: $id, to: $to, vars: $vars) {
      ok
      message
    }
  }
`;

export const STARTER = `<mjml>
  <mj-body>
    <mj-section background-color="#ffffff">
      <mj-column>
        <mj-text font-size="20px" font-weight="700">Hello {{ name }}</mj-text>
        <mj-text>Edit this template and click Preview.</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`;

export interface Tpl {
  template_id: string;
  slug: string;
  name: string;
  description?: string;
  subject: string;
  mjml: string;
  /** Which header/footer fragment wraps this body. Null renders it bare. */
  fragment_key?: string | null;
  /** This template's own footer sentence, rendered inside the fragment. */
  footer_note?: string;
  variables: { key: string; description?: string; sample?: string }[];
  is_active: boolean;
  /** Server-written, never edited here — what "Recently updated" sorts on. */
  updated_at?: string | null;
}

/** Every fragment, for the template's Header / footer picker. */
export const FRAGMENT_OPTIONS = gql`
  query FragmentOptions {
    emailFragments {
      key
      name
      is_active
    }
  }
`;

export interface FragmentOption {
  key: string;
  name: string;
  is_active: boolean;
}
