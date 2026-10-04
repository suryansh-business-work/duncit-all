import { Box, Chip, Stack, Typography, type ChipProps } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { formatMoney } from '@duncit/utils';
import { useDateFormat } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';
import { canCancelReturn, refundCopy, returnStatusKey, returnTone, type ReturnTone } from './podShopReturns';
import type { PodShopReturn } from './podShopReturns.queries';

const TONE_CHIP: Record<ReturnTone, Pick<ChipProps, 'color' | 'variant'>> = {
  active: { color: 'primary', variant: 'outlined' },
  done: { color: 'primary', variant: 'filled' },
  closed: { color: 'default', variant: 'outlined' },
};

interface Props {
  ret: PodShopReturn;
  currencySymbol: string;
  onCancel: (ret: PodShopReturn) => void;
}

/** One return under its order: number + status, what is going back, the
 * pickup, the brand's note and the refund. Native twin:
 * components/orders-history/PodShopReturnCard (rule 27). */
export default function PodShopReturnCard({ ret, currencySymbol, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const money = (amount: number) => formatMoney(amount, { symbol: currencySymbol });
  const refundLines = refundCopy(ret.refund, money, formatDate);

  return (
    <Box
      data-testid={`pod-shop-return-${ret.id}`}
      sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}
    >
      <Stack spacing={0.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }} noWrap>
            {t('mweb.podShopReturns.returnNo', { vars: { returnNo: ret.return_no } })}
          </Typography>
          <Chip
            size="small"
            data-testid={`pod-shop-return-status-${ret.id}`}
            label={t(returnStatusKey(ret.status))}
            {...TONE_CHIP[returnTone(ret.status)]}
          />
        </Stack>
        {ret.items.map((item) => (
          <Typography key={`${item.product_id}-${item.variant_id || 'base'}`} variant="caption" sx={{ color: 'text.secondary' }}>
            {item.name}
            {item.variant_label ? ` — ${item.variant_label}` : ''} × {item.qty}
          </Typography>
        ))}
        {ret.pickup.awb && (
          <Typography variant="caption" data-testid={`pod-shop-return-pickup-${ret.id}`}>
            {t('mweb.podShopReturns.pickupAwb', { vars: { awb: ret.pickup.awb } })}
            {ret.pickup.courier_name ? ` · ${ret.pickup.courier_name}` : ''}
          </Typography>
        )}
        {ret.decision_note && (
          <Typography variant="caption">
            {t('mweb.podShopReturns.decisionNote', { vars: { note: ret.decision_note } })}
          </Typography>
        )}
        {refundLines.map((line, index) => (
          <Typography key={line.key} variant="caption" data-testid={`pod-shop-return-refund-${ret.id}-${index}`}>
            {t(line.key, { vars: line.vars })}
          </Typography>
        ))}
        {canCancelReturn(ret.status) && (
          <DuncitButton
            size="small"
            variant="outlined"
            color="error"
            data-testid={`pod-shop-return-withdraw-${ret.id}`}
            onClick={() => onCancel(ret)}
            sx={{ alignSelf: 'flex-start' }}
          >
            {t('mweb.podShopReturns.cancelReturn')}
          </DuncitButton>
        )}
      </Stack>
    </Box>
  );
}
