import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { SURFACE_SX } from '../../theme';
import { STICKY_BAR_SX } from '../../components/cart/stickyBarSx';
import ProductQuantityBar from '../pod-details-page/ProductQuantityBar';

interface Props {
  price: string;
  quantity: number;
  maxQuantity: number;
  onUpdate: (quantity: number) => void;
}

/** The sticky bottom bar of the product page: the price on the left and the
 * add / quantity control on the right, pinned above the bottom nav. */
export default function ProductBuyBar({ price, quantity, maxQuantity, onUpdate }: Readonly<Props>) {
  return (
    <Box
      sx={{
        ...SURFACE_SX,
        ...STICKY_BAR_SX,
        p: 1.25,
        pl: 2,
        boxShadow: (theme) => `0 10px 30px ${alpha(theme.palette.common.black, 0.14)}`,
      }}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, flexShrink: 0 }}>{price}</Typography>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ProductQuantityBar quantity={quantity} maxQuantity={maxQuantity} onUpdate={onUpdate} />
        </Box>
      </Stack>
    </Box>
  );
}
