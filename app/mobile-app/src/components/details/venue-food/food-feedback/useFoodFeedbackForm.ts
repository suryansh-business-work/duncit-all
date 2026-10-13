import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  foodFeedbackDefaults,
  makeFoodFeedbackSchema,
  type FoodFeedbackValues,
} from '@duncit/forms/schemas';

import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';

/**
 * The order screen's rating form (React Hook Form + the Zod schema mWeb uses,
 * from @duncit/forms). The photos are uploaded as they are picked and only
 * their URLs are held here, so `setValue` goes out with `control`.
 */
export function useFoodFeedbackForm() {
  const { t } = useTranslation();
  const schema = useMemo(() => makeFoodFeedbackSchema(t), [t]);
  const { control, handleSubmit, getValues, setValue } = useForm<FoodFeedbackValues>({
    defaultValues: foodFeedbackDefaults,
    resolver: formResolver<FoodFeedbackValues>(schema),
    mode: 'onTouched',
  });
  return { control, handleSubmit, getValues, setValue };
}
