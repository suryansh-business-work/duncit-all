import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button, Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { ConfirmDialog, notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { brandCommissionSchema, type BrandCommissionFormValues } from './brand-form';
import { SET_BRAND_COMMISSION, SET_ECOMM_BRAND_ACTIVE, type CatalogBrandDetail } from './queries';
import { useTranslation } from '@duncit/shell';

interface Props {
  brand: CatalogBrandDetail;
  onChanged: () => Promise<unknown> | void;
}

const ACTIVATE_MESSAGE =
  'This brand and its products will be visible in the marketplace again. The brand owner is emailed about the change.';
const DEACTIVATE_MESSAGE =
  'This brand and its products will be hidden from the marketplace and the pod product picker. You can reactivate it anytime, and the brand owner is emailed about the change.';

/** Brand-level commercial controls: Duncit's commission cut and marketplace visibility. */
export default function BrandCommercePanel({ brand, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [setCommission, commissionState] = useMutation(SET_BRAND_COMMISSION);
  const [setActive, activeState] = useMutation(SET_ECOMM_BRAND_ACTIVE);

  const { control, handleSubmit, reset } = useForm<BrandCommissionFormValues>({
    defaultValues: { product_commission_pct: String(brand.product_commission_pct) },
    resolver: zodResolver(brandCommissionSchema),
    mode: 'onTouched',
  });

  useEffect(() => {
    reset({ product_commission_pct: String(brand.product_commission_pct) });
  }, [brand.product_commission_pct, reset]);

  const saveCommission = handleSubmit(async (values) => {
    try {
      await setCommission({
        variables: {
          id: brand.id,
          product_commission_pct: Number(values.product_commission_pct),
        },
      });
      notifySuccess('Brand commission updated');
      await onChanged();
    } catch (error) {
      notifyError(parseApiError(error, 'Could not update the commission'));
    }
  });

  const nextActive = !brand.is_active;

  const confirmToggle = async () => {
    try {
      await setActive({ variables: { id: brand.id, active: nextActive } });
      notifySuccess(nextActive ? 'Brand activated' : 'Brand deactivated');
      await onChanged();
    } catch (error) {
      notifyError(parseApiError(error, 'Could not change the brand visibility'));
    }
    setConfirmOpen(false);
  };

  const toggleTitle = nextActive ? 'Activate brand' : 'Deactivate brand';
  const toggleMessage = nextActive ? ACTIVATE_MESSAGE : DEACTIVATE_MESSAGE;
  const toggleLabel = nextActive ? 'Activate' : 'Deactivate';
  const toggleColor = nextActive ? 'success' : 'warning';

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="subtitle1" fontWeight={700}>
            Commercials & visibility
          </Typography>

          <form noValidate onSubmit={saveCommission}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
              <RhfTextField
                control={control}
                name="product_commission_pct"
                label={t('products.brands.commission')}
                size="small"
                sx={{ maxWidth: 220 }}
                hint="Duncit's cut on this brand's product sales. 0 inherits the per-product rate."
              />
              <Button type="submit" variant="outlined" disabled={commissionState.loading}>
                {commissionState.loading ? 'Saving…' : 'Save commission'}
              </Button>
            </Stack>
          </form>

          <Divider />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
              {toggleMessage}
            </Typography>
            <Button color={toggleColor} variant="outlined" onClick={() => setConfirmOpen(true)}>
              {toggleLabel}
            </Button>
          </Stack>
        </Stack>
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        title={toggleTitle}
        message={toggleMessage}
        confirmLabel={toggleLabel}
        confirmColor={toggleColor}
        loading={activeState.loading}
        busyLabel="Working…"
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmToggle}
      />
    </Card>
  );
}
