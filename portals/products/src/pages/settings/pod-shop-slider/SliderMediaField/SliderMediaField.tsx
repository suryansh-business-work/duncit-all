import { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { DuncitButton } from '@duncit/buttons';
import { describeAttachment } from '@duncit/media-picker';
import MediaPickerDialog from '../../../../components/MediaPickerDialog';
import type { SliderMedia } from '../queries';
import { useTranslation } from '@duncit/shell';
import SliderMediaItem from './SliderMediaItem';

interface Props {
  media: SliderMedia[];
  onChange: (media: SliderMedia[]) => void;
}

/** Ordered list of Pod Shop slider media (images + videos). Adds via the shared
 * media picker (device upload / Pexels), classifies each URL by kind, and lets
 * the admin reorder (arrows) and remove. The array order IS the slide order. */
export default function SliderMediaField({ media, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);

  const handlePicked = (url: string) => {
    setPickerOpen(false);
    if (media.some((m) => m.url === url)) return;
    const kind = describeAttachment(url).kind;
    onChange([...media, { url, type: kind === 'video' ? 'VIDEO' : 'IMAGE' }]);
  };

  const remove = (url: string) => onChange(media.filter((m) => m.url !== url));

  const update = (index: number, patch: Partial<SliderMedia>) => {
    const next = [...media];
    const current = next[index];
    if (!current) return;
    next[index] = { ...current, ...patch };
    onChange(next);
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= media.length) return;
    const next = [...media];
    const a = next[index];
    const b = next[target];
    if (!a || !b) return;
    next[index] = b;
    next[target] = a;
    onChange(next);
  };

  return (
    <Box>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1
        }}>
        <Typography component="h2" variant="subtitle2">{t('products.settings.sliderMedia')}</Typography>
        <DuncitButton
          size="small"
          startIcon={<AddPhotoAlternateIcon />}
          onClick={() => setPickerOpen(true)}
        >
          Add media
        </DuncitButton>
      </Stack>
      {media.length === 0 ? (
        <Box
          sx={{
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            p: 3,
            textAlign: 'center',
          }}
        >
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            No slider media yet — add images or videos to show at the top of the Pod Shop.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1}>
          {media.map((item, index) => (
            <SliderMediaItem
              key={item.url}
              item={item}
              index={index}
              total={media.length}
              move={move}
              remove={remove}
              update={update}
            />
          ))}
        </Stack>
      )}
      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        folder="/pod-shop-slider"
        title={t('products.settings.addSliderMedia')}
        onPicked={handlePicked}
      />
    </Box>
  );
}
