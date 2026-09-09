import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { EM_DASH } from '@duncit/table';
import { InfoRow, StatCard } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';
import { useTranslation } from '../i18n';
import type { CouponRedemptionRow, CouponRow, CouponStats } from '../queries';

interface Props {
  coupon: CouponRow;
  stats: CouponStats;
  formatDateTime: (value: Date | string) => string;
}

/** A tile row of four, then the rules the code is actually enforced by. */
export default function CouponFacts({ coupon, stats, formatDateTime }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = (value: number) => formatMoney(value, { symbol: stats.currency_symbol });
  const when = (value?: string | null) => (value ? formatDateTime(value) : EM_DASH);

  const cap = coupon.max_uses;
  const usageHint = cap
    ? t('shell.coupons.usesLeft', { vars: { left: stats.remaining_uses ?? 0 } })
    : t('shell.coupons.unlimitedUses');
  // Only a capped coupon has a percentage to fill — an uncapped one would
  // otherwise show a bar that can never move.
  const usagePercent = cap ? Math.min(100, (stats.used_count / cap) * 100) : undefined;

  const scopeValue =
    coupon.scope === 'POD' ? coupon.pod?.pod_title ?? EM_DASH : t('shell.coupons.scopeGlobal');
  const statusValue = coupon.is_active ? t('shell.common.active') : t('shell.common.inactive');
  const validity = `${when(coupon.valid_from)} → ${when(coupon.valid_until)}`;
  const maxUsesValue = cap
    ? `${stats.used_count} ${t('shell.coupons.ofMax', { vars: { max: cap } })}`
    : t('shell.coupons.noLimit');
  const perUserValue = coupon.per_user_limit ?? t('shell.coupons.noLimit');
  const minOrderValue = coupon.min_order_amount
    ? money(coupon.min_order_amount)
    : t('shell.coupons.noMinimum');
  const lastRedeemedValue = stats.last_redeemed_at
    ? formatDateTime(stats.last_redeemed_at)
    : t('shell.coupons.neverRedeemed');

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        }}
      >
        <StatCard label={t('shell.coupons.colDiscount')} value={`${coupon.discount_pct}%`} />
        <StatCard
          label={t('shell.coupons.statRedeemed')}
          value={stats.used_count.toLocaleString()}
          hint={usageHint}
          percent={usagePercent}
        />
        <StatCard
          label={t('shell.coupons.statMembers')}
          value={stats.unique_users.toLocaleString()}
        />
        <StatCard
          label={t('shell.coupons.statDiscountGiven')}
          value={money(stats.total_discount)}
          hint={`${t('shell.coupons.statOrderValue')} ${money(stats.order_value)}`}
        />
      </Box>

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t('shell.coupons.rulesTitle')}
            </Typography>
            <Chip
              size="small"
              label={statusValue}
              color={coupon.is_active ? 'success' : 'default'}
            />
          </Stack>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' },
            }}
          >
            <InfoRow label={t('shell.coupons.scope')} value={scopeValue} />
            <InfoRow label={t('shell.coupons.colValidity')} value={validity} />
            <InfoRow label={t('shell.coupons.maxUses')} value={maxUsesValue} />
            <InfoRow label={t('shell.coupons.perUserLimit')} value={perUserValue} />
            <InfoRow label={t('shell.coupons.minOrder')} value={minOrderValue} />
            <InfoRow label={t('shell.coupons.lastRedeemed')} value={lastRedeemedValue} />
            <InfoRow label={t('shell.common.description')} value={coupon.description || EM_DASH} />
            <InfoRow label={t('shell.common.created')} value={when(coupon.created_at)} />
            <InfoRow label={t('shell.common.updated')} value={when(coupon.updated_at)} />
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}
