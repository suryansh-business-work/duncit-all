/**
 * Meeting platform options + auto-generation helpers.
 *
 * Auto-generation calls the server which holds OAuth credentials for the
 * relevant platforms (Zoom, Google Meet, Teams). When the server isn't
 * configured for a platform, the response includes a `requires_oauth: true`
 * flag and we surface that as an error so the admin can paste a link
 * manually instead.
 *
 * Env vars consumed server-side (do NOT expose to the browser):
 *   ZOOM_OAUTH_ACCOUNT_ID, ZOOM_OAUTH_CLIENT_ID, ZOOM_OAUTH_CLIENT_SECRET
 *   GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN
 *   MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET, MS_GRAPH_TENANT_ID
 */

import { meetingPlatformOptions } from '@duncit/utils';
import { resolveGraphqlUrl } from '../../shared/graphql-url';

/**
 * The platform picker's options. The product names are `@duncit/utils`' — the
 * same words in every language — and only the manual-link row is copy, read
 * through the editor's translator (rule 38).
 */
export const meetingPlatforms = (t: (key: string) => string) =>
  meetingPlatformOptions(t('admin.pods.meetingPlatformOther'));

export interface GenerateMeetingLinkInput {
  platform: string;
  title: string;
  startISO: string;
  endISO?: string;
}

interface GenerateMeetingLinkResponse {
  data?: {
    generateMeetingLink?: {
      ok: boolean;
      url?: string | null;
      message?: string | null;
      requires_oauth?: boolean;
    };
  };
  errors?: Array<{ message: string }>;
}

/**
 * Calls the server mutation that creates a meeting via the platform's API.
 *
 * The server is the source of truth for OAuth tokens; the browser never
 * receives credentials. If the server isn't configured for a given platform
 * yet (no env vars set), the call resolves with `requires_oauth: true` and
 * this helper throws so the UI can show a clear "paste link manually" hint.
 */
export async function generateMeetingLink(input: GenerateMeetingLinkInput): Promise<string> {
  const endpoint =
    (globalThis.window !== undefined && (globalThis as any).__GRAPHQL_URL__) ||
    resolveGraphqlUrl();

  const query = /* GraphQL */ `
    mutation GenerateMeetingLink(
      $platform: String!
      $title: String!
      $start: String!
      $end: String
    ) {
      generateMeetingLink(platform: $platform, title: $title, start: $start, end: $end) {
        ok
        url
        message
        requires_oauth
      }
    }
  `;

  const response = await fetch(endpoint, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: {
        platform: input.platform,
        title: input.title,
        start: input.startISO,
        end: input.endISO ?? null,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Meeting link generator returned HTTP ${response.status}`);
  }

  const payload: GenerateMeetingLinkResponse = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors[0].message);
  }
  const result = payload.data?.generateMeetingLink;
  if (!result?.ok || !result.url) {
    if (result?.requires_oauth) {
      throw new Error(
        `${input.platform} is not connected on the server yet. Paste a link manually for now.`,
      );
    }
    throw new Error(result?.message ?? 'Could not generate meeting link');
  }
  return result.url;
}
