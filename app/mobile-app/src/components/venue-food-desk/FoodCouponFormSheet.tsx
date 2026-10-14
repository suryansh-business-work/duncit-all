import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Text, YStack } from 'tamagui';
import { FOOD_ORDER_LIMITS, type FoodOwnerCoupon } from '@duncit/utils';
import {
  foodCouponToValues,
  makeFoodCouponSchema,
  toFoodCouponInput,
  type FoodCouponFormValues,
} from '@duncit/forms/schemas';

import { DuncitDialog } from '@/components/DuncitDialog';
import { ConfirmFooter } from '@/components/DuncitDialog/ConfirmFooter';
import { FormTextField } from '@/components/FormTextField';
import { useTranslation } from '@/hooks/useTranslation';
import { saveFoodCoupon } from '@/services/venue-food-owner';
import { toErrorMessage } from '@/utils/errors';
import { formResolver } from '@/utils/form-resolver';
import { FoodCouponActiveField, FoodCouponDateField } from './FoodCouponFields';

interface Props {
  venueId: string;
  /** The coupon being edited, `'new'` for a new one, null when closed. */
  editing: FoodOwnerCoupon | 'new' | null;
  onClose: () => void;
  /** The server's copy after the save, whether it is new, and the line to show. */
  onSaved: (coupon: FoodOwnerCoupon, created: boolean, message: string) => void;
}

function CouponForm({
  venueId,
  coupon,
  onClose,
  onSaved,
}: Readonly<Omit<Props, 'editing'> & { coupon: FoodOwnerCoupon | null }>) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const schema = useMemo(() => makeFoodCouponSchema(t), [t]);
  const { control, handleSubmit } = useForm<FoodCouponFormValues, any, FoodCouponFormValues>({
    resolver: formResolver<FoodCouponFormValues>(schema),
    defaultValues: foodCouponToValues(coupon),
  });

  const submit = handleSubmit(async (values) => {
    setBusy(true);
    setError(null);
    try {
      const saved = await saveFoodCoupon(venueId, coupon?.id ?? null, toFoodCouponInput(values));
      const message = coupon
        ? t('venueFoodOwner.coupons.updated', { vars: { code: saved.code } })
        : t('venueFoodOwner.coupons.created', { vars: { code: saved.code } });
      onSaved(saved, coupon === null, message);
    } catch (e) {
      // A code the venue already uses, a window that ends too soon: kept above the fields, nothing retyped.
      setError(toErrorMessage(e));
    } finally {
      setBusy(false);
    }
  });

  const footer = (
    <ConfirmFooter
      cancelLabel={t('venueFoodOwner.common.cancel')}
      confirmLabel={t('venueFoodOwner.common.save')}
      busy={busy}
      destructive={false}
      cancelTestID="food-coupon-cancel"
      confirmTestID="food-coupon-save"
      onCancel={onClose}
      onConfirm={() => {
        submit().catch((e: unknown) => setError(toErrorMessage(e)));
      }}
    />
  );

  return (
    <DuncitDialog
      open
      onClose={busy ? () => undefined : onClose}
      testID="food-coupon-form"
      title={
        coupon
          ? t('venueFoodOwner.coupons.editTitle', { vars: { code: coupon.code } })
          : t('venueFoodOwner.coupons.createTitle')
      }
      closeLabel={t('venueFoodOwner.common.cancel')}
      dismissOnBackdrop={false}
      showCloseButton={!busy}
      footer={footer}
    >
      <YStack gap={12}>
        {error ? (
          <Text role="alert" testID="food-coupon-error" fontSize={12.5} color="$danger">
            {error}
          </Text>
        ) : null}
        <FormTextField
          control={control}
          name="code"
          label={t('venueFoodOwner.coupons.code')}
          hint={t('venueFoodOwner.coupons.codeHint')}
          autoCapitalize="characters"
          maxLength={FOOD_ORDER_LIMITS.couponCodeMax}
          required
        />
        <FormTextField
          control={control}
          name="description"
          label={t('venueFoodOwner.common.description')}
          hint={t('venueFoodOwner.coupons.descriptionHint')}
          multiline
        />
        <FormTextField
          control={control}
          name="discount_pct"
          label={t('venueFoodOwner.coupons.discountPct')}
          hint={t('venueFoodOwner.coupons.discountHint', {
            vars: { max: FOOD_ORDER_LIMITS.maxDiscountPct },
          })}
          keyboardType="number-pad"
          required
        />
        <FormTextField
          control={control}
          name="min_order_amount"
          label={t('venueFoodOwner.coupons.minOrder')}
          hint={t('venueFoodOwner.coupons.minOrderHint')}
          keyboardType="decimal-pad"
        />
        <FoodCouponDateField
          control={control}
          name="valid_from"
          label={t('venueFoodOwner.coupons.validFrom')}
          hint={t('venueFoodOwner.coupons.validFromHint')}
        />
        <FoodCouponDateField
          control={control}
          name="valid_until"
          label={t('venueFoodOwner.coupons.validUntil')}
          hint={t('venueFoodOwner.coupons.validUntilHint')}
        />
        <FormTextField
          control={control}
          name="max_uses"
          label={t('venueFoodOwner.coupons.maxUses')}
          hint={t('venueFoodOwner.coupons.maxUsesHint')}
          keyboardType="number-pad"
        />
        <FormTextField
          control={control}
          name="per_phone_limit"
          label={t('venueFoodOwner.coupons.perPerson')}
          hint={t('venueFoodOwner.coupons.perPersonHint')}
          keyboardType="number-pad"
        />
        <FoodCouponActiveField control={control} />
      </YStack>
    </DuncitDialog>
  );
}

/**
 * Create or edit one of a venue's food coupons. The rules and both mappers are
 * @duncit/forms' — the web form binds the same ones — so the app refuses
 * exactly what the Partners console does. Keyed on the coupon so each opening
 * starts from its own terms.
 */
export function FoodCouponFormSheet({ editing, ...rest }: Readonly<Props>) {
  if (editing === null) return null;
  const coupon = editing === 'new' ? null : editing;
  return <CouponForm key={coupon?.id ?? 'new'} coupon={coupon} {...rest} />;
}
