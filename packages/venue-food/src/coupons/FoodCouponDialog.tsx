import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError, type FoodOwnerCoupon } from '@duncit/utils';
import { CREATE_VENUE_FOOD_COUPON, UPDATE_VENUE_FOOD_COUPON } from '../documents';
import { FoodCouponForm, foodCouponToValues, toFoodCouponInput, type FoodCouponFormValues, type FoodCouponInput } from './food-coupon';

interface Props {
  open: boolean;
  /** The venue a new coupon belongs to. An edit never sends it — the server reads the venue off the coupon. */
  venueId: string;
  /** The coupon being edited; null creates a new one. */
  coupon: FoodOwnerCoupon | null;
  onClose: () => void;
  /** The server's copy of a coupon just created. */
  onCreated: (coupon: FoodOwnerCoupon) => void;
  /** The server's copy of the coupon just edited. */
  onUpdated: (coupon: FoodOwnerCoupon) => void;
}

const TITLE_ID = 'food-coupon-dialog-title';

/**
 * Create or edit a food coupon. A refusal — a code this venue already uses, a
 * window that ends before it starts — stays in the dialog above the fields, so
 * the owner fixes it without typing the rest again.
 */
export default function FoodCouponDialog({ open, venueId, coupon, onClose, onCreated, onUpdated }: Readonly<Props>) {
  const { t } = useTranslation();
  const [apiError, setApiError] = useState<string | null>(null);
  const [create, creating] = useMutation(CREATE_VENUE_FOOD_COUPON);
  const [update, updating] = useMutation(UPDATE_VENUE_FOOD_COUPON);
  const busy = creating.loading || updating.loading;

  const close = () => {
    setApiError(null);
    onClose();
  };

  const save = async (input: FoodCouponInput) => {
    if (coupon) {
      const res = await update({ variables: { coupon_id: coupon.id, input } });
      return res.data?.updateVenueFoodCoupon;
    }
    const res = await create({ variables: { input: { ...input, venue_id: venueId } } });
    return res.data?.createVenueFoodCoupon;
  };

  const submit = async (values: FoodCouponFormValues) => {
    setApiError(null);
    try {
      const saved = await save(toFoodCouponInput(values));
      if (!saved) return;
      notifySuccess(
        coupon
          ? t('venueFoodOwner.coupons.updated', { vars: { code: saved.code } })
          : t('venueFoodOwner.coupons.created', { vars: { code: saved.code } }),
      );
      if (coupon) onUpdated(saved);
      else onCreated(saved);
      close();
    } catch (error) {
      setApiError(parseApiError(error));
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : close} fullWidth maxWidth="sm" aria-labelledby={TITLE_ID}>
      <DialogTitle id={TITLE_ID}>
        {coupon
          ? t('venueFoodOwner.coupons.editTitle', { vars: { code: coupon.code } })
          : t('venueFoodOwner.coupons.createTitle')}
      </DialogTitle>
      <DialogContent dividers>
        <FoodCouponForm
          key={coupon?.id ?? 'new'}
          defaultValues={foodCouponToValues(coupon)}
          busy={busy}
          apiError={apiError}
          onSubmit={submit}
          onCancel={close}
        />
      </DialogContent>
    </Dialog>
  );
}
