import { useState } from 'react';
import { useFieldArray } from 'react-hook-form';
import { Box, Stack, Typography } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { DuncitButton } from '@duncit/buttons';
import { MediaPickerDialog } from '@duncit/media-picker';
import { useTranslation } from '../../i18n/useTranslation';
import { BannerKitPhotoRow } from './BannerKitPhotoRow';
import type { BannerKitPhotosFieldProps } from './banner-kit.types';

/**
 * One ordered photo list of the kit — added from the media library (device,
 * Pexels), each with its caption, moved up and down, removed; or filled in one
 * click from the photos already on file.
 */
export function BannerKitPhotosField({ control, name, label, hint, max, folder, entityId, suggested = [] }: Readonly<BannerKitPhotosFieldProps>) {
  const { t } = useTranslation();
  const [picking, setPicking] = useState(false);
  const { fields, append, remove, move, replace } = useFieldArray({ control, name });
  const room = max - fields.length;
  const testId = `banner-kit-${name}`;

  const addUrls = (urls: readonly string[]) => {
    append(urls.slice(0, room).map((url) => ({ url, caption: '' })));
    setPicking(false);
  };

  return (
    <Stack spacing={1} data-testid={testId}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" component="h3">
          {label}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('shell.bannerKit.photoCount', { vars: { count: fields.length, max } })}
        </Typography>
      </Stack>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {hint}
      </Typography>
      {fields.length === 0 && (
        <Box sx={{ py: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('shell.bannerKit.noPhotos')}
          </Typography>
        </Box>
      )}
      {fields.map((field, index) => (
        <BannerKitPhotoRow
          key={field.id}
          control={control}
          name={name}
          index={index}
          last={index === fields.length - 1}
          onMove={move}
          onRemove={remove}
        />
      ))}
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <DuncitButton
          size="small"
          variant="outlined"
          startIcon={<AddPhotoAlternateIcon />}
          disabled={room <= 0}
          onClick={() => setPicking(true)}
          data-testid={`${testId}-add`}
        >
          {t('shell.bannerKit.addPhotos')}
        </DuncitButton>
        {suggested.length > 0 && (
          <DuncitButton
            size="small"
            startIcon={<AutoAwesomeIcon />}
            onClick={() => replace(suggested.slice(0, max).map((url) => ({ url, caption: '' })))}
            data-testid={`${testId}-suggested`}
          >
            {t('shell.bannerKit.useSuggested')}
          </DuncitButton>
        )}
      </Stack>
      <MediaPickerDialog
        open={picking}
        onClose={() => setPicking(false)}
        onPicked={(url) => addUrls([url])}
        max={Math.max(room, 1)}
        onPickedMany={addUrls}
        accept="image/*"
        folder={folder}
        entityId={entityId}
        title={label}
      />
    </Stack>
  );
}
