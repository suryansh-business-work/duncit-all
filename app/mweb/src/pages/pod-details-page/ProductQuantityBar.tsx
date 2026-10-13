import { Stack, Typography } from '@mui/material';
import { CartControlNoticeChip, CartQuantityControl, useCartControlNotice } from '@duncit/ui';
import { useCartControlLabels } from '../../components/cart/useCartControlLabels';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  /** The product, for the control's accessible names. */
  name: string;
  quantity: number;
  maxQuantity: number;
  onUpdate: (quantity: number) => void;
}

/** The notice sits just above the control instead of over a photo: this bar has none. */
const NOTICE_SX = { top: 'auto', bottom: '100%', left: 'auto', right: 0, transform: 'none', mb: 1 } as const;

/** The product sheet's and the product page's cart control: the same "+" that
 * becomes the remove / count / add pill on every product card, held at the
 * bar's end, with a plain "Out of stock" beside it when there is none to sell.
 * Mount it per cart line (`key`) — a different variant is a different line,
 * not this one's quantity changing. */
export default function ProductQuantityBar({ name, quantity, maxQuantity, onUpdate }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useCartControlLabels()(name);
  const notice = useCartControlNotice(quantity);
  return (
    <Stack
      direction="row"
      spacing={1.5}
      data-testid="product-quantity-bar"
      sx={{ position: 'relative', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}
    >
      <CartControlNoticeChip notice={notice} labels={labels} testId="product-detail-notice" sx={NOTICE_SX} />
      {maxQuantity <= 0 && quantity <= 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid="product-detail-out-of-stock">
          {t('mweb.shop.outOfStock')}
        </Typography>
      )}
      <CartQuantityControl
        quantity={quantity}
        max={maxQuantity}
        labels={labels}
        onChange={onUpdate}
        testIdPrefix="product-detail"
      />
    </Stack>
  );
}
