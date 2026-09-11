import { Box, Chip, FormHelperText, Stack, Typography } from '@mui/material';
import { requiredLabel } from '../../../../forms/components/requiredLabel';
import { hostCategoryKeyOf } from '../create-pod.form';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { CreatePodForm, CreatePodHostCategory } from '../create-pod.types';

/** A 36px choice pill — green when picked, the soft fill when not (native's
 * ChipSelectField). `minHeight` pins it against the coarse-pointer 44px rule. */
const CHOICE_CHIP_SX = { height: 36, minHeight: 36, px: 0.75 } as const;

const categoryPath = (category: CreatePodHostCategory) =>
  [category.super_category_name, category.category_name, category.sub_category_name]
    .filter(Boolean)
    .join(' › ');

interface Props {
  form: CreatePodForm;
  hostCategories: CreatePodHostCategory[];
}

/** Step-2 category picker — the host chooses which of their onboarded categories
 * this pod is for. Changing it resets the club/venue/slot picks. */
export default function HostCategoryField({ form, hostCategories }: Readonly<Props>) {
  const {
    setValue,
    watch,
    formState: { errors },
  } = form;
  const { t } = useTranslation();
  const selectedKey = watch('host_category_key');

  const pickCategory = (key: string) => {
    setValue('host_category_key', key, { shouldDirty: true, shouldValidate: true });
    // A club valid for the old category may not match the new one.
    setValue('club_id', '', { shouldDirty: true });
    setValue('venue_id', '', { shouldDirty: true });
    setValue('venue_slot_id', '', { shouldDirty: true });
  };

  return (
    <Box>
      <Typography variant="subtitle2" component="div">
        {requiredLabel(t('mweb.createPod.categoryLabel'), true)}
      </Typography>
      <Typography
        variant="caption"
        data-testid="create-pod-category-hint"
        sx={{
          color: "text.secondary",
          display: "block"
        }}>
        {t('mweb.createPod.categoryHint')}
      </Typography>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mt: 1 }}>
        {hostCategories.length > 0 ? (
          hostCategories.map((category) => {
            const key = hostCategoryKeyOf(category);
            const selected = key === selectedKey;
            return (
              <Chip
                key={key}
                label={categoryPath(category)}
                color={selected ? 'primary' : 'default'}
                variant="filled"
                onClick={() => pickCategory(key)}
                data-testid={`create-pod-category-${key}`}
                sx={CHOICE_CHIP_SX}
              />
            );
          })
        ) : (
          <Chip label={t('mweb.createPod.categoryEmpty')} variant="filled" data-testid="create-pod-category-empty" sx={CHOICE_CHIP_SX} />
        )}
      </Stack>
      {errors.host_category_key && <FormHelperText error>{errors.host_category_key.message}</FormHelperText>}
    </Box>
  );
}
