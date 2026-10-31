import { Controller } from 'react-hook-form';
import { MONEY_EXTRA_FIELDS, anyFieldFailed, moneyExtrasFilled } from '@duncit/utils';

import { FormTextField } from '@/components/FormTextField';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import { MoreOptionsSection } from '../MoreOptionsSection';
import { PlaceChargesField } from '../PlaceChargesField';
import { PodSmartIncentiveCard } from '../PodSmartIncentiveCard';
import { PodTicketDiscountCard } from '../PodTicketDiscountCard';
import { PodProductsField } from '../product-picker';
import type { CreatePodForm, CreatePodProduct } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  products: CreatePodProduct[];
  showProducts: boolean;
  currencySymbol: string;
}

/** Money's optional extras: early-bird prices, Smart Incentive and payment
 * terms (a paid pod only), place charges (a physical pod only) and products.
 * Folded unless one is filled, held open while one fails validation. mWeb twin. */
export function MoneyMoreOptions({ form, products, showProducts, currencySymbol }: Readonly<Props>) {
  const { control, watch, setValue, formState: { errors } } = form;
  const { t } = useTranslation();
  const paid = watch('pod_type') !== 'FREE';
  const isPhysical = watch('pod_mode') === 'PHYSICAL';
  if (!paid && !isPhysical && !showProducts) return null;
  // Read once, not watched: it only decides how the section first opens.
  const filled = moneyExtrasFilled(form.getValues());
  const failed = anyFieldFailed(errors, MONEY_EXTRA_FIELDS);

  return (
    <MoreOptionsSection testID="create-pod-money-more" hint={t('mweb.createPod.moreOptionsMoneyHint')} defaultOpen={filled} forceOpen={failed}>
      {paid ? <PodTicketDiscountCard form={form} currency={currencySymbol} /> : null}
      {/* Renders nothing while Loyalty has the programme switched off. */}
      {paid ? <PodSmartIncentiveCard form={form} currency={currencySymbol} /> : null}
      {/* Payment terms describe refunds and charges a free pod does not have. */}
      {paid ? (
        <SurfaceCard testID="pricing-step-payment-terms-card">
          <FormTextField control={control} name="payment_terms" label={t('mweb.createPod.paymentTerms')} multiline />
        </SurfaceCard>
      ) : null}
      {isPhysical ? (
        <SurfaceCard testID="pricing-step-place-charges-card">
          <Controller
            control={control}
            name="place_charges"
            render={({ field }) => <PlaceChargesField value={field.value} onChange={field.onChange} />}
          />
        </SurfaceCard>
      ) : null}
      {showProducts ? (
        // Attaching IS adding a product, so `products_enabled` follows the row
        // list. `products` arrives already filtered to the club's category.
        <SurfaceCard testID="pricing-step-products-card">
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
        </SurfaceCard>
      ) : null}
    </MoreOptionsSection>
  );
}
