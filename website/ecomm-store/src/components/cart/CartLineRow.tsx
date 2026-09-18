import { Link as RouterLink } from 'react-router';
import { Alert, Box, Link, Stack, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineRounded';
import { DuncitIconButton } from '@duncit/buttons';

import type { StoreCartLine, StoreLineIssue } from '../../graphql/cart';
import { useCart } from '../../app/providers/CartProvider';
import { useMoney } from '../../lib/money';
import { paths } from '../../lib/paths';
import { useStoreT } from '../../i18n';
import { QuantityStepper } from '../QuantityStepper';
import { StoreImage } from '../StoreImage';

const ISSUE_KEYS: Record<StoreLineIssue, string> = {
  UNAVAILABLE: 'ecommStore.cart.issue.unavailable',
  VARIANT_GONE: 'ecommStore.cart.issue.variantGone',
  OUT_OF_STOCK: 'ecommStore.cart.issue.outOfStock',
  QTY_REDUCED: 'ecommStore.cart.issue.qtyReduced',
};

/** One cart line: what, how many, the line total, and anything stopping its purchase. */
export function CartLineRow({ line }: Readonly<{ line: StoreCartLine }>) {
  const { t } = useStoreT();
  const money = useMoney();
  const { setQty } = useCart();
  const name = line.name || t('ecommStore.cart.unnamed');
  const remove = () => setQty(line.product_id, line.variant_id, 0);
  const canStep = line.issue !== 'UNAVAILABLE' && line.issue !== 'VARIANT_GONE' && line.max_qty > 0;
  return (
    <Stack spacing={1} sx={{ py: 1.5 }}>
      <Stack direction="row" spacing={1.5}>
        <Box sx={{ width: 72, flexShrink: 0 }}>
          <StoreImage src={line.image_url} alt={name} width={72} height={72} sx={{ borderRadius: 1 }} />
        </Box>
        <Stack spacing={0.5} sx={{ flexGrow: 1, minWidth: 0 }}>
          {line.slug ? (
            <Link component={RouterLink} to={paths.product(line.slug)} color="inherit" sx={{ fontWeight: 600 }}>
              {name}
            </Link>
          ) : (
            <Typography sx={{ fontWeight: 600 }}>{name}</Typography>
          )}
          {line.variant_label ? (
            <Typography variant="body2" color="text.secondary">
              {line.variant_label}
            </Typography>
          ) : null}
          <Typography variant="body2" color="text.secondary">
            {t('ecommStore.cart.unitPrice', { vars: { price: money(line.unit_price) } })}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            {canStep ? (
              <QuantityStepper
                value={line.quantity}
                max={line.max_qty}
                itemName={name}
                onChange={(next) => setQty(line.product_id, line.variant_id, next)}
              />
            ) : (
              <Box />
            )}
            <Typography sx={{ fontWeight: 700 }}>{money(line.line_total)}</Typography>
          </Stack>
        </Stack>
        <DuncitIconButton aria-label={t('ecommStore.cart.remove', { vars: { name } })} onClick={remove} sx={{ alignSelf: 'flex-start' }}>
          <DeleteOutlineIcon />
        </DuncitIconButton>
      </Stack>
      {line.issue ? (
        <Alert severity="warning" variant="outlined">
          {t(ISSUE_KEYS[line.issue], { vars: { qty: line.quantity, requested: line.requested_qty } })}
        </Alert>
      ) : null}
    </Stack>
  );
}
