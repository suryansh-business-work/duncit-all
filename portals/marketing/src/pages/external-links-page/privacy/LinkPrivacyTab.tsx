import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Skeleton, Stack } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import { SectionCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import LinkPrivacyForm, { toPolicyInput } from '../link-privacy-form';
import type { LinkPrivacyFormValues } from '../link-privacy-form';
import PrivacyActions from './PrivacyActions';
import PrivacyFacts from './PrivacyFacts';
import PrivacyNotice from './PrivacyNotice';
import { SHORT_LINK_POLICY, UPDATE_SHORT_LINK_POLICY, type ShortLinkPolicy } from '../queries';

/** Marketing → External Links → Privacy & GDPR. */
export default function LinkPrivacyTab() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const [error, setError] = useState<string | null>(null);
  const { data, loading, error: loadError, refetch } = useQuery<{
    shortLinkPolicy: ShortLinkPolicy;
  }>(SHORT_LINK_POLICY, { fetchPolicy: 'cache-and-network' });
  const [save, { loading: saving }] = useMutation<any>(UPDATE_SHORT_LINK_POLICY);

  const submit = async (values: LinkPrivacyFormValues) => {
    setError(null);
    try {
      await save({ variables: { input: toPolicyInput(values) } });
    } catch (e) {
      setError(parseApiError(e, t('marketing.externalLinks.couldNotSavePrivacy')));
      return;
    }
    notifySuccess(t('marketing.externalLinks.privacySaved'));
    await refetch();
  };

  if (loadError) {
    return (
      <Alert severity="error">
        {parseApiError(loadError, t('marketing.externalLinks.couldNotLoadPolicy'))}
      </Alert>
    );
  }

  const policy = data?.shortLinkPolicy;
  if (!policy) {
    return <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 1 }} />;
  }

  return (
    <Stack spacing={2}>
      <SectionCard
        title={t('marketing.externalLinks.retentionAndConsent')}
        subtitle={t('marketing.externalLinks.retentionAndConsentHint')}
      >
        {/* Keyed on the stored values so a refetch after saving rebuilds the
            form around them — otherwise it keeps its own defaults and reads
            as dirty against data it already agrees with. */}
        <LinkPrivacyForm
          key={policy.updated_at}
          policy={policy}
          busy={saving || loading}
          errorMessage={error}
          onSubmit={submit}
        />
      </SectionCard>

      <PrivacyFacts policy={policy} formatDateTime={formatDateTime} />

      <PrivacyActions
        beyondRetention={policy.clicks_beyond_retention}
        onDone={() => {
          refetch().catch(() => undefined);
        }}
      />

      <PrivacyNotice />
    </Stack>
  );
}
