import { Alert, Chip, Stack, Typography } from '@mui/material';
import { InfoRow } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import type { PolicyAcceptanceDetail } from '../../../graphql/policyAcceptance';

const EM_DASH = '—';

interface Props {
  policy: PolicyAcceptanceDetail['policy'];
  /** The wording fingerprint on the acceptance being inspected. */
  acceptedHash: string;
  formatDateTime: (value: string) => string;
}

/**
 * The policy as it reads today, and whether this acceptance still matches it.
 *
 * The comparison is the reason the panel exists: an acceptance is only a
 * current agreement while the wording it names is the wording in force, and
 * the difference between the two hashes is the whole answer.
 */
export default function PolicyPanel({ policy, acceptedHash, formatDateTime }: Readonly<Props>) {
  const { t } = useTranslation();
  const heading = (
    <Typography variant="subtitle2" sx={{
      fontWeight: 800
    }}>
      {t('legalAcceptanceLogs.detail.sectionPolicy')}
    </Typography>
  );

  if (!policy) {
    return (
      <Stack spacing={1}>
        {heading}
        <Alert severity="warning">{t('legalAcceptanceLogs.detail.policyMissing')}</Alert>
      </Stack>
    );
  }

  const stale = policy.content_hash !== acceptedHash;
  const activeLabel = policy.is_active ? t('shell.common.active') : t('shell.common.inactive');

  return (
    <Stack spacing={1}>
      {heading}
      <InfoRow variant="split" label={t('shell.common.title')} value={policy.title} />
      <InfoRow
        variant="split"
        label={t('legalAcceptanceLogs.detail.policyNo')}
        value={policy.policy_no || EM_DASH}
      />
      <InfoRow
        variant="split"
        label={t('legalAcceptanceLogs.detail.policySlug')}
        value={policy.slug}
      />
      <InfoRow
        variant="split"
        label={t('legalAcceptanceLogs.detail.policyType')}
        value={policy.policy_type || EM_DASH}
      />
      <InfoRow
        variant="split"
        label={t('legalAcceptanceLogs.detail.policyActive')}
        value={
          <Chip
            size="small"
            variant={policy.is_active ? 'filled' : 'outlined'}
            color={policy.is_active ? 'success' : 'default'}
            label={activeLabel}
          />
        }
      />
      <InfoRow
        variant="split"
        label={t('legalAcceptanceLogs.detail.policyVersions')}
        value={String(policy.version_count)}
      />
      <InfoRow
        variant="split"
        label={t('legalAcceptanceLogs.detail.policyUpdated')}
        value={formatDateTime(policy.updated_at)}
      />
      <Alert severity={stale ? 'info' : 'success'}>
        {stale
          ? t('legalAcceptanceLogs.detail.policyIsStale')
          : t('legalAcceptanceLogs.detail.policyIsCurrent')}
      </Alert>
    </Stack>
  );
}
