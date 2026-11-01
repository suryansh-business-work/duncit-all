import { Controller } from 'react-hook-form';
import { Box, TextField } from '@mui/material';
import { PodProductsField } from '@duncit/pod-product-picker';
import { MONEY_EXTRA_FIELDS, anyFieldFailed, moneyExtrasFilled } from '@duncit/utils';
import PlaceChargesField from '../fields/PlaceChargesField';
import SmartIncentiveStepField from '../fields/SmartIncentiveStepField';
import TicketDiscountStepField from '../fields/TicketDiscountStepField';
import MoreOptionsSection from '../MoreOptionsSection';
import { useTranslation } from '../../../../i18n/useTranslation';
import { SURFACE_SX } from '../../../../theme';
import type { CreatePodForm, CreatePodProduct } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  products: CreatePodProduct[];
  showProducts: boolean;
}

/** Money's optional extras: early-bird prices, Smart Incentive and payment
 * terms (a paid pod only), place charges (a physical pod only) and products.
 * Folded unless one is filled, held open while one fails validation. */
export default function MoneyMoreOptions({ form, products, showProducts }: Readonly<Props>) {
  const { control, register, watch, setValue, formState: { errors } } = form;
  const { t } = useTranslation();
  const paid = watch('pod_type') !== 'FREE';
  const isPhysical = watch('pod_mode') === 'PHYSICAL';
  if (!paid && !isPhysical && !showProducts) return null;
  // Read once, not watched: it only decides how the section first opens.
  const filled = moneyExtrasFilled(form.getValues());
  const failed = anyFieldFailed(errors, MONEY_EXTRA_FIELDS);

  return (
    <MoreOptionsSection testId="create-pod-money-more" hint={t('mweb.createPod.moreOptionsMoneyHint')} defaultOpen={filled} forceOpen={failed}>
      {paid && <TicketDiscountStepField form={form} />}
      {/* Renders nothing while Loyalty has the programme switched off. */}
      {paid && <SmartIncentiveStepField form={form} />}
      {/* Payment terms describe refunds and charges a free pod does not have. */}
      {paid && (
        <Box sx={{ ...SURFACE_SX, p: 2 }}>
          <TextField
            data-testid="payment_terms"
            label={t('mweb.createPod.paymentTerms')}
            fullWidth
            multiline
            minRows={3}
            helperText={t('mweb.createPod.paymentTermsHint')}
            {...register('payment_terms')}
            slotProps={{ htmlInput: { 'data-testid': 'payment_terms-input' } }}
          />
        </Box>
      )}
      {isPhysical && (
        <Box sx={{ ...SURFACE_SX, p: 2 }}>
          <Controller
            control={control}
            name="place_charges"
            render={({ field }) => (
              <PlaceChargesField value={field.value} onChange={field.onChange} helperText={t('mweb.createPod.placeChargesHint')} />
            )}
          />
        </Box>
      )}
      {showProducts && (
        // Attaching IS adding a product, so `products_enabled` follows the row
        // list. `products` arrives already filtered to the club's category.
        <Box sx={{ ...SURFACE_SX, p: 2 }}>
          <Controller
            control={control}
            name="product_requests"
            render={({ field, fieldState }) => (
              <PodProductsField
                value={field.value}
                onChange={(next) => {
                  field.onChange(next);
                  setValue('products_enabled', next.length > 0);
                }}
                products={products}
                error={fieldState.error?.message}
              />
            )}
          />
        </Box>
      )}
    </MoreOptionsSection>
  );
}
