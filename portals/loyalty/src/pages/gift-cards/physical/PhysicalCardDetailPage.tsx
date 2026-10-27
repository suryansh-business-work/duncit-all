import { useState } from 'react';
import { useParams } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Grid, Stack } from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import { DuncitButton } from '@duncit/buttons';
import { notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import { fireAndForget } from '@duncit/logs';
import { loyaltyLog } from '../../../lib/logger';
import DetailHeader from '../../../components/detail/DetailHeader';
import DetailPageState, { isNotFoundError } from '../../../components/detail/DetailPageState';
import CoinCreditSection from '../../../components/detail/CoinCreditSection';
import { useCanWrite } from '../../../lib/roles';
import CardFactsSection from './card/CardFactsSection';
import CardHistorySection from './card/CardHistorySection';
import VoidCardForm, { type VoidCardValues } from './card/void-card';
import { PhysicalStatusChip } from './labels';
import { PHYSICAL_CARD_DETAIL, VOID_PHYSICAL_CARD, type PhysicalCardDetail } from './queries';

/**
 * Loyalty > Physical Gift Cards > one card — its numbers (the passcode behind
 * an audited reveal), its coins, its batch and member, the coin credit its
 * redemption wrote, and its whole history. An unredeemed card can be
 * cancelled here, with a reason.
 */
export default function PhysicalCardDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const canWrite = useCanWrite();
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);
  const { data, loading, error, refetch } = useQuery<{ physicalGiftCardAdminDetail: PhysicalCardDetail }>(
    PHYSICAL_CARD_DETAIL,
    { variables: { id }, skip: !id, fetchPolicy: 'cache-and-network' },
  );
  const [voidCard, voiding] = useMutation(VOID_PHYSICAL_CARD);
  const detail = data?.physicalGiftCardAdminDetail;

  const submitVoid = async ({ reason }: VoidCardValues) => {
    setVoidError(null);
    try {
      await voidCard({ variables: { id, reason: reason.trim() } });
      setVoidOpen(false);
      notifySuccess(t('loyalty.physical.voided'));
      await refetch();
    } catch (e) {
      // The server says exactly why (already redeemed, already cancelled).
      setVoidError((e as { message?: string })?.message || t('loyalty.physical.voidError'));
    }
  };

  return (
    <DetailPageState
      loading={loading && !detail}
      error={error}
      notFound={isNotFoundError(error) || (!loading && !error && !detail)}
      onRetry={() => refetch()}
    >
      {detail && (
        <Stack spacing={2.5}>
          <DetailHeader
            backTo="/gift-cards/physical/cards"
            backLabel={t('loyalty.physical.backToCards')}
            title={t('loyalty.physical.cardTitle', { vars: { number: detail.card.card_number } })}
            subtitle={t('loyalty.physical.cardSubtitle')}
            status={<PhysicalStatusChip status={detail.card.status} t={t} />}
            actions={
              canWrite && detail.card.status === 'ACTIVE' ? (
                <DuncitButton color="error" variant="outlined" startIcon={<BlockIcon />} onClick={() => setVoidOpen(true)}>
                  {t('loyalty.physical.voidCta')}
                </DuncitButton>
              ) : undefined
            }
          />
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, lg: 7 }}>
              <CardFactsSection card={detail.card} canRevealPasscode={canWrite} onPasscodeRevealed={() => fireAndForget(refetch(), loyaltyLog, 'PhysicalCardDetailPage', 'historyAfterReveal')} />
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <Stack spacing={2.5}>
                <CoinCreditSection credit={detail.coin_credit} />
                <CardHistorySection events={detail.events} />
              </Stack>
            </Grid>
          </Grid>
          <VoidCardForm
            open={voidOpen}
            busy={voiding.loading}
            errorMessage={voidError}
            onCancel={() => setVoidOpen(false)}
            onSubmit={submitVoid}
          />
        </Stack>
      )}
    </DetailPageState>
  );
}
