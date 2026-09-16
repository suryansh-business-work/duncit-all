import { useState } from 'react';
import { Controller, type Control, type UseFormSetValue } from 'react-hook-form';
import { Box, Chip, FormHelperText, Stack, Typography } from '@mui/material';
import PermMediaIcon from '@mui/icons-material/PermMedia';
import { DuncitButton } from '@duncit/buttons';
import { MB, describeAttachment, useUploadCaps } from '@duncit/media-picker';
import { useTranslation } from '@duncit/app-settings';
import MediaPickerDialog from '../../../components/MediaPickerDialog';
import type { StatusFormValues } from './status.types';

interface Props {
  control: Control<StatusFormValues>;
  setValue: UseFormSetValue<StatusFormValues>;
}

interface PreviewProps {
  url: string;
  isVideo: boolean;
  typeLabel: string;
}

const PREVIEW_SX = {
  width: 96,
  height: 128,
  objectFit: 'cover',
  borderRadius: 1,
  bgcolor: 'action.hover',
} as const;

/** The slide as the rail will show it — portrait, because a status is a story. */
function StatusMediaPreview({ url, isVideo, typeLabel }: Readonly<PreviewProps>) {
  const media = isVideo ? (
    <Box component="video" src={url} controls muted sx={PREVIEW_SX} data-testid="status-media-video" />
  ) : (
    <Box component="img" src={url} alt="" sx={PREVIEW_SX} data-testid="status-media-image" />
  );
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      {media}
      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
        <Chip size="small" label={typeLabel} />
        <Typography variant="caption" sx={{ color: 'text.secondary', wordBreak: 'break-all' }}>
          {url}
        </Typography>
      </Stack>
    </Stack>
  );
}

/**
 * The status itself: one image or one video.
 *
 * It goes through the shared picker rather than the image-only upload field,
 * because a status is as often a short clip as a poster — the dialog applies the
 * admin's size and format caps and compresses a picked video on the way up.
 * The kind is read back off the stored URL, so `media_type` can never disagree
 * with what was actually uploaded.
 */
export default function StatusMediaField({ control, setValue }: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const caps = useUploadCaps('PORTALS');

  return (
    <Controller
      control={control}
      name="media_url"
      render={({ field, fieldState }) => {
        const isVideo = describeAttachment(field.value).kind === 'video';
        const picked = (url: string) => {
          field.onChange(url);
          const kind = describeAttachment(url).kind === 'video' ? 'VIDEO' : 'IMAGE';
          setValue('media_type', kind, { shouldValidate: true, shouldDirty: true });
          setOpen(false);
        };
        return (
          <Stack spacing={1}>
            <Typography variant="subtitle2">{t('marketing.status.media')}</Typography>
            {field.value && (
              <StatusMediaPreview
                url={field.value}
                isVideo={isVideo}
                typeLabel={isVideo ? t('marketing.status.video') : t('marketing.status.image')}
              />
            )}
            <Box>
              <DuncitButton
                variant="outlined"
                startIcon={<PermMediaIcon />}
                onClick={() => setOpen(true)}
                data-testid="status-media-pick"
              >
                {field.value ? t('marketing.status.replaceMedia') : t('marketing.status.chooseMedia')}
              </DuncitButton>
            </Box>
            <FormHelperText error={!!fieldState.error}>
              {fieldState.error?.message ??
                t('marketing.status.mediaHint', {
                  vars: {
                    image: Math.round(caps.maxImageBytes / MB),
                    video: Math.round(caps.maxVideoBytes / MB),
                  },
                })}
            </FormHelperText>
            <MediaPickerDialog
              open={open}
              onClose={() => setOpen(false)}
              onPicked={picked}
              folder="/official-status"
              surface="PORTALS"
              orientation="portrait"
              title={t('marketing.status.mediaPickerTitle')}
            />
          </Stack>
        );
      }}
    />
  );
}
