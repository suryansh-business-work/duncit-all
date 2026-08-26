import { Box } from '@mui/material';
import { useFormContext, useWatch } from 'react-hook-form';
import { AdminCategorySelect, useCategoryValue, type AdminCategoryValue } from '@duncit/category';
import { usePodFormData } from './context';
import type { PodFormValues } from './types';
import { useTranslation } from './i18n/useTranslation';

/**
 * Auto Pod mode's replacement for the club picker: the pod's category, chosen
 * directly and REQUIRED, because an Auto Pod has no club until a club admin
 * claims it — and only hosts approved in this sub-category and clubs carrying
 * it are ever offered the pod.
 *
 * The form holds ids only (`super_category_id`, `sub_category_id`) — the same
 * pair the server stores — so the cascade shows Super and Sub and derives the
 * middle level from the Sub, and the names are hydrated from the category tree
 * on every render. Picking a Super clears the Sub without complaint; only a
 * Sub actually chosen (or a submit) validates the field.
 */
export default function AutoPodCategoryField() {
  const { t } = useTranslation();
  const { config } = usePodFormData();
  const { control, setValue, clearErrors, formState: { errors } } = useFormContext<PodFormValues>();
  const superId = useWatch({ control, name: 'super_category_id' });
  const subId = useWatch({ control, name: 'sub_category_id' });
  const value = useCategoryValue(superId, subId);

  const handleChange = (next: AdminCategoryValue) => {
    setValue('super_category_id', next.super_id, { shouldDirty: true });
    setValue('sub_category_id', next.sub_id, { shouldDirty: true, shouldValidate: !!next.sub_id });
    if (!next.sub_id) clearErrors('sub_category_id');
  };

  const hint = config.lockCategory
    ? t('podForm.autoPod.categoryLocked')
    : t('podForm.autoPod.categoryHint');

  return (
    <Box sx={{ mb: 2 }} data-testid="auto-pod-category">
      <AdminCategorySelect
        value={value}
        onChange={handleChange}
        fields={['super', 'sub']}
        direction="row"
        required
        disabled={!!config.lockCategory}
        legend={t('podForm.autoPod.categoryLegend')}
        hint={hint}
        errors={{ sub: errors.sub_category_id?.message }}
      />
    </Box>
  );
}
