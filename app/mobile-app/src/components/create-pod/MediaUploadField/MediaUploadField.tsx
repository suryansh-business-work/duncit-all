import { useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { addToSelection, coverSearchTerm, pickerBatchSize } from '@duncit/utils';

import { AiMonitoringChip } from '@/components/ai-monitoring';
import { FieldLabel } from '@/components/Field';
import { MediaCropDialog } from '@/components/media-crop/MediaCropDialog';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { useUploadSettings } from '@/hooks/useUploadSettings';
import { CoverPickerDialog } from '../cover-picker';

import { fireAndForget } from '@/utils/fire-and-forget';

import { MediaAddTile } from './MediaAddTile';
import { MediaThumbs } from './MediaThumbs';
import { splitLines, uploadHint } from './mediaUploadHelpers';

interface Props {
  value: string;
  onChange: (text: string) => void;
  error?: string;
  label?: string;
  required?: boolean;
  folder?: string;
  /**
   * Offer the device alone — no stock library. Set where the answer has to be
   * a real photograph of something that happened (a pod's own media).
   */
  deviceOnly?: boolean;
  /**
   * The sub-category the host already picked. The picker opens on a Pexels
   * search for it instead of a blank box — the form knows the answer, so making
   * the user type it is work for nothing.
   */
  subCategoryName?: string | null;
  /**
   * Hard ceiling on the field. Only the COVER sets one — the edit-time media
   * list and the post-pod photo list were never capped, and capping them
   * because the cover is capped would take a feature away.
   */
  maxImages?: number;
  /** The picker sheet's heading — a field that is not pod media names itself. */
  pickerTitle?: string;
}

/** Pod media — upload from the library into a thumbnail list (URLs serialize
 * into media_text). Upload-only (no raw URL box). Mirrors mWeb's MediaUrlsField. */
export function MediaUploadField({
  value,
  onChange,
  error,
  label,
  required,
  folder = '/pods',
  subCategoryName,
  maxImages,
  deviceOnly = false,
  pickerTitle,
}: Readonly<Props>) {
  const { muted, primary } = useThemeColors();
  const { t } = useTranslation();
  const fieldLabel = label ?? t('mweb.createPod.coverImageLabel');
  const urls = splitLines(value ?? '');
  const settings = useUploadSettings();
  const [pickerOpen, setPickerOpen] = useState(false);
  // What this visit has gathered, across both tabs. It lives here rather than in
  // the dialog because a device upload lands through the crop sheet, which is a
  // sibling modal — the field is what both paths report to.
  const [tray, setTray] = useState<string[]>([]);
  // How many ONE open may return. Five is a batch size everywhere; it only
  // becomes a ceiling on a field that asked for one.
  const slotsLeft = pickerBatchSize(urls.length, maxImages);
  const addToTray = (url: string) => setTray((current) => addToSelection(current, url, slotsLeft));
  const upload = useMediaUpload(folder, addToTray);
  const removeUrl = (url: string) => onChange(urls.filter((item) => item !== url).join('\n'));
  const busy = upload.uploading;
  const full = slotsLeft === 0;

  const openPicker = () => {
    setTray([]);
    setPickerOpen(true);
  };
  const commit = () => {
    const fresh = tray.filter((url) => !urls.includes(url));
    if (fresh.length > 0) onChange([...urls, ...fresh].join('\n'));
    setTray([]);
    setPickerOpen(false);
  };
  const hint = uploadHint(t, settings?.allowed_image_formats, settings?.max_image_mb);

  return (
    <YStack gap={8}>
      <XStack gap={8} alignItems="center" flexWrap="wrap">
        <FieldLabel label={fieldLabel} required={required} testID="media" />
        <AiMonitoringChip testID="media-ai-monitoring" />
      </XStack>
      {urls.length > 0 ? <MediaThumbs urls={urls} muted={muted} onRemove={removeUrl} /> : null}
      <MediaAddTile
        busy={busy}
        full={full}
        maxImages={maxImages}
        hint={hint}
        primary={primary}
        onOpen={openPicker}
      />
      {upload.error && !upload.pending ? (
        <Text role="alert" testID="media-upload-error" fontSize={12} color="$danger">
          {upload.error}
        </Text>
      ) : null}
      {error ? (
        <Text role="alert" testID="media_text-error" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
      {/*
        Stand the picker down while the crop sheet is up. Both are RN Modals,
        and two of those visible at once is not a stacking order — iOS presents
        one view controller at a time, so the second simply would not appear and
        the phone tab would look dead. The tray lives here, not in the dialog,
        so nothing is lost while it is away; for a batch the picker stays hidden
        until the last asset has been cropped, which is also the calmer thing to
        watch.
      */}
      <CoverPickerDialog
        deviceOnly={deviceOnly}
        title={pickerTitle}
        open={pickerOpen && !upload.pending}
        seed={coverSearchTerm(subCategoryName)}
        max={slotsLeft}
        tray={tray}
        busy={busy}
        hint={hint}
        onPickDevice={() => fireAndForget(upload.pick(slotsLeft - tray.length))}
        onPexelsPicked={addToTray}
        onRemove={(url) => setTray((current) => current.filter((item) => item !== url))}
        onDone={commit}
        onClose={() => setPickerOpen(false)}
      />
      <MediaCropDialog
        media={upload.pending}
        settings={settings}
        uploading={upload.uploading}
        stage={upload.stage}
        progress={upload.progress}
        error={upload.error}
        onConfirm={upload.confirm}
        onCancel={upload.cancel}
      />
    </YStack>
  );
}
