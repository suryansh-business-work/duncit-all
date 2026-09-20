import { Box, Chip, Stack } from '@mui/material';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { InfoRow, SectionCard, StatCard } from '@duncit/ui';
import { formatDate, useTranslation } from '@duncit/app-settings';
import type { DnsDomainInfo } from '@duncit/gql-types';
import { EXPIRY_COLOR, expiryLevel } from './expiry';

const EM_DASH = '—';

const GRID = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
} as const;

const asDate = (iso: string | null | undefined) => (iso ? formatDate(iso) : EM_DASH);

interface Props {
  info: DnsDomainInfo;
}

/** When the registration runs out, how long that is, and what GoDaddy calls its state. */
export default function DomainFacts({ info }: Readonly<Props>) {
  const { t } = useTranslation();
  const level = expiryLevel(info.days_to_expiry);
  const days = info.days_to_expiry;

  let daysValue = EM_DASH;
  if (days !== null && days !== undefined) {
    daysValue = days < 0 ? t('tech.domain.expiredDaysAgo', { vars: { days: String(-days) } }) : String(days);
  }

  return (
    <SectionCard title={t('tech.domain.registrationTitle')} subtitle={t('tech.domain.registrationSubtitle')}>
      <Box sx={GRID}>
        <StatCard
          label={t('tech.domain.daysToExpiry')}
          value={daysValue}
          valueColor={EXPIRY_COLOR[level]}
          icon={<EventBusyIcon fontSize="small" />}
          hint={t('tech.domain.expiresOn', { vars: { date: asDate(info.expires_at) } })}
          testId="domain-days-to-expiry"
        />
        <StatCard
          label={t('tech.domain.status')}
          value={info.status ?? EM_DASH}
          hint={t('tech.domain.statusHint')}
          testId="domain-status"
        />
        <StatCard
          label={t('tech.domain.registeredOn')}
          value={asDate(info.created_at)}
          hint={t('tech.domain.registeredHint')}
          testId="domain-registered-on"
        />
        <StatCard
          label={t('tech.domain.renewDeadline')}
          value={asDate(info.renew_deadline)}
          hint={t('tech.domain.renewDeadlineHint')}
          testId="domain-renew-deadline"
        />
      </Box>
      <Stack spacing={1} sx={{ mt: 2 }}>
        <InfoRow variant="split" label={t('tech.domain.domainName')} value={info.domain || EM_DASH} testId="domain-name" />
        <InfoRow
          variant="split"
          label={t('tech.domain.domainId')}
          value={info.domain_id === null || info.domain_id === undefined ? EM_DASH : String(info.domain_id)}
          testId="domain-id"
        />
        <InfoRow
          variant="split"
          label={t('tech.domain.renewable')}
          value={
            <Chip
              size="small"
              variant="outlined"
              color={info.renewable === false ? 'error' : 'default'}
              label={info.renewable === false ? t('shell.common.no') : t('shell.common.yes')}
            />
          }
          testId="domain-renewable"
        />
      </Stack>
    </SectionCard>
  );
}
