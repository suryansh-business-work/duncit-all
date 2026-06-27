import { Grid, Stack } from '@mui/material';
import { useFormContext, useWatch } from 'react-hook-form';
import AiDescribeButton from './AiDescribeButton';
import ImagesField from './ImagesField';
import type { InventoryProductFormValues } from './types';

interface MediaBrandingSectionProps {
  onError: (msg: string) => void;
}

export default function MediaBrandingSection({ onError }: Readonly<MediaBrandingSectionProps>) {
  const { control, getValues, setValue } = useFormContext<InventoryProductFormValues>();
  const watched = useWatch({ control });
  const images = watched.images ?? [];
  const imageUrl = watched.image_url ?? '';
  // `useWatch` drives re-renders; `getValues()` returns the fully-typed snapshot.
  const values = getValues();

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <ImagesField
          images={images}
          coverUrl={imageUrl}
          onChange={(nextImages, cover) => {
            setValue('images', nextImages, { shouldDirty: true });
            setValue('image_url', cover, { shouldDirty: true });
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <AiDescribeButton
            values={values}
            onApply={(copy) => {
              if (copy.short_description) {
                setValue('short_description', copy.short_description, { shouldDirty: true });
              }
              if (copy.description) {
                setValue('description', copy.description, { shouldDirty: true });
              }
            }}
            onError={onError}
          />
        </Stack>
      </Grid>
    </Grid>
  );
}
