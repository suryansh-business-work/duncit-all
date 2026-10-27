import { useApolloClient } from '@apollo/client/react';
import { useState } from 'react';
import { Stack, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { DuncitButton } from '@duncit/buttons';
import { notifyError } from '@duncit/dialogs';
import { downloadTextFile } from '@duncit/utils';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { toCsv } from '../../../../lib/csv';
import { physicalStatusLabels } from '../labels';
import { PHYSICAL_BATCH_PASSCODES, type PhysicalBatchRow, type PhysicalPasscodeRow } from '../queries';

/** A file name a person can recognise later, without characters a file system refuses. */
const fileNameFor = (batch: PhysicalBatchRow) =>
  `${batch.label.replaceAll(/[^\w-]+/g, '-').replaceAll(/-+/g, '-').replaceAll(/(^-)|(-$)/g, '') || 'batch'}-${batch.id}.csv`;

/**
 * The print file: every card number of the batch with its passcode, for the
 * printer. It is fetched only when asked for — never with the batch — and the
 * server writes the export into the card history. A reader seat is refused by
 * the server and told so here.
 */
export default function PrintFileButton({ batch }: Readonly<{ batch: PhysicalBatchRow }>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const client = useApolloClient();
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const { data } = await client.query<{ physicalGiftCardBatchPasscodes: PhysicalPasscodeRow[] }>({
        query: PHYSICAL_BATCH_PASSCODES,
        variables: { batch_id: batch.id },
        // Every export is a fresh, audited read — never served from the cache.
        fetchPolicy: 'network-only',
      });
      const rows = data?.physicalGiftCardBatchPasscodes ?? [];
      const labels = physicalStatusLabels(t);
      const csv = toCsv(
        [
          t('loyalty.physical.csvCardNumber'),
          t('loyalty.physical.csvPasscode'),
          t('loyalty.physical.csvCoins'),
          t('loyalty.physical.csvStatus'),
          t('loyalty.physical.csvMember'),
          t('loyalty.physical.csvMemberEmail'),
          t('loyalty.physical.csvExpires'),
        ],
        rows.map((r) => [
          r.card_number,
          r.passcode,
          r.coins,
          labels[r.status],
          r.assigned_user_name,
          r.assigned_user_email,
          formatDate(r.expires_at),
        ]),
      );
      downloadTextFile(csv, fileNameFor(batch), 'text/csv;charset=utf-8');
    } catch {
      notifyError(t('loyalty.physical.downloadError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={0.5} sx={{ alignItems: { xs: 'flex-start', sm: 'flex-end' } }}>
      <DuncitButton
        variant="contained"
        startIcon={<DownloadIcon />}
        loading={busy}
        onClick={download}
        data-testid="physical-print-file"
      >
        {t('loyalty.physical.downloadCsv')}
      </DuncitButton>
      <Typography variant="caption" sx={{ color: 'text.secondary', maxWidth: 320 }}>
        {t('loyalty.physical.downloadHint')}
      </Typography>
    </Stack>
  );
}
