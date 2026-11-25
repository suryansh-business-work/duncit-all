import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { buildAppFeedbackInput } from '@duncit/slack';

import { gql } from '@/generated/graphql';
import { gqlRequest } from '@/services/graphql.client';

/** The same Report-a-Problem mutation the member app and mWeb file through. */
export const CrmAppSubmitFeedbackDocument = gql(`
  mutation CrmAppSubmitFeedback($input: AppFeedbackInput!) {
    submitAppFeedback(input: $input) { ok }
  }
`);

/** This build's version (app.json), for crash reports and Settings. */
export const appVersion = (): string => Constants.expoConfig?.version ?? '';

/** File a support feedback row (Report an Issue on the error screen). */
export async function submitFeedback(
  category: string,
  message: string,
  sourceScreen: string,
): Promise<void> {
  const input = buildAppFeedbackInput({
    category,
    message,
    platform: Platform.OS,
    app_version: `crm-app ${appVersion()}`,
    device_os: `${Platform.OS} ${String(Platform.Version ?? '')}`.trim(),
    device_model: String((Platform.constants as { Model?: string } | undefined)?.Model ?? ''),
    source_screen: sourceScreen,
  });
  await gqlRequest(CrmAppSubmitFeedbackDocument, { input });
}
