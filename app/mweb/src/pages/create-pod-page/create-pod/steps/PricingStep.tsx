import { Controller } from 'react-hook-form';
import { Alert, FormControlLabel, Stack, Switch, TextField } from '@mui/material';
import PlaceChargesField from '../fields/PlaceChargesField';
import ProductRequestsField from '../fields/ProductRequestsField';
import PricePanel, { TicketPriceField, type EarningsPreview } from '../price-panel';
import PodTypeCards from '../PodTypeCards';
import SpotsStepper from '../SpotsStepper';
import TermsAgreement from '../TermsAgreement';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { SpotsBounds } from '@duncit/utils';
import type { CreatePodForm, CreatePodProduct } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  products: CreatePodProduct[];
  showProducts: boolean;
  preview: EarningsPreview;
  /** The range the host may size this pod within (sub-category min → venue capacity). */
  spots: SpotsBounds;
}

/** Step 4 — Free/Paid cards, ticket price, spots stepper, the slot-cost / GST /
 * earnings panel, optional products and the Organizer Terms publish gate. */
export default function PricingStep({ form, products, showProducts, preview, spots }: Readonly<Props>) {
  const { control, register, watch, setValue } = form;
  const { t } = useTranslation();
  const isFree = watch('pod_type') === 'FREE';
  const isPhysical = watch('pod_mode') === 'PHYSICAL';
  const productsEnabled = watch('products_enabled');
  const boundsHint = spots.slidable
    ? t('mweb.createPod.spotsBoundsHint', { vars: { min: spots.min, max: spots.max } })
    : undefined;

  return (
    <Stack spacing={2}>
      <PodTypeCards form={form} />
      <TicketPriceField form={form} preview={preview} isFree={isFree} />
      <Controller
        control={control}
        name="no_of_spots"
        render={({ field, fieldState }) => (
          <SpotsStepper
            value={Number(field.value) || 0}
            onChange={field.onChange}
            error={fieldState.error?.message}
            min={spots.min}
            max={spots.max}
            slidable={spots.slidable}
            boundsHint={boundsHint}
            // Only fixed when the venue leaves no room to choose.
            readOnly={isPhysical && !spots.slidable}
          />
        )}
      />
      <PricePanel preview={preview} />
      <TextField
        label={t('mweb.createPod.paymentTerms')}
        fullWidth
        multiline
        minRows={3}
        helperText={t('mweb.createPod.paymentTermsHint')}
        {...register('payment_terms')}
      />
      {isPhysical && (
        <Controller
          control={control}
          name="place_charges"
          render={({ field }) => (
            <PlaceChargesField
              value={field.value}
              onChange={field.onChange}
              helperText={t('mweb.createPod.placeChargesHint')}
            />
          )}
        />
      )}
      {showProducts && (
        <>
          <Controller
            control={control}
            name="products_enabled"
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={field.value}
                    onChange={(e) => {
                      field.onChange(e.target.checked);
                      if (!e.target.checked) setValue('product_requests', []);
                    }}
                  />
                }
                label={t('mweb.createPod.attachProducts')}
              />
            )}
          />
          {/* `products` arrives already filtered to the pod's club category, so
              empty means "none in this category", not "none at all". */}
          {productsEnabled && products.length === 0 && (
            <Alert severity="info">{t('mweb.createPod.noProductsForCategory')}</Alert>
          )}
          {productsEnabled && (
            <Controller
              control={control}
              name="product_requests"
              render={({ field, fieldState }) => (
                <ProductRequestsField
                  value={field.value}
                  onChange={field.onChange}
                  products={products}
                  error={fieldState.error?.message}
                />
              )}
            />
          )}
        </>
      )}
      <TermsAgreement form={form} />
    </Stack>
  );
}
