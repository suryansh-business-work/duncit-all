import { Box, Divider, Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import FormDialog from '../../../components/FormDialog';
import ProductPicker from '../../../components/ProductPicker';
import RhfDateTimeField from '../../../components/form/RhfDateTimeField';
import RhfNumberField from '../../../components/form/RhfNumberField';
import RhfSwitch from '../../../components/form/RhfSwitch';
import { useSchemaForm } from '../../../components/form/useSchemaForm';
import { TWO_COLUMNS } from '../../../lib/layout';
import type { StoreCoupon } from '../queries';
import { makeCouponSchema, MAX_COUPON_PRODUCTS, toCouponInput, toCouponValues, type CouponValues } from './coupon.types';

interface CouponFormProps {
  initial: StoreCoupon | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: ReturnType<typeof toCouponInput>) => Promise<void>;
}


/** Create or edit a pet-store coupon: its code, its discount, the limits on using it, and the products it is for. */
export default function CouponForm({ initial, busy, onClose, onSubmit }: Readonly<CouponFormProps>) {
  const { t, form } = useSchemaForm<CouponValues>(makeCouponSchema, toCouponValues(initial));
  const { control, handleSubmit } = form;
  const unlimited = t('ecommPortal.coupons.blankUnlimited');
  return (
    <FormDialog
      formId="coupon-form"
      title={initial ? t('ecommPortal.coupons.editTitle') : t('ecommPortal.coupons.newTitle')}
      busy={busy}
      onClose={onClose}
      onSubmit={handleSubmit((values) => onSubmit(toCouponInput(values)))}
      maxWidth="md"
    >
      <Stack spacing={1} data-testid="coupon-form">
        <RhfTextField control={control} name="code" label={t('ecommPortal.coupons.code')} hint={t('ecommPortal.coupons.codeHint')} required />
        <RhfTextField control={control} name="description" label={t('shell.common.description')} />
        <Box sx={TWO_COLUMNS}>
          <RhfNumberField control={control} name="discount_pct" label={t('ecommPortal.coupons.discount')} unit="%" required />
          <RhfNumberField control={control} name="min_order_amount" label={t('ecommPortal.coupons.minOrder')} hint={t('ecommPortal.coupons.blankNoMinimum')} />
          <RhfDateTimeField control={control} name="valid_from" label={t('ecommPortal.coupons.validFrom')} hint={t('ecommPortal.coupons.blankNow')} />
          <RhfDateTimeField control={control} name="valid_until" label={t('ecommPortal.coupons.validUntil')} hint={t('ecommPortal.coupons.blankNoEnd')} />
          <RhfNumberField control={control} name="max_uses" label={t('ecommPortal.coupons.maxUses')} hint={unlimited} whole />
          <RhfNumberField control={control} name="per_user_limit" label={t('ecommPortal.coupons.perUser')} hint={unlimited} whole />
        </Box>
        <RhfSwitch control={control} name="is_active" label={t('shell.common.active')} hint={t('ecommPortal.coupons.activeHint')} />
        <Divider />
        <Typography component="h3" variant="subtitle2">
          {t('ecommPortal.coupons.products')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('ecommPortal.coupons.productsHint')}
        </Typography>
        <Box data-testid="coupon-products">
          <ProductPicker control={control} name="product_ids" max={MAX_COUPON_PRODUCTS} />
        </Box>
      </Stack>
    </FormDialog>
  );
}
