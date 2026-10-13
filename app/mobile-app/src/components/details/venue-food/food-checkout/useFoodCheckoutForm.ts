import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { makeFoodCheckoutSchema, type FoodCheckoutValues } from '@duncit/forms/schemas';

import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';

/**
 * The cart sheet's "Your details" form (React Hook Form + the Zod schema mWeb
 * uses, from @duncit/forms). The sheet's Pay button sits in its pinned footer,
 * outside the fields, so the form state lives here and the sheet hands
 * `control` to <FoodCheckoutForm> and `handleSubmit` to the button.
 */
export function useFoodCheckoutForm(initial: FoodCheckoutValues) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeFoodCheckoutSchema(t), [t]);
  const { control, handleSubmit, getValues, reset, formState } = useForm<FoodCheckoutValues>({
    defaultValues: initial,
    resolver: formResolver<FoodCheckoutValues>(schema),
    mode: 'onTouched',
  });
  const { isDirty } = formState;

  // The account's and the device's details arrive after the first render; they
  // fill the form only while the member has not typed over them.
  useEffect(() => {
    if (!isDirty) reset(initial);
  }, [initial, isDirty, reset]);

  return { control, handleSubmit, getValues };
}
