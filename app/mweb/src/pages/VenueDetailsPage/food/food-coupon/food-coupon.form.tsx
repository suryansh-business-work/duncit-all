import { useEffect, useId, useMemo, useRef } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Chip, Stack, TextField, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/CloseRounded';
import LocalOfferIcon from '@mui/icons-material/LocalOfferOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { FOOD_ORDER_LIMITS, formatFoodMoney } from '@duncit/utils';
import { useTranslation } from '../../../../i18n/useTranslation';
import { foodCouponNoticeText } from '../useFoodCoupon';
import {
  foodCouponDefaults,
  makeFoodCouponSchema,
  type FoodCouponFormProps,
  type FoodCouponValues,
} from './food-coupon.types';

const TONE_COLOR = { error: 'error.main', success: 'success.main', neutral: 'text.secondary' } as const;

interface Message {
  text: string;
  tone: keyof typeof TONE_COLOR;
}

/**
 * The venue's coupon on the cart: a code and Apply (React Hook Form + Zod;
 * Enter applies), or — once the server has accepted one — the code with a
 * remove button. One line under it says what happened: the saving, how much
 * more the cart needs, or why the code was refused. That line is the field's
 * description and a live region, so it is read out as it changes.
 */
export default function FoodCouponForm({ coupon, price, currency, disabled }: Readonly<FoodCouponFormProps>) {
  const { t } = useTranslation();
  const messageId = useId();
  const { applied, notice, checking } = coupon;
  const schema = useMemo(() => makeFoodCouponSchema(t), [t]);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FoodCouponValues, unknown, FoodCouponValues>({
    defaultValues: foodCouponDefaults,
    resolver: zodResolver(schema) as unknown as Resolver<FoodCouponValues, unknown, FoodCouponValues>,
  });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const removeRef = useRef<HTMLButtonElement | null>(null);
  const wasApplied = useRef(Boolean(applied));

  // Applying swaps the field for the code and removing swaps it back; focus
  // follows to whichever control took the place of the one just pressed.
  const isApplied = Boolean(applied);
  useEffect(() => {
    if (wasApplied.current === isApplied) return;
    wasApplied.current = isApplied;
    if (isApplied) reset(foodCouponDefaults);
    (isApplied ? removeRef : inputRef).current?.focus();
  }, [isApplied, reset]);

  const money = (amount: number) => formatFoodMoney(amount, currency);
  const rejected = notice?.kind === 'rejected';

  const message = (): Message | null => {
    if (!applied && errors.code?.message) return { text: errors.code.message, tone: 'error' };
    if (notice && notice.kind !== 'removed') return { text: foodCouponNoticeText(notice, t), tone: 'error' };
    if (applied && price.couponUnmet) {
      const amount = money(applied.min_order_amount - price.subtotal);
      return { text: t('mweb.venueFood.coupon.unmet', { vars: { amount } }), tone: 'neutral' };
    }
    if (applied) {
      const vars = { code: applied.coupon_code, amount: money(price.coupon) };
      return { text: t('mweb.venueFood.coupon.applied', { vars }), tone: 'success' };
    }
    return notice ? { text: foodCouponNoticeText(notice, t), tone: 'neutral' } : null;
  };
  const said = message();

  return (
    <Stack spacing={0.75} data-testid="food-coupon">
      {applied ? (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }} data-testid="food-coupon-applied">
          <Chip
            icon={<LocalOfferIcon />}
            label={applied.coupon_code}
            color={rejected ? 'error' : 'success'}
            variant="outlined"
            sx={{ fontWeight: 700, minWidth: 0 }}
            data-testid="food-coupon-code"
          />
          <DuncitIconButton
            ref={removeRef}
            aria-label={t('mweb.venueFood.coupon.remove', { vars: { code: applied.coupon_code } })}
            aria-describedby={messageId}
            onClick={coupon.remove}
            disabled={disabled}
            data-testid="food-coupon-remove"
          >
            <CloseIcon fontSize="small" />
          </DuncitIconButton>
        </Stack>
      ) : (
        <Stack
          component="form"
          noValidate
          direction="row"
          spacing={1}
          sx={{ alignItems: 'stretch' }}
          onSubmit={handleSubmit(({ code }) => coupon.apply(code))}
          data-testid="food-coupon-form"
        >
          <Controller
            control={control}
            name="code"
            render={({ field: { ref, ...field } }) => (
              <TextField
                {...field}
                inputRef={(node: HTMLInputElement | null) => {
                  ref(node);
                  inputRef.current = node;
                }}
                onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                label={t('mweb.venueFood.coupon.label')}
                placeholder={t('mweb.venueFood.coupon.placeholder')}
                size="small"
                fullWidth
                autoComplete="off"
                disabled={disabled}
                error={Boolean(errors.code) || rejected}
                slotProps={{
                  htmlInput: {
                    maxLength: FOOD_ORDER_LIMITS.couponCodeMax,
                    autoCapitalize: 'characters',
                    'aria-describedby': messageId,
                    'data-testid': 'field-coupon-code',
                  },
                }}
                data-testid="food-coupon-field"
              />
            )}
          />
          <DuncitButton
            type="submit"
            variant="outlined"
            loading={checking}
            disabled={disabled || checking}
            sx={{ flexShrink: 0 }}
            data-testid="food-coupon-apply"
          >
            {checking ? t('mweb.venueFood.coupon.applying') : t('mweb.venueFood.coupon.apply')}
          </DuncitButton>
        </Stack>
      )}
      <Typography
        id={messageId}
        role="status"
        aria-live="polite"
        variant="caption"
        sx={{ color: TONE_COLOR[said?.tone ?? 'neutral'], fontWeight: 600 }}
        data-testid="food-coupon-message"
      >
        {said?.text ?? ''}
      </Typography>
    </Stack>
  );
}
