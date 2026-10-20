import { gql } from '@apollo/client';

export const FRAGMENTS = gql`
  query EmailFragments {
    emailFragments {
      fragment_id
      key
      category
      is_system
      name
      description
      header_mjml
      footer_mjml
      is_active
      updated_at
    }
  }
`;

/**
 * Which templates each fragment wraps.
 *
 * The same root field the Templates page reads, asked for without the MJML
 * bodies: this page needs a name and a slug per template to say where a
 * header and footer is consumed, and pulling thirty-five email bodies to
 * count them would make opening Fragments as slow as opening Templates.
 */
export const FRAGMENT_TEMPLATE_USAGE = gql`
  query FragmentTemplateUsage {
    emailTemplates {
      template_id
      slug
      name
      fragment_key
      is_active
    }
  }
`;

/** One template, as the fragment pages need to name and link to it. */
export interface FragmentTemplateRef {
  template_id: string;
  slug: string;
  name: string;
  fragment_key?: string | null;
  is_active: boolean;
}

export const UPDATE_FRAGMENT = gql`
  mutation UpdateFragment($key: String!, $input: UpdateEmailFragmentInput!) {
    updateEmailFragment(key: $key, input: $input) {
      fragment_id
    }
  }
`;

export const RESET_FRAGMENT = gql`
  mutation ResetFragment($key: String!) {
    resetEmailFragment(key: $key) {
      fragment_id
    }
  }
`;

/** The template renderer doubles as the fragment previewer — see STARTER_BODY. */
export const RENDER = gql`
  query RenderFragment($mjml: String!) {
    renderEmailTemplate(mjml: $mjml) {
      html
      errors
    }
  }
`;

export interface Fragment {
  fragment_id: string;
  key: string;
  category?: string | null;
  is_system: boolean;
  name: string;
  description?: string | null;
  header_mjml: string;
  footer_mjml: string;
  is_active: boolean;
  updated_at?: string | null;
}

/**
 * The stand-in body a header and footer are previewed around — the server's
 * own starter, drawn with the shipped email design, so the preview shows the
 * fragment exactly as it will sit on a real email (closed card, same canvas,
 * same dark mode) instead of around a hand-written approximation of one.
 */
export const STARTER_BODY = gql`
  query EmailStarterMjml {
    emailStarterMjml
  }
`;

/**
 * Compose the DRAFT header and footer around the stand-in body: the header just
 * inside `<mj-body …>`, the footer just before `</mj-body>` — where the server
 * puts the saved ones on a send.
 *
 * The server can wrap with the SAVED fragment, but an editor has to show what
 * is on screen right now — previewing the saved copy would hide every unsaved
 * change, which is the one thing a preview exists to prevent.
 */
export function previewDocument(body: string, header: string, footer: string): string {
  const open = body.search(/<mj-body\b/i);
  const start = open === -1 ? -1 : body.indexOf('>', open) + 1;
  const end = body.toLowerCase().lastIndexOf('</mj-body>');
  if (start <= 0 || end < start) return body;
  return `${body.slice(0, start)}\n${header}\n${body.slice(start, end)}\n${footer}\n${body.slice(end)}`;
}

export const CREATE_FRAGMENT = gql`
  mutation CreateFragment($input: CreateEmailFragmentInput!) {
    createEmailFragment(input: $input) {
      key
    }
  }
`;

export const DELETE_FRAGMENT = gql`
  mutation DeleteFragment($key: String!) {
    deleteEmailFragment(key: $key)
  }
`;
