import { Stack, Typography } from '@mui/material';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useDateFormat } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';
import type { ProductOrder } from '../pod-history-page/productOrders';
import PodShopReturnCard from './PodShopReturnCard';
import { openReturnLines, returnDeadline } from '@duncit/utils';
import type { PodShopReturn } from './podShopReturns.queries';

interface Props {
  order: ProductOrder;
  returns: readonly PodShopReturn[];
  onReturn: (order: ProductOrder) => void;
  onCancelReturn: (ret: PodShopReturn) => void;
}

/** Under an order: "Return items" while anything can still go back (with the
 * deadline), then every return already asked for. Renders nothing when there
 * is neither. Native twin: components/orders-history/OrderReturnsSection. */
export default function OrderReturnsSection({ order, returns, onReturn, onCancelReturn }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const canReturn = openReturnLines(order.returnable).length > 0;
  const deadline = returnDeadline(order.returnable);

  if (!canReturn && returns.length === 0) return null;

  return (
    <Stack spacing={1} data-testid={`order-returns-${order.id}`}>
      {canReturn && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
          <DuncitButton
            size="small"
            variant="outlined"
            startIcon={<AssignmentReturnOutlinedIcon />}
            data-testid={`order-return-items-${order.id}`}
            onClick={() => onReturn(order)}
          >
            {t('mweb.podShopReturns.returnItems')}
          </DuncitButton>
          {deadline && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }} data-testid={`order-return-by-${order.id}`}>
              {t('mweb.podShopReturns.returnBy', { vars: { date: formatDate(deadline) } })}
            </Typography>
          )}
        </Stack>
      )}
      {returns.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            {t('mweb.podShopReturns.sectionTitle')}
          </Typography>
          {returns.map((ret) => (
            <PodShopReturnCard
              key={ret.id}
              ret={ret}
              currencySymbol={order.currency_symbol}
              onCancel={onCancelReturn}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
