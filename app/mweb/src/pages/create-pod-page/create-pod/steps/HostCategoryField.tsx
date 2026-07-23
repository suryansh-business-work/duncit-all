import { Box, Chip, FormHelperText, Stack, Typography } from '@mui/material';
import { requiredLabel } from '../../../../forms/components/requiredLabel';
import { hostCategoryKeyOf } from '../create-pod.form';
import type { CreatePodForm, CreatePodHostCategory } from '../create-pod.types';

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
      <Typography variant="caption" color="text.secondary" fontWeight={800}>
        {requiredLabel('Your category', true)}
      </Typography>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, mt: 0.75 }}>
        {hostCategories.length > 0 ? (
          hostCategories.map((category) => {
            const key = hostCategoryKeyOf(category);
            const selected = key === selectedKey;
            return (
              <Chip
                key={key}
                label={categoryPath(category)}
                color={selected ? 'primary' : 'default'}
                variant={selected ? 'filled' : 'outlined'}
                onClick={() => pickCategory(key)}
                data-testid={`create-pod-category-${key}`}
                sx={{ fontWeight: 800 }}
              />
            );
          })
        ) : (
          <Chip label="Assigned after host onboarding" variant="outlined" data-testid="create-pod-category-empty" />
        )}
      </Stack>
      {errors.host_category_key && <FormHelperText error>{errors.host_category_key.message}</FormHelperText>}
    </Box>
  );
}
