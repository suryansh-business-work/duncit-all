import { Grid, Stack } from '@mui/material';
import { useFormikContext } from 'formik';
import AiDescribeButton from './AiDescribeButton';
import ImagesField from './ImagesField';
import type { InventoryProductFormValues } from './types';

interface MediaBrandingSectionProps {
  onError: (msg: string) => void;
}

export default function MediaBrandingSection({ onError }: Readonly<MediaBrandingSectionProps>) {
  const f = useFormikContext<InventoryProductFormValues>();
  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <ImagesField
          images={f.values.images}
          coverUrl={f.values.image_url}
          onChange={(images, cover) => {
            f.setFieldValue('images', images);
            f.setFieldValue('image_url', cover);
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <AiDescribeButton
            values={f.values}
            onApply={(copy) => {
              if (copy.short_description) f.setFieldValue('short_description', copy.short_description);
              if (copy.description) f.setFieldValue('description', copy.description);
            }}
            onError={onError}
          />
        </Stack>
      </Grid>
    </Grid>
  );
}
