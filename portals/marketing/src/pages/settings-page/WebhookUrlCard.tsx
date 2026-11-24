import { useQuery } from '@apollo/client/react';
import { useTranslation } from '@duncit/app-settings';
import CopyUrlCard from './CopyUrlCard';
import { SOCIAL_WEBHOOK_URL, type SocialWebhookUrlData } from './queries';

/**
 * The callback URL Meta delivers Instagram and Messenger events to. Pasted in
 * Meta for Developers → the app → Webhooks, with the verify token from the
 * Instagram (or Facebook) app's entry, it brings DMs and comments in within
 * seconds instead of at the next sync.
 */
export default function WebhookUrlCard() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<SocialWebhookUrlData>(SOCIAL_WEBHOOK_URL, { fetchPolicy: 'cache-first' });
  return (
    <CopyUrlCard
      title={t('marketing.integrations.webhookTitle')}
      subtitle={t('marketing.integrations.webhookBody')}
      note={t('marketing.integrations.webhookNote')}
      errorText={t('marketing.integrations.webhookUnavailable')}
      url={data?.socialWebhookUrl ?? ''}
      loading={loading}
      failed={!!error}
      testIdPrefix="webhook-url"
    />
  );
}
