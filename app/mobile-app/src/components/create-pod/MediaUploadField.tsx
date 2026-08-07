import { useState } from 'react';
import { AppImage } from '@/components/AppImage';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { addToSelection, coverSearchTerm, pickerBatchSize } from '@duncit/utils';

import { FieldLabel } from '@/components/Field';
import { MediaCropDialog } from '@/components/media-crop/MediaCropDialog';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useUploadSettings } from '@/hooks/useUploadSettings';
import { CoverPickerDialog } from './cover-picker';

const VIDEO_URL_RE = /\.(mp4|mov|webm)$/i;

const splitLines = (text: string) =>
  text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

/** Formats + size hint sourced from admin Upload Settings (no hardcoded copy). */
function uploadHint(formats: string[] | undefined, maxImageMb: number | undefined): string {
  if (!formats?.length || !maxImageMb) return 'Crop after selecting';
  const list = formats.map((f) => f.toUpperCase()).join(', ');
  return `${list} · up to ${maxImageMb} MB · crop after selecting`;
}

interface Props {
  value: string;
  onChange: (text: string) => void;
  error?: string;
  label?: string;
  required?: boolean;
  folder?: string;
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
}

/** Pod media — upload from the library into a thumbnail list (URLs serialize
 * into media_text). Upload-only (no raw URL box). Mirrors mWeb's MediaUrlsField. */
export function MediaUploadField({
  value,
  onChange,
  error,
  label = 'Cover image (at least one image)',
  required,
  folder = '/pods',
  subCategoryName,
  maxImages,
}: Readonly<Props>) {
  const { muted, primary } = useThemeColors();
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

  return (
    <YStack gap={8}>
      <FieldLabel label={label} required={required} testID="media" />
      {urls.length > 0 ? (
        <XStack gap={8} flexWrap="wrap">
          {urls.map((url) => (
            <YStack
              key={url}
              testID={`media-thumb-${url}`}
              width={84}
              height={84}
              borderRadius={10}
              overflow="hidden"
              borderWidth={1}
              borderColor="$borderColor"
              backgroundColor="$surface"
              alignItems="center"
              justifyContent="center"
            >
              {VIDEO_URL_RE.test(url) ? (
                <MaterialIcons name="videocam" size={26} color={muted} />
              ) : (
                <AppImage source={{ uri: url }} style={{ width: 84, height: 84 }} />
              )}
              <XStack
                testID={`media-remove-${url}`}
                role="button"
                aria-label="Remove media"
                onPress={() => removeUrl(url)}
                position="absolute"
                top={2}
                right={2}
                width={22}
                height={22}
                alignItems="center"
                justifyContent="center"
                borderRadius={11}
                backgroundColor="rgba(0,0,0,0.55)"
                pressStyle={{ opacity: 0.8 }}
              >
                <MaterialIcons name="close" size={14} color="#ffffff" />
              </XStack>
            </YStack>
          ))}
        </XStack>
      ) : null}
      <YStack
        testID="media-upload-add"
        role="button"
        aria-label="Add media"
        aria-disabled={busy || full}
        onPress={busy || full ? undefined : openPicker}
        alignItems="center"
        justifyContent="center"
        gap={8}
        paddingVertical={24}
        paddingHorizontal={16}
        borderRadius={16}
        borderWidth={2}
        borderColor="$borderColor"
        borderStyle="dashed"
        backgroundColor="$surface"
        opacity={busy ? 0.7 : 1}
        pressStyle={{ opacity: 0.85 }}
      >
        <YStack
          width={52}
          height={52}
          borderRadius={26}
          alignItems="center"
          justifyContent="center"
          backgroundColor="$background"
          borderWidth={1}
          borderColor="$borderColor"
        >
          <MaterialIcons name="add-photo-alternate" size={24} color={primary} />
        </YStack>
        <Text fontSize={14} fontWeight="600" color="$color">
          {full ? 'That is the maximum' : 'Add photos or a video'}
        </Text>
        <Text fontSize={12} color="$muted">
          {full
            ? `Up to ${maxImages} — remove one to add another`
            : uploadHint(settings?.allowed_image_formats, settings?.max_image_mb)}
        </Text>
      </YStack>
      {upload.error && !upload.pending ? (
        <Text testID="media-upload-error" fontSize={12} color="$danger">
          {upload.error}
        </Text>
      ) : null}
      {error ? (
        <Text testID="media_text-error" fontSize={12} color="$danger">
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
        open={pickerOpen && !upload.pending}
        seed={coverSearchTerm(subCategoryName)}
        max={slotsLeft}
        tray={tray}
        busy={busy}
        hint={uploadHint(settings?.allowed_image_formats, settings?.max_image_mb)}
        onPickDevice={() => void upload.pick(slotsLeft - tray.length)}
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
