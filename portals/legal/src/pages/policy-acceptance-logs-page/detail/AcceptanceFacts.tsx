import { Stack, Typography } from '@mui/material';
import { InfoRow } from '@duncit/ui';
import { policyAcceptanceMethodLabel, useTranslation } from '@duncit/app-settings';
import type { PolicyAcceptance } from '../../../graphql/policyAcceptance';

const MONO = { fontFamily: 'monospace', fontSize: 12 } as const;

interface Props {
  acceptance: PolicyAcceptance;
  formatDateTime: (value: string) => string;
}

/**
 * The record itself — what was written, exactly as it was written.
 *
 * Nothing here is looked up: these are the row's own fields, which is why the
 * panel still reads correctly for a policy that has since been deleted and an
 * account that has since been erased.
 */
export default function AcceptanceFacts({ acceptance, formatDateTime }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" fontWeight={800}>
        {t('legalAcceptanceLogs.detail.sectionAcceptance')}
      </Typography>
      <InfoRow
        variant="split"
        label={t('legalAcceptanceLogs.detail.acceptedAt')}
        value={formatDateTime(acceptance.accepted_at)}
      />
      <InfoRow
        variant="split"
        label={t('legalAcceptanceLogs.detail.method')}
        value={policyAcceptanceMethodLabel(t, acceptance.method)}
      />
      <InfoRow
        variant="split"
        label={t('legalAcceptanceLogs.detail.surface')}
        value={acceptance.surface}
      />
      <InfoRow
        variant="split"
        label={t('legalAcceptanceLogs.detail.policyUpdatedAt')}
        value={formatDateTime(acceptance.policy_updated_at)}
      />
      <InfoRow
        variant="split"
        label={t('legalAcceptanceLogs.detail.acceptanceId')}
        value={acceptance.id}
        valueSx={MONO}
      />
      <InfoRow
        variant="split"
        label={t('legalAcceptanceLogs.detail.contentHash')}
        value={acceptance.content_hash}
        valueSx={{ ...MONO, wordBreak: 'break-all' }}
      />
      <Typography variant="caption" color="text.secondary">
        {t('legalAcceptanceLogs.detail.contentHashHint')}
      </Typography>
    </Stack>
  );
}
