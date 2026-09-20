import { Box } from '@mui/material';
import { EM_DASH } from '@duncit/table';
import { InfoRow, SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import type { ShortLinkPolicy } from '../queries';

interface Props {
  policy: ShortLinkPolicy;
  formatDateTime: (value: Date | string) => string;
}

/** What the stored click data looks like right now, in numbers. */
export default function PrivacyFacts({ policy, formatDateTime }: Readonly<Props>) {
  const { t } = useTranslation();
  const when = (value?: string | null) => (value ? formatDateTime(value) : EM_DASH);
  const lastPurge = policy.last_purge_at
    ? t('marketing.externalLinks.lastSweepValue', {
        vars: {
          when: formatDateTime(policy.last_purge_at),
          count: policy.last_purged_count.toLocaleString(),
        },
      })
    : t('marketing.externalLinks.sweepNotRunYet');

  return (
    <SectionCard
      title={t('marketing.externalLinks.storedClickData')}
      subtitle={t('marketing.externalLinks.storedClickDataHint')}
    >
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        }}
      >
        <InfoRow
          label={t('marketing.externalLinks.clicksStored')}
          value={policy.clicks_stored.toLocaleString()}
          testId="privacy-clicks-stored"
        />
        <InfoRow
          label={t('marketing.externalLinks.pastRetention')}
          value={policy.clicks_beyond_retention.toLocaleString()}
          testId="privacy-clicks-beyond-retention"
        />
        <InfoRow
          label={t('marketing.externalLinks.minimisedOnRequest')}
          value={policy.consent_minimised.toLocaleString()}
          testId="privacy-consent-minimised"
        />
        <InfoRow
          label={t('marketing.externalLinks.deletedBelow')}
          value={when(policy.retention_cutoff)}
          testId="privacy-retention-cutoff"
        />
        <InfoRow
          label={t('marketing.externalLinks.lastSweep')}
          value={lastPurge}
          testId="privacy-last-purge"
        />
        <InfoRow
          label={t('marketing.externalLinks.saltLastRotated')}
          value={when(policy.ip_salt_rotated_at)}
          testId="privacy-salt-rotated"
        />
      </Box>
    </SectionCard>
  );
}
