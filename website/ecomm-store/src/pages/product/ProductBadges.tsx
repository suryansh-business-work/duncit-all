import { Stack, Typography } from '@mui/material';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import type { ReactNode } from 'react';

import type { StoreProduct } from '../../graphql/product';
import { useStoreT } from '../../i18n';
import { tintAt } from '../../theme/tokens';

function Badge({ icon, text, position }: Readonly<{ icon: ReactNode; text: string; position: number }>) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', bgcolor: tintAt(position), borderRadius: 999, px: 1.5, py: 0.75 }}>
      {icon}
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {text}
      </Typography>
    </Stack>
  );
}

/** Cash on Delivery and the return window, when they apply. */
export function ProductBadges({ product }: Readonly<{ product: StoreProduct }>) {
  const { t } = useStoreT();
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
      {product.cod_available ? (
        <Badge icon={<PaymentsOutlinedIcon fontSize="small" aria-hidden />} text={t('ecommStore.product.cod')} position={4} />
      ) : null}
      {product.returnable && product.return_window_days > 0 ? (
        <Badge
          icon={<AssignmentReturnOutlinedIcon fontSize="small" aria-hidden />}
          text={t('ecommStore.product.returnable', { vars: { days: product.return_window_days } })}
          position={3}
        />
      ) : null}
      {product.returnable ? null : (
        <Badge icon={<AssignmentReturnOutlinedIcon fontSize="small" aria-hidden />} text={t('ecommStore.product.notReturnable')} position={0} />
      )}
    </Stack>
  );
}
