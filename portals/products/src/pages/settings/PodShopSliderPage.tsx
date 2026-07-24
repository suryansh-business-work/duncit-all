import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Box, Button, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import SliderMediaField from './pod-shop-slider/SliderMediaField';
import {
  POD_SHOP_SLIDER,
  UPDATE_POD_SHOP_SLIDER,
  type SliderMedia,
} from './pod-shop-slider/queries';

/** Settings › Pod Shop Slider. Curates the global image/video slider shown at
 * the top of the platform-wide Pod Shop on the mobile app and mWeb. */
export default function PodShopSliderPage() {
  const { data, loading } = useQuery(POD_SHOP_SLIDER, {
    fetchPolicy: 'cache-and-network',
  });
  const [save, { loading: saving }] = useMutation(UPDATE_POD_SHOP_SLIDER);
  const [media, setMedia] = useState<SliderMedia[]>([]);

  useEffect(() => {
    const items = data?.branding?.pod_shop_slider as SliderMedia[] | undefined;
    if (items) setMedia(items.map((m) => ({ url: m.url, type: m.type })));
  }, [data]);

  const onSave = async () => {
    try {
      await save({
        variables: {
          input: media.map((m, order) => ({ url: m.url, type: m.type, order })),
        },
      });
      notifySuccess('Pod Shop slider updated');
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Could not save the slider');
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={700}>
          Pod Shop Slider
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage the image/video slider shown at the top of the Pod Shop on the app and mWeb. The
          top item shows first — reorder with the arrows.
        </Typography>
      </Box>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          {loading && !data ? (
            <Stack alignItems="center" sx={{ p: 4 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <Stack spacing={2}>
              <SliderMediaField media={media} onChange={setMedia} />
              <Box>
                <Button variant="contained" onClick={onSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save slider'}
                </Button>
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
