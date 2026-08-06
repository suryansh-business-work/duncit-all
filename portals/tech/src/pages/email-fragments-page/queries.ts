import { gql } from '@apollo/client';

export const FRAGMENTS = gql`
  query EmailFragments {
    emailFragments {
      fragment_id
      category
      name
      description
      header_mjml
      footer_mjml
      is_active
      updated_at
    }
  }
`;

export const UPDATE_FRAGMENT = gql`
  mutation UpdateFragment($category: EmailCategory!, $input: UpdateEmailFragmentInput!) {
    updateEmailFragment(category: $category, input: $input) {
      fragment_id
    }
  }
`;

export const RESET_FRAGMENT = gql`
  mutation ResetFragment($category: EmailCategory!) {
    resetEmailFragment(category: $category) {
      fragment_id
    }
  }
`;

/** The template renderer doubles as the fragment previewer — see PREVIEW_BODY. */
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
  category: string;
  name: string;
  description?: string | null;
  header_mjml: string;
  footer_mjml: string;
  is_active: boolean;
  updated_at?: string | null;
}

/**
 * A stand-in for whatever template will sit between the header and the footer.
 * Deliberately plain: the point of this preview is the chrome above and below
 * it, and a decorated body would compete with what is being edited.
 */
export const PREVIEW_BODY = `    <mj-section background-color="#ffffff" padding="24px">
      <mj-column>
        <mj-text font-size="18px" font-weight="700" color="#111827">Your template body</mj-text>
        <mj-text color="#4b5563">This is where the email's own content is rendered. The header above and the footer below come from this fragment.</mj-text>
      </mj-column>
    </mj-section>`;

/**
 * Compose the DRAFT header and footer around the stand-in body.
 *
 * The server can wrap with the SAVED fragment, but an editor has to show what
 * is on screen right now — previewing the saved copy would hide every unsaved
 * change, which is the one thing a preview exists to prevent.
 */
export function previewDocument(header: string, footer: string): string {
  return `<mjml>
  <mj-body background-color="#f4f4f4">
${header}
${PREVIEW_BODY}
${footer}
  </mj-body>
</mjml>`;
}
