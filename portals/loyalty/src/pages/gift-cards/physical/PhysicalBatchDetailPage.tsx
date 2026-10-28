import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Chip, Stack, Typography } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import DetailHeader from '../../../components/detail/DetailHeader';
import DetailPageState, { isNotFoundError } from '../../../components/detail/DetailPageState';
import InfoGrid from '../../../components/detail/InfoGrid';
import { useTableRows } from '../../../lib/useTableRows';
import { useCanWrite } from '../../../lib/roles';
import PrintFileButton from './batch/PrintFileButton';
import PhysicalCardsTable from './tables/PhysicalCardsTable';
import { physicalCardPath } from './PhysicalListPages';
import { formatCoins } from './labels';
import { PHYSICAL_BATCH, PHYSICAL_CARDS_TABLE, type PhysicalBatchRow, type PhysicalCardRow } from './queries';

/** One batch's cards — the table reads only this batch, by its id. */
function BatchCards({ batchId }: Readonly<{ batchId: string }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { fetchRows } = useTableRows<PhysicalCardRow>(PHYSICAL_CARDS_TABLE, 'physicalGiftCardsTable', {
    batch_id: batchId,
  });
  return (
    <Stack spacing={1}>
      <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 800 }}>
        {t('loyalty.physical.batchCards')}
      </Typography>
      <PhysicalCardsTable
        tableId="loyalty-physical-batch-cards"
        fetchRows={fetchRows}
        onRowClick={(row) => navigate(physicalCardPath(row.id))}
      />
    </Stack>
  );
}

/**
 * Loyalty > Physical Gift Cards > one batch — what each card carries, how many
 * were made and for whom, how many have paid out, the print file, and every
 * card in it.
 */
export default function PhysicalBatchDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const canWrite = useCanWrite();
  const { data, loading, error, refetch } = useQuery<{ physicalGiftCardBatch: PhysicalBatchRow }>(PHYSICAL_BATCH, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });
  const batch = data?.physicalGiftCardBatch;

  return (
    <DetailPageState
      loading={loading && !batch}
      error={error}
      notFound={isNotFoundError(error) || (!loading && !error && !batch)}
      onRetry={() => refetch()}
    >
      {batch && (
        <Stack spacing={2.5}>
          <DetailHeader
            backTo="/gift-cards/physical/batches"
            backLabel={t('loyalty.physical.backToBatches')}
            title={batch.label}
            subtitle={t('loyalty.physical.batchSubtitle')}
            status={
              <Chip
                size="small"
                variant="outlined"
                color={batch.assigned ? 'info' : 'primary'}
                label={batch.assigned ? t('loyalty.physical.modeMembersShort') : t('loyalty.physical.modeBulkShort')}
                sx={{ fontWeight: 800 }}
              />
            }
            actions={canWrite ? <PrintFileButton batch={batch} /> : undefined}
          />
          <SectionCard title={t('loyalty.physical.batchFacts')}>
            <InfoGrid
              items={[
                { key: 'coins-each', label: t('loyalty.physical.colCoinsEach'), value: formatCoins(batch.coins) },
                { key: 'quantity', label: t('loyalty.physical.colQuantity'), value: formatCoins(batch.quantity) },
                { key: 'total-coins', label: t('loyalty.physical.colTotalCoins'), value: formatCoins(batch.total_coins) },
                {
                  key: 'redeemed',
                  label: t('loyalty.physical.colRedeemed'),
                  value: t('loyalty.physical.redeemedOf', {
                    vars: { n: formatCoins(batch.redeemed_count), of: formatCoins(batch.quantity), coins: formatCoins(batch.redeemed_coins) },
                  }),
                },
                { key: 'voided', label: t('loyalty.physical.colVoided'), value: formatCoins(batch.voided_count) },
                { key: 'expires', label: t('loyalty.physical.colExpires'), value: formatDateTime(batch.expires_at) },
                { key: 'generated', label: t('loyalty.physical.colGenerated'), value: formatDateTime(batch.created_at) },
                { key: 'generated-by', label: t('loyalty.physical.colCreatedBy'), value: batch.created_by_name || batch.created_by_email },
              ]}
            />
          </SectionCard>
          <BatchCards batchId={batch.id} />
        </Stack>
      )}
    </DetailPageState>
  );
}
