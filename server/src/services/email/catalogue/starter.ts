import { closing, intro, shell } from './mjml';

/**
 * The body a new template starts from, and the stand-in the Fragments page
 * previews a draft header and footer around.
 *
 * Drawn with the same builders as every shipped email, so what an admin starts
 * from — and what a fragment is previewed against — is the real card: closed
 * edges, the shared head with its dark mode, the gutter. A hand-written stand-in
 * in the portal drifted from the design the moment the design changed.
 */
export const STARTER_MJML = shell(
  'email.starter.title',
  [intro('email.starter.title', 'email.starter.body', 'name'), closing('email.starter.note')].join('\n'),
  'email.starter.body'
);
