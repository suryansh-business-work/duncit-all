import { useId, useRef, useState, type ChangeEvent } from 'react';
import { Box, FormHelperText, LinearProgress, Stack, Typography } from '@mui/material';
import AddPhotoIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useImagekitDirectUpload } from '@duncit/media-picker';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import EarnImageGrid from './EarnImageGrid';
import EarnImageUrlInput from './EarnImageUrlInput';
import { EARN_LIMITS } from './earn.types';

const log = logs.portal['website-app'];
const FOLDER = '/website/earn';

interface Props {
  value: string[];
  error?: string;
  onChange: (next: string[]) => void;
}

/** The section's photo wall: upload to ImageKit or paste an https link, up to EARN_LIMITS.images. */
export default function EarnImagesField({ value, error, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const helperId = useId();
  const { upload, uploading } = useImagekitDirectUpload();
  const [progress, setProgress] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const max = EARN_LIMITS.images;
  const full = value.length >= max;

  const uploadAll = async (files: File[]) => {
    const added: string[] = [];
    for (const file of files) {
      setProgress(0);
      added.push(await upload(file, FOLDER, setProgress));
    }
    return added;
  };

  const onPick = async (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = '';
    const images = picked.filter((file) => file.type.startsWith('image/'));
    const room = images.slice(0, max - value.length);
    if (room.length < images.length) setProblem(t('websiteApp.earn.errImagesMax', { vars: { max } }));
    else if (images.length < picked.length) setProblem(t('websiteApp.earn.notImage'));
    else setProblem(null);
    if (room.length === 0) return;
    try {
      onChange([...value, ...(await uploadAll(room))]);
    } catch (err) {
      log.error('EarnSection', 'EarnImagesField', { error: err, msg: 'earn image upload failed' });
      setProblem(t('websiteApp.earn.uploadFailed'));
    }
  };

  const addUrl = (url: string) => {
    setProblem(null);
    onChange([...value, url]);
  };

  const message = problem ?? error;

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2" component="h3">
        {t('websiteApp.earn.images')}
      </Typography>
      <EarnImageGrid images={value} disabled={uploading} onChange={onChange} />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          onPick(event).catch((err) => log.error('EarnSection', 'EarnImagesField', { error: err, msg: 'earn image pick failed' }));
        }}
      />
      <Box>
        <DuncitButton
          variant="outlined"
          startIcon={<AddPhotoIcon />}
          disabled={uploading || full}
          aria-describedby={helperId}
          onClick={() => inputRef.current?.click()}
        >
          {t('websiteApp.earn.upload')}
        </DuncitButton>
      </Box>
      {uploading && (
        <Stack spacing={0.5}>
          <LinearProgress variant="determinate" value={progress} aria-label={t('websiteApp.earn.images')} />
          <Typography variant="caption" role="status">
            {t('websiteApp.earn.uploading', { vars: { pct: progress } })}
          </Typography>
        </Stack>
      )}
      <EarnImageUrlInput disabled={uploading || full} existing={value} onAdd={addUrl} />
      <FormHelperText id={helperId} error={!!message} role={message ? 'alert' : undefined}>
        {message ?? t('websiteApp.earn.imagesHint', { vars: { count: value.length, max } })}
      </FormHelperText>
    </Stack>
  );
}
