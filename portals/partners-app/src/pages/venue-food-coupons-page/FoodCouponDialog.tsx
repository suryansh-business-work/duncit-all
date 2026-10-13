import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { FoodCouponForm, foodCouponToValues, toFoodCouponInput, type FoodCouponFormValues } from './food-coupon';
import { CREATE_VENUE_FOOD_COUPON, UPDATE_VENUE_FOOD_COUPON, type FoodCouponRow } from './queries';

interface Props {
  open: boolean;
  /** The venue a new coupon belongs to. An edit never sends it — the server reads the venue off the coupon. */
  venueId: string;
  /** The coupon being edited; null creates a new one. */
  coupon: FoodCouponRow | null;
  onClose: () => void;
  /** The server's copy after the save, and whether it is a new row. */
  onSaved: (coupon: FoodCouponRow, created: boolean) => void;
}

const TITLE_ID = 'food-coupon-dialog-title';

/**
 * Create or edit a food coupon. A refusal — a code this venue already uses, a
 * window that ends before it starts — stays in the dialog above the fields, so
 * the owner fixes it without typing the rest again.
 */
export default function FoodCouponDialog({ open, venueId, coupon, onClose, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const [apiError, setApiError] = useState<string | null>(null);
  const [create, creating] = useMutation(CREATE_VENUE_FOOD_COUPON);
  const [update, updating] = useMutation(UPDATE_VENUE_FOOD_COUPON);
  const busy = creating.loading || updating.loading;

  const close = () => {
    setApiError(null);
    onClose();
  };

  const save = async (input: ReturnType<typeof toFoodCouponInput>) => {
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
          ? t('partners.foodCoupons.updated', { vars: { code: saved.code } })
          : t('partners.foodCoupons.created', { vars: { code: saved.code } }),
      );
      onSaved(saved, coupon === null);
      close();
    } catch (error) {
      setApiError(parseApiError(error));
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : close} fullWidth maxWidth="sm" aria-labelledby={TITLE_ID}>
      <DialogTitle id={TITLE_ID}>
        {coupon
          ? t('partners.foodCoupons.editTitle', { vars: { code: coupon.code } })
          : t('partners.foodCoupons.createTitle')}
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
