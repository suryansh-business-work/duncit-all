import { useId, useState } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { FormHelperText, MenuItem, Stack, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useImagekitDirectUpload } from '@duncit/media-picker';
import { useTranslation } from '@duncit/shell';
import { FONT_WEIGHTS, type CustomFontFormValues } from './custom-font.types';

interface Props {
  control: Control<CustomFontFormValues>;
  index: number;
  onRemove: () => void;
}

const FONT_FOLDER = '/website/fonts';
const ACCEPT = '.woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf';

/** One font file: its weight and style, uploaded to ImageKit through the portal's own pipeline. */
export default function CustomFontFile({ control, index, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();
  const inputId = useId();
  const { upload } = useImagekitDirectUpload();
  const [percent, setPercent] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'flex-start' } }}>
      <RhfTextField control={control} name={`files.${index}.weight`} select size="small" label={t('websiteApp.cms.fonts.weight')} sx={{ maxWidth: { sm: 120 } }}>
        {FONT_WEIGHTS.map((weight) => (
          <MenuItem key={weight} value={weight}>
            {weight}
          </MenuItem>
        ))}
      </RhfTextField>
      <RhfTextField control={control} name={`files.${index}.style`} select size="small" label={t('websiteApp.cms.fonts.style')} sx={{ maxWidth: { sm: 140 } }}>
        <MenuItem value="normal">{t('websiteApp.cms.fonts.styleNormal')}</MenuItem>
        <MenuItem value="italic">{t('websiteApp.cms.fonts.styleItalic')}</MenuItem>
      </RhfTextField>
      <Controller
        control={control}
        name={`files.${index}.url`}
        render={({ field, fieldState }) => (
          <Stack sx={{ flex: 1, minWidth: 0 }}>
            <input
              id={inputId}
              type="file"
              accept={ACCEPT}
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setFailed(false);
                setPercent(0);
                upload(file, FONT_FOLDER, (p) => setPercent(Math.round(p)))
                  .then((url) => field.onChange(url))
                  .catch(() => setFailed(true))
                  .finally(() => setPercent(null));
              }}
            />
            <DuncitButton component="label" htmlFor={inputId} size="small" variant="outlined" startIcon={<UploadFileIcon />} disabled={percent !== null}>
              {percent === null ? t('websiteApp.cms.fonts.chooseFile') : t('websiteApp.cms.fonts.uploading', { vars: { percent } })}
            </DuncitButton>
            {field.value && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {field.value.split('/').pop()}
              </Typography>
            )}
            {(failed || fieldState.error) && (
              <FormHelperText error>{failed ? t('websiteApp.cms.fonts.uploadFailed') : fieldState.error?.message}</FormHelperText>
            )}
          </Stack>
        )}
      />
      <DuncitIconButton aria-label={t('websiteApp.cms.fonts.removeFile')} onClick={onRemove}>
        <DeleteOutlineIcon fontSize="small" />
      </DuncitIconButton>
    </Stack>
  );
}
