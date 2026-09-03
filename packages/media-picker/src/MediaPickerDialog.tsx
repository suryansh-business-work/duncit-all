import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from './i18n/useTranslation';
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  useMediaQuery,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { addToSelection } from '@duncit/utils';
import { AiMonitoringChip } from '@duncit/ai-monitoring/mui';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import DeviceUploadTab from './DeviceUploadTab';
import SelectionTray from './SelectionTray';
import PexelsPhotosTab from './PexelsPhotosTab';
import PexelsVideosTab from './PexelsVideosTab';
import { useDeviceUpload } from './useDeviceUpload';
import { useMediaSelection } from './useMediaSelection';
import type { MediaPickerDialogProps } from './types';

/** A close that does nothing — multi-pick stays open between picks. */
const noop = () => {};

/** Comfortable on a laptop, and free to be shorter on a phone. */
const PANEL_MIN_HEIGHT = { xs: 220, sm: 380 };

/** Own query key — this dialog opens over pages that own `selectedtab`. */
const PICKER_TABS = ['device', 'photos', 'videos'] as const;
type PickerTab = (typeof PICKER_TABS)[number];

export default function MediaPickerDialog({
  open,
  onClose,
  onPicked,
  folder = '/uploads',
  title,
  accept = 'image/*,video/*',
  allowDocuments,
  surface = 'PORTALS',
  max = 1,
  onPickedMany,
  seedQuery,
  orientation,
  deviceOnly = false,
}: Readonly<MediaPickerDialogProps>) {
  const { t } = useTranslation();
  const onPhone = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  // Resolved in the body, not as a default parameter: a hook cannot run in
  // the parameter list, and a caller-supplied heading must still win.
  const heading = title ?? t('media.picker.title');
  const [error, setError] = useState<string | null>(null);
  const multi = max > 1;
  const selection = useMediaSelection(max, open);

  // The seam that makes multi-pick cheap: every tab already ends a pick with
  // `onPicked(url); onClose()`. Hand them a close that does nothing and the
  // dialog stays open while the picks pile up in the tray — no tab has to know
  // which mode it is in.
  const handlePicked = multi ? selection.add : onPicked;
  const closeAfterPick = multi ? noop : onClose;

  const allowImage = useMemo(() => /image\//.test(accept) || accept === '*', [accept]);
  const allowVideo = useMemo(() => /video\//.test(accept) || accept === '*', [accept]);
  // Documents are opt-in: an explicit prop wins, otherwise a pdf in the accept
  // list enables them (how every call site drives this today).
  const allowDocs = useMemo(
    () => allowDocuments ?? /pdf/i.test(accept),
    [allowDocuments, accept],
  );

  // Below the allow* flags on purpose — a Pexels tab the caller's `accept` rules
  // out is not offered at all (a reel picker shows no photos tab), and the
  // strip is built from that same data.
  const tabs = useTabParam<PickerTab>({
    items: [
      { value: 'device', label: t('media.picker.fromDevice') },
      ...(!deviceOnly && allowImage ? [{ value: 'photos' as const, label: t('media.picker.pexelsPhotos') }] : []),
      ...(!deviceOnly && allowVideo ? [{ value: 'videos' as const, label: t('media.picker.pexelsVideos') }] : []),
    ],
    fallback: 'device',
    param: 'selectedtab_media',
  });
  const tab = tabs.value;

  const device = useDeviceUpload({
    open,
    folder,
    surface,
    allowImage,
    allowVideo,
    allowDocuments: allowDocs,
    onPicked: handlePicked,
    onClose: closeAfterPick,
    // Multi-pick keeps the dialog open, so the tab has to let go of the file it
    // just sent or the same file could be sent twice.
    clearAfterUpload: multi,
    setError,
  });

  // A file chosen on the device tab is not on ImageKit yet. There is no second
  // button to press for that: the action that finishes the pick uploads it
  // first, so "chose a picture but never sent it" stops being a state the user
  // can leave the dialog in.
  const pendingFile = tab === 'device' && Boolean(device.picked);

  const done = async () => {
    const uploaded = pendingFile ? await device.uploadFromDevice() : null;
    // The upload failed and said so on screen — closing now would throw the
    // file away and look like it worked.
    if (pendingFile && !uploaded) return;
    // Single-pick is already finished: the upload reported the URL and closed.
    if (!multi) return;
    onPickedMany?.(uploaded ? addToSelection(selection.urls, uploaded, max) : selection.urls);
    onClose();
  };

  // The tray is full and the device tab still holds a file — the same dead end
  // the old Upload button showed, kept visible rather than silently dropping
  // that file on the way out.
  const trayFull = multi && pendingFile && selection.atLimit;

  // What the button will hand back, so it can name it. The pending file is not
  // in the tray yet (hence the +1), and the cap still applies.
  const readyCount = Math.min((multi ? selection.urls.length : 0) + (pendingFile ? 1 : 0), max);

  // Named above the return: three answers inside the JSX would be the nested
  // ternary S3358 rejects.
  const pluralLabel = t('media.picker.useTheseCount', { vars: { count: readyCount } });
  const pickLabel = readyCount > 1 ? pluralLabel : t('media.picker.useThis');
  const buttonLabel = device.uploading ? t('media.picker.uploading') : pickLabel;

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={device.uploading ? undefined : onClose}
      fullWidth
      maxWidth="md"
      // Full screen on a phone. A picker is a whole task, not a card over the
      // page, and it is the only layout where the row that finishes the pick
      // cannot end up below the fold.
      fullScreen={onPhone}
    >
      {/* The notice belongs on the title row, not next to the Upload button:
          it has to be readable BEFORE a file is chosen, and this dialog is the
          one screen every picker-driven upload in mWeb and the portals passes
          through. */}
      <DialogTitle sx={{ pr: 6, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {heading}
        <AiMonitoringChip />
        <DuncitIconButton
          onClick={onClose}
          disabled={device.uploading}
          sx={{ position: 'absolute', right: 8, top: 8 }}
          size="small"
        >
          <CloseIcon fontSize="small" />
        </DuncitIconButton>
      </DialogTitle>
      <DuncitTabs {...tabs} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }} />
      {/* Free to SHRINK. A hard minHeight here is a floor on a flex child of the
          dialog's column, so on a short screen the paper grew past the viewport
          and took the actions row — the button that finishes the pick — off the
          bottom of it. The comfortable height lives on the panels, where it only
          lengthens the scroll. */}
      <DialogContent dividers sx={{ minHeight: 0, overscrollBehavior: 'contain' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {multi && (
          <SelectionTray urls={selection.urls} max={max} onRemove={selection.remove} />
        )}

        <Box sx={{ display: tab === 'device' ? 'block' : 'none', minHeight: PANEL_MIN_HEIGHT }}>
          <DeviceUploadTab
            accept={accept}
            fileInputRef={device.fileInputRef}
            picked={device.picked}
            previewUrl={device.previewUrl}
            uploadPct={device.uploadPct}
            uploading={device.uploading}
            stage={device.stage}
            settings={device.settings}
            cropKey={device.cropKey}
            onSelectCropKey={device.setCropKey}
            onCropComplete={device.setCropRect}
            onPickFile={device.onPickFile}
          />
        </Box>

        <Box sx={{ display: tab === 'photos' ? 'block' : 'none', minHeight: PANEL_MIN_HEIGHT }}>
          <PexelsPhotosTab
            active={tab === 'photos' && allowImage}
            open={open}
            folder={folder}
            surface={surface}
            seedQuery={seedQuery}
            defaultOrientation={orientation}
            multi={multi}
            atLimit={selection.atLimit}
            onPicked={handlePicked}
            onClose={closeAfterPick}
            setError={setError}
          />
        </Box>

        <Box sx={{ display: tab === 'videos' ? 'block' : 'none', minHeight: PANEL_MIN_HEIGHT }}>
          <PexelsVideosTab
            active={tab === 'videos' && allowVideo}
            open={open}
            folder={folder}
            surface={surface}
            seedQuery={seedQuery}
            onPicked={handlePicked}
            onClose={closeAfterPick}
            setError={setError}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={device.uploading}>
          Cancel
        </DuncitButton>
        {(multi || tab === 'device') && (
          <DuncitButton
            variant="contained"
            onClick={done}
            disabled={readyCount === 0 || device.uploading || trayFull}
            startIcon={device.uploading ? <CircularProgress size={16} /> : undefined}
          >
            {buttonLabel}
          </DuncitButton>
        )}
      </DialogActions>
    </Dialog>
  );
}
