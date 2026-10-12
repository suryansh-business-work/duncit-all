import { useCallback, useRef } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Box, Stack, Typography } from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import { useApolloTableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import PaymentReleaseTable, { releasePath } from './PaymentReleaseTable';
import {
  POD_PAYMENT_RELEASES_TABLE,
  PUBLIC_FINANCE_SETTINGS,
  type PodPaymentReleaseRow,
} from './queries';

/** Payment Release: one row per completed pod. Opening a row is where its
 * payouts — host, venue, club admin, product sellers — are reviewed. */
export default function PaymentReleasePage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const navigate = useNavigate();
  const refetchRef = useRef<(() => void) | null>(null);
  const settings = useQuery<{ publicFinanceSettings: { currency_symbol: string } }>(
    PUBLIC_FINANCE_SETTINGS,
    { fetchPolicy: 'cache-first' },
  );

  const fetchRows = useApolloTableFetch<PodPaymentReleaseRow>(
    client,
    POD_PAYMENT_RELEASES_TABLE,
    'podPaymentReleasesTable',
  );

  const open = useCallback(
    (row: PodPaymentReleaseRow) => navigate(releasePath(row)),
    [navigate],
  );

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "center",
          mb: 3
        }}>
        <PaymentsIcon color="primary" />
        <Box>
          <Typography component="h1" variant="h5" sx={{
            fontWeight: 700
          }}>{t('shell.nav.paymentRelease')}</Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>{t('finance.paymentRelease.approveVenueBillingAndHostPayment')}</Typography>
        </Box>
      </Stack>

      <PaymentReleaseTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        symbol={settings.data?.publicFinanceSettings?.currency_symbol ?? ''}
        onOpen={open}
      />
    </Box>
  );
}
