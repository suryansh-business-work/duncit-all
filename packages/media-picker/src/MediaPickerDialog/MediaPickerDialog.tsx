import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { Alert, Dialog, DialogContent, useMediaQuery } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { addToSelection } from '@duncit/utils';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import SelectionTray from '../SelectionTray';
import { useDeviceUpload } from '../useDeviceUpload';
import { useMediaSelection } from '../useMediaSelection';
import type { MediaPickerDialogProps } from '../types';
import { doneLabel } from './doneLabel';
import type { PickerTab } from './pickerTabs';
import PickerTitle from './PickerTitle';
import PickerPanels from './PickerPanels';
import PickerActions from './PickerActions';

/** A close that does nothing — multi-pick stays open between picks. */
const noop = () => {};

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
  detectDuplicates = false,
}: Readonly<MediaPickerDialogProps>) {
  const { t } = useTranslation();
  const onPhone = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  // Resolved in the body, not as a default parameter: a hook cannot run in
  // the parameter list, and a caller-supplied heading must still win.
  const heading = title ?? t('media.picker.title');
  const headingId = useId();
  const titleRowId = useId();
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
    detectDuplicates,
    setError,
  });

  // A file chosen on the device tab is not on ImageKit yet. There is no second
  // button to press for that: the one action that finishes the pick uploads it
  // on the way out, so "chose a picture but never sent it" stops being a state
  // the reader can leave the dialog in.
  const pendingFile = tab === 'device' && Boolean(device.picked);
  // A PDF is not an image — the button names what the reader actually chose.
  const pendingDocument = pendingFile && device.picked?.type === 'application/pdf';

  const done = async () => {
    const uploaded = pendingFile ? await device.uploadFromDevice() : null;
    // Single-pick is already finished — the upload reported the URL and closed.
    // A failed upload has put its error on screen, and closing over it would
    // throw the file away while looking like it worked.
    if (!multi || (pendingFile && !uploaded)) return;
    onPickedMany?.(uploaded ? addToSelection(selection.urls, uploaded, max) : selection.urls);
    onClose();
  };

  // What the button will hand back, so it can name it. Single-pick never fills
  // the tray, so the same sum reads right in both shapes; the pending file is
  // not in the tray yet, hence the +1.
  const pickCount = selection.urls.length + (pendingFile ? 1 : 0);

  const buttonLabel = doneLabel(t, { count: pickCount, uploading: device.uploading, pendingDocument });

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
      // Named by the heading text alone, not the whole title row with its
      // monitoring chip and Close button in it.
      aria-labelledby={headingId}
    >
      <PickerTitle
        titleRowId={titleRowId}
        headingId={headingId}
        heading={heading}
        uploading={device.uploading}
        onClose={onClose}
      />
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
          <SelectionTray
            urls={selection.urls}
            max={max}
            onRemove={selection.remove}
            deviceOnly={deviceOnly}
          />
        )}

        <PickerPanels
          tab={tab}
          device={device}
          accept={accept}
          allowImage={allowImage}
          allowVideo={allowVideo}
          open={open}
          folder={folder}
          surface={surface}
          seedQuery={seedQuery}
          orientation={orientation}
          multi={multi}
          atLimit={selection.atLimit}
          onPicked={handlePicked}
          onClose={closeAfterPick}
          setError={setError}
        />
      </DialogContent>
      <PickerActions
        showDone={multi || tab === 'device'}
        uploading={device.uploading}
        pickCount={pickCount}
        buttonLabel={buttonLabel}
        onCancel={onClose}
        onDone={done}
      />
    </Dialog>
  );
}
