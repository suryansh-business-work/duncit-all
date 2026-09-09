import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { Alert, Box, Skeleton, Stack, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/Edit';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { BackHeader } from '@duncit/ui';
import { useDateFormat } from '@duncit/app-settings';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '../i18n';
import CouponFormDialog from '../CouponFormDialog';
import CouponFacts from './CouponFacts';
import { getRedemptionColumns } from './redemptionColumns';
import {
  COUPON,
  COUPON_PODS,
  COUPON_REDEMPTIONS_TABLE,
  COUPON_STATS,
  DELETE_COUPON,
  type CouponPodOption,
  type CouponRedemptionRow,
  type CouponRow,
  type CouponStats,
} from '../queries';

const getRedemptionRowId = (r: CouponRedemptionRow) => r.id;

/** Everything one discount code is and everything it has done. */
export default function CouponDetailPage() {
  const { t } = useTranslation();
  const { couponId = '' } = useParams();
  const navigate = useNavigate();
  const client = useApolloClient();
  const confirm = useConfirm();
  const { formatDateTime } = useDateFormat();
  const refetchRef = useRef<(() => void) | null>(null);
  const [editing, setEditing] = useState(false);

  const coupon = useQuery<{ coupon: CouponRow | null }>(COUPON, { variables: { id: couponId } });
  const stats = useQuery<{ couponStats: CouponStats }>(COUPON_STATS, {
    variables: { id: couponId },
    fetchPolicy: 'cache-and-network',
  });
  const { data: podsData } = useQuery<{ pods: { id: string; pod_title: string }[] }>(COUPON_PODS, {
    fetchPolicy: 'cache-first',
  });
  const [deleteCoupon] = useMutation<{ deleteCoupon: boolean }>(DELETE_COUPON);

  const pods = useMemo<CouponPodOption[]>(
    () => (podsData?.pods ?? []).map((p) => ({ id: p.id, title: p.pod_title })),
    [podsData]
  );

  const fetchRows = useApolloTableFetch<CouponRedemptionRow>(
    client,
    COUPON_REDEMPTIONS_TABLE,
    'couponRedemptionsTable',
    { extraVariables: { id: couponId } },
    [couponId]
  );

  const symbol = stats.data?.couponStats.currency_symbol ?? '';
  const columns = useMemo(() => getRedemptionColumns(t, symbol), [t, symbol]);
  const goBack = useCallback(() => navigate('/coupons'), [navigate]);

  const row = coupon.data?.coupon;

  const onDelete = async () => {
    if (!row) return;
    const ok = await confirm({
      title: t('shell.coupons.deleteTitle'),
      message: t('shell.coupons.deleteMessage', { vars: { code: row.code } }),
    });
    if (!ok) return;
    try {
      await deleteCoupon({ variables: { id: row.id } });
      notifySuccess(t('shell.coupons.deleted'));
      goBack();
    } catch (e) {
      notifyError(parseApiError(e, t('shell.coupons.deleteFailed')));
    }
  };

  // A deleted coupon is answered before any error is: `coupon` resolves to
  // null while `couponStats` throws NOT_FOUND, and the generic failure copy
  // would otherwise win the race and hide what actually happened.
  if (!coupon.loading && !coupon.error && !row) {
    return (
      <Box sx={{ p: 2 }}>
        <BackHeader title={t('shell.coupons.title')} onBack={goBack} />
        <Alert severity="warning">{t('shell.coupons.notFound')}</Alert>
      </Box>
    );
  }

  const error = coupon.error ?? stats.error;
  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <BackHeader title={t('shell.coupons.title')} onBack={goBack} />
        <Alert severity="error">{parseApiError(error, t('shell.coupons.detailLoadFailed'))}</Alert>
      </Box>
    );
  }

  const summary = stats.data?.couponStats;

  return (
    // Capped and centred, like the short-link detail page: the rules read as a
    // column of facts, and uncapped their labels sit metres from their values.
    <Box sx={{ p: 2, maxWidth: 1400, mx: 'auto' }}>
      <BackHeader
        title={row?.code ?? t('shell.coupons.title')}
        sx={{ mb: 4 }}
        onBack={goBack}
        actions={
          row && (
            <Stack direction="row" spacing={1}>
              <DuncitButton
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => setEditing(true)}
              >
                {t('shell.common.edit')}
              </DuncitButton>
              <DuncitButton
                variant="outlined"
                color="error"
                startIcon={<DeleteOutlineIcon />}
                onClick={() => {
                  onDelete().catch(() => undefined);
                }}
              >
                {t('shell.common.delete')}
              </DuncitButton>
            </Stack>
          )
        }
      />

      {(!row || !summary) && <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 1 }} />}

      {row && summary && (
        <Stack spacing={2}>
          <CouponFacts coupon={row} stats={summary} formatDateTime={formatDateTime} />

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
              {t('shell.coupons.redemptionsTitle')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
              {t('shell.coupons.redemptionsSubtitle')}
            </Typography>
            <DuncitTable<CouponRedemptionRow>
              tableId="coupon-redemptions"
              columns={columns}
              fetchRows={fetchRows}
              getRowId={getRedemptionRowId}
              refetchRef={refetchRef}
              emptyText={t('shell.coupons.redemptionsEmpty')}
              searchPlaceholder={t('shell.coupons.redemptionsSearch')}
              defaultSort={{ field: 'created_at', dir: 'desc' }}
            />
          </Box>

          <CouponFormDialog
            open={editing}
            onClose={() => setEditing(false)}
            onSaved={() => {
              notifySuccess(t('shell.coupons.updated'));
              coupon.refetch().catch(() => undefined);
              stats.refetch().catch(() => undefined);
              refetchRef.current?.();
            }}
            initial={row}
            pods={pods}
          />
        </Stack>
      )}
    </Box>
  );
}
