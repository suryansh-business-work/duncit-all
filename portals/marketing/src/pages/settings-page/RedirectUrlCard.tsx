import { useQuery } from '@apollo/client/react';
import { useTranslation } from '@duncit/app-settings';
import CopyUrlCard from './CopyUrlCard';
import { SOCIAL_REDIRECT_URI, type SocialRedirectUriData } from './queries';

/**
 * The address every network's app must list as its OAuth redirect URL. One
 * URL for all of them — the signed state says which network is answering —
 * shown beside each app's keys so nobody has to guess it.
 */
export default function RedirectUrlCard() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<SocialRedirectUriData>(SOCIAL_REDIRECT_URI, { fetchPolicy: 'cache-first' });
  return (
    <CopyUrlCard
      title={t('marketing.integrations.redirectTitle')}
      subtitle={t('marketing.integrations.redirectBody')}
      note={t('marketing.integrations.redirectNote')}
      errorText={t('marketing.integrations.redirectUnavailable')}
      url={data?.socialRedirectUri ?? ''}
      loading={loading}
      failed={!!error}
      testIdPrefix="redirect-url"
    />
  );
}
