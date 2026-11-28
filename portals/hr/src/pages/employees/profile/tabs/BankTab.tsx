import { useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Alert, Box, Stack } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { InfoRow, SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import type { HrBankSummary } from '@duncit/utils';
import { HR_EMPLOYEE_BANK_DETAILS, HR_EMPLOYEE_HISTORY, type BankDetailsData, type HrBankDetails } from '../../../../lib/employee-queries';

/**
 * Bank and statutory details, masked. "Show full details" asks the server for
 * the account number and PAN — a request the server writes to the history —
 * held only in this component's state (never the Apollo cache) and dropped on
 * Hide or when the page closes.
 */
export default function BankTab({ employeeId, bank }: Readonly<{ employeeId: string; bank: HrBankSummary }>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [full, setFull] = useState<HrBankDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const notSet = t('hrEmployee.profile.notSet');
  const hasAny = Boolean(bank.account_number_masked || bank.ifsc || bank.pan_masked || bank.uan || bank.account_holder_name);

  const show = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const { data } = await client.query<BankDetailsData>({ query: HR_EMPLOYEE_BANK_DETAILS, variables: { id: employeeId }, fetchPolicy: 'no-cache' });
      setFull(data?.hrEmployeeBankDetails ?? null);
      await client.refetchQueries({ include: [HR_EMPLOYEE_HISTORY] });
    } catch (error) {
      logs.portal.hr.error('BankTab', 'reveal', { error });
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard
      title={t('hrEmployee.profile.tab.bank')}
      action={
        hasAny && (
          <DuncitButton startIcon={full ? <VisibilityOffIcon /> : <VisibilityIcon />} onClick={() => (full ? setFull(null) : fireAndForget(show(), logs.portal.hr, 'BankTab', 'reveal'))} disabled={loading} data-testid="hr-bank-reveal">
            {full ? t('hrEmployee.profile.bankHide') : t('hrEmployee.profile.bankReveal')}
          </DuncitButton>
        )
      }
    >
      {hasAny ? (
        <Stack spacing={2}>
          {!full && <Alert severity="info">{t('hrEmployee.profile.bankRevealHint')}</Alert>}
          {failed && <Alert severity="error">{t('hrEmployee.toast.loadFailed')}</Alert>}
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
            <InfoRow label={t('hrEmployee.field.accountHolder')} value={bank.account_holder_name ?? notSet} />
            <InfoRow label={t('hrEmployee.field.accountNumber')} value={full?.account_number ?? bank.account_number_masked ?? notSet} testId="hr-bank-account-value" />
            <InfoRow label={t('hrEmployee.field.ifsc')} value={bank.ifsc ?? notSet} />
            <InfoRow label={t('hrEmployee.field.bankName')} value={bank.bank_name ?? notSet} />
            <InfoRow label={t('hrEmployee.field.pan')} value={full?.pan ?? bank.pan_masked ?? notSet} testId="hr-bank-pan-value" />
            <InfoRow label={t('hrEmployee.field.uan')} value={bank.uan ?? notSet} />
          </Box>
        </Stack>
      ) : (
        <Alert severity="info">{t('hrEmployee.profile.bankEmpty')}</Alert>
      )}
    </SectionCard>
  );
}
