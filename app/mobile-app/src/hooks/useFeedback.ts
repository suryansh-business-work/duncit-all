import { Platform } from 'react-native';
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
export async function submitAppFeedback(category: string, message: string) {
  const input = buildAppFeedbackInput({ category, message, platform: Platform.OS });
  return graphqlRequest<SubmitAppFeedbackResult, { input: AppFeedbackInput }>(
    SubmitAppFeedbackDocument,
    { input },
    { auth: true },
  );
}
