import { useState } from 'react';
import { Box, FormHelperText, IconButton, Stack, Typography } from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import VideocamIcon from '@mui/icons-material/Videocam';
import { coverSearchTerm, pickerBatchSize } from '@duncit/utils';
import MediaPickerDialog from '../../../../components/MediaPickerDialog';
import { requiredLabel } from '../../../../forms/components/requiredLabel';
import { useTranslation } from '../../../../i18n/useTranslation';

const VIDEO_URL_RE = /\.(mp4|mov|webm)$/i;

const splitLines = (text: string) =>
  text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

interface Props {
  value: string;
  onChange: (text: string) => void;
  error?: string;
  label?: string;
  required?: boolean;
  folder?: string;
  /**
   * The sub-category the host already picked. The cover picker opens on a
   * Pexels search for it instead of a blank box — the form knows the answer, so
   * making the user type it is work for nothing.
   */
  subCategoryName?: string | null;
  /**
   * Hard ceiling on the field. Only the COVER sets one — the edit-time media
   * list and the post-pod photo list were never capped, and capping them
   * because the cover is capped would take a feature away.
   */
  maxImages?: number;
}

/** Pod media — a dashed upload dropzone (empty state) that opens the shared
 * MediaPickerDialog (device + Pexels); picked URLs render as a thumbnail strip
 * with an add-more tile. Controlled by media_text (URLs joined by newlines),
 * so create-pod and the host Edit Pod dialog share it (B3-9 dynamic pattern). */
export default function MediaUrlsField({
  value,
  onChange,
  error,
  label,
  required = true,
  folder = '/pods',
  subCategoryName,
  maxImages,
}: Readonly<Props>) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const { t } = useTranslation();
  const fieldLabel = label ?? t('mweb.createPod.coverImageLabel');
  const urls = splitLines(value ?? '');
  const addUrl = (url: string) => onChange([...urls, url].join('\n'));
  const addUrls = (picked: string[]) => {
    const fresh = picked.filter((url) => !urls.includes(url));
    if (fresh.length === 0) return;
    onChange([...urls, ...fresh].join('\n'));
  };
  // How many ONE open may return. Five is a batch size everywhere; it only
  // becomes a ceiling on a field that asked for one.
  const slotsLeft = pickerBatchSize(urls.length, maxImages);
  const full = slotsLeft === 0;
  const removeUrl = (url: string) => onChange(urls.filter((item) => item !== url).join('\n'));
  const openPicker = () => setPickerOpen(true);
  const openOnKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPicker();
    }
  };

  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 700, letterSpacing: '0.06em' }}
      >
        {requiredLabel(fieldLabel, required)}
      </Typography>
      {urls.length === 0 ? (
        <Box
          role="button"
          tabIndex={0}
          aria-label={t('mweb.createPod.uploadImage')}
          onClick={openPicker}
          onKeyDown={openOnKey}
          sx={{
            mt: 1,
            cursor: 'pointer',
            borderRadius: '16px',
            border: '2px dashed',
            borderColor: error ? 'error.main' : 'divider',
            bgcolor: 'action.hover',
            px: 2,
            py: 4,
            display: 'grid',
            placeItems: 'center',
            gap: 1,
            textAlign: 'center',
            transition: 'border-color 160ms ease',
            '&:hover': { borderColor: 'primary.main' },
          }}
        >
          <Box sx={{ width: 56, height: 56, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
            <AddPhotoAlternateOutlinedIcon color="primary" />
          </Box>
          <Typography variant="subtitle2" fontWeight={600}>{t('mweb.createPod.uploadImage')}</Typography>
          <Typography variant="caption" color="text.secondary">{t('mweb.createPod.uploadImageHint')}</Typography>
        </Box>
      ) : (
        <Stack direction="row" sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
          {urls.map((url) => (
            <Box key={url} sx={{ position: 'relative', width: 88, height: 88, borderRadius: '16px', overflow: 'hidden', border: 1, borderColor: 'divider', bgcolor: 'action.hover', display: 'grid', placeItems: 'center' }}>
              {VIDEO_URL_RE.test(url) ? (
                <VideocamIcon color="action" />
              ) : (
                <Box component="img" src={url} alt={t('mweb.createPod.mediaAlt')} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              <IconButton
                size="small"
                aria-label={t('mweb.createPod.removeMedia')}
                onClick={() => removeUrl(url)}
                sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' } }}
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          ))}
          <Box
            role="button"
            tabIndex={0}
            aria-label={t('mweb.createPod.addMedia')}
            onClick={full ? undefined : openPicker}
            onKeyDown={full ? undefined : openOnKey}
            sx={{ cursor: 'pointer', width: 88, height: 88, borderRadius: '16px', border: '2px dashed', borderColor: 'divider', display: 'grid', placeItems: 'center', color: 'text.secondary', '&:hover': { borderColor: 'primary.main', color: 'primary.main' } }}
          >
            <AddIcon />
          </Box>
        </Stack>
      )}
      {error && <FormHelperText error>{error}</FormHelperText>}
      {full && (
        <FormHelperText>
          {t('mweb.createPod.mediaMaxHint', { vars: { max: maxImages ?? 0 } })}
        </FormHelperText>
      )}
      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        folder={folder}
        title={t('mweb.createPod.addPodMedia')}
        // The cover is a wide banner, and a pod is a group activity — so the
        // search opens on landscape photos of people doing this category.
        seedQuery={coverSearchTerm(subCategoryName)}
        orientation="landscape"
        max={slotsLeft}
        onPicked={addUrl}
        onPickedMany={addUrls}
      />
    </Box>
  );
}
