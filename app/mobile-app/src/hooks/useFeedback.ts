import { Platform } from 'react-native';

import { appVersion } from '@/utils/app-version';
import { buildAppFeedbackInput, type AppFeedbackInput } from '@duncit/slack';

import { SubmitAppFeedbackDocument } from '@/graphql/feedback';
import { graphqlRequest } from '@/services/graphql.client';

interface SubmitAppFeedbackResult {
  submitAppFeedback: { ok: boolean; channel: string; ts: string };
}

/**
 * Post in-app feedback to Slack via the authed `submitAppFeedback` mutation. The
 * message body is composed with @duncit/slack (shared with the mWeb twin); the
 * server stamps the signed-in identity and routes the channel.
 */
export async function submitAppFeedback(
  category: string,
  message: string,
  mediaUrls: string[] = [],
  sourceScreen = 'Report a Problem',
) {
  const input = buildAppFeedbackInput({
    category,
    message,
    platform: Platform.OS,
    media_urls: mediaUrls,
    app_version: appVersion(),
    // RN's own Platform rather than a new native dep: Version is the OS build
    // and constants.Model is the handset on Android. Enough to reproduce on.
    device_os: `${Platform.OS} ${String(Platform.Version ?? '')}`.trim(),
    device_model: String((Platform.constants as { Model?: string } | undefined)?.Model ?? ''),
    source_screen: sourceScreen,
  });
  return graphqlRequest<SubmitAppFeedbackResult, { input: AppFeedbackInput }>(
    SubmitAppFeedbackDocument,
    { input },
    { auth: true },
  );
}
