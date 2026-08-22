import { Alert, Stack, Typography } from '@mui/material';
import { InfoRow } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import type { PolicyAcceptanceAccount } from '../../../graphql/policyAcceptance';

const EM_DASH = '—';

interface Props {
  account: PolicyAcceptanceAccount | null;
  formatDateTime: (value: string) => string;
}

/**
 * Who accepted, as the account reads TODAY.
 *
 * Read live rather than copied onto the row, so a renamed or re-addressed
 * account is contactable from this panel. Null is normal and is stated: the
 * account can be erased, and the record of what they accepted outlives it.
 */
export default function AccountPanel({ account, formatDateTime }: Readonly<Props>) {
  const { t } = useTranslation();

  if (!account) {
    return (
      <Stack spacing={1}>
        <Typography variant="subtitle2" fontWeight={800}>
          {t('legalAcceptanceLogs.detail.sectionAccount')}
        </Typography>
        <Alert severity="warning">{t('legalAcceptanceLogs.detail.accountMissing')}</Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" fontWeight={800}>
        {t('legalAcceptanceLogs.detail.sectionAccount')}
      </Typography>
      {account.is_deleted && (
        <Alert severity="warning">{t('legalAcceptanceLogs.detail.accountDeleted')}</Alert>
      )}
      <InfoRow
        variant="split"
        label={t('legalAcceptanceLogs.detail.accountName')}
        value={account.name || EM_DASH}
      />
      <InfoRow
        variant="split"
        label={t('legalAcceptanceLogs.detail.accountEmail')}
        value={account.email || EM_DASH}
      />
      <InfoRow
        variant="split"
        label={t('legalAcceptanceLogs.detail.accountPhone')}
        value={account.phone || EM_DASH}
      />
      <InfoRow
        variant="split"
        label={t('legalAcceptanceLogs.detail.accountStatus')}
        value={account.status || EM_DASH}
      />
      <InfoRow
        variant="split"
        label={t('legalAcceptanceLogs.detail.accountCreated')}
        value={account.created_at ? formatDateTime(account.created_at) : EM_DASH}
      />
      <InfoRow
        variant="split"
        label={t('legalAcceptanceLogs.detail.accountId')}
        value={account.id}
        valueSx={{ fontFamily: 'monospace', fontSize: 12 }}
      />
    </Stack>
  );
}
