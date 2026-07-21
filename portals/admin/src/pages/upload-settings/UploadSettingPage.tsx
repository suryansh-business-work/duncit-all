import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Skeleton, Snackbar, Stack, Typography } from '@mui/material';
import SizesFormatsAccordion from './SizesFormatsAccordion';
import CropPresetsAccordion from './CropPresetsAccordion';
import CompressionAccordion from './CompressionAccordion';
import AiMonitoringAccordion from './AiMonitoringAccordion';
import { UPDATE_UPLOAD_SETTINGS, UPLOAD_SETTINGS, type UploadSettings, type UploadSurface } from './queries';

interface Props {
  surface: UploadSurface;
  title: string;
  subtitle: string;
}

/**
 * Admin > Upload Settings — one page per surface (Portals / Mobile App + mWeb):
 * max upload sizes, allowed formats, image crop resolution presets, sharp/FFmpeg
 * compression and AI image monitoring, all applied by the server upload path.
 */
export default function UploadSettingPage({ surface, title, subtitle }: Readonly<Props>) {
  const { data, loading, error, refetch } = useQuery<{ uploadSettings: UploadSettings }>(
    UPLOAD_SETTINGS,
    { variables: { surface }, fetchPolicy: 'cache-and-network' },
  );
  const [save, saveState] = useMutation(UPDATE_UPLOAD_SETTINGS);
  const [toast, setToast] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);

  const settings = data?.uploadSettings;

  const onSave = async (input: Record<string, unknown>) => {
    setOpError(null);
    try {
      await save({ variables: { surface, input } });
      setToast('Upload settings saved');
      await refetch();
    } catch (saveError: any) {
      setOpError(saveError.message);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      </Box>
      {error && <Alert severity="error">{error.message}</Alert>}
      {opError && <Alert severity="error">{opError}</Alert>}
      {settings ? (
        <Stack spacing={1.5}>
          <SizesFormatsAccordion settings={settings} saving={saveState.loading} onSave={onSave} />
          <CropPresetsAccordion settings={settings} saving={saveState.loading} onSave={onSave} />
          <CompressionAccordion settings={settings} saving={saveState.loading} onSave={onSave} />
          <AiMonitoringAccordion settings={settings} saving={saveState.loading} onSave={onSave} />
        </Stack>
      ) : (
        loading && <Skeleton variant="rounded" height={320} />
      )}
      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Stack>
  );
}
