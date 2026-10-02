import { useState } from 'react';
import { Stack } from '@mui/material';
import {
  MB,
  MediaListRow,
  MediaPickerField,
  croppablePresets,
  formatBytes,
  formatDuration,
  presetAspect,
  suggestPresetKey,
  validateFile,
  type MediaListRowLabels,
  type MediaPickerFieldProps,
  type UploadCropPreset,
} from '@duncit/media-picker';
import { defineDemo, defineDemos } from '../types';

interface CropMock {
  /** The image the user just chose. */
  image_width: number;
  image_height: number;
  bytes: number;
  video_seconds: number;
  /** Admin > Upload Settings for this surface. */
  presets: UploadCropPreset[];
}

export default defineDemos('media-picker', [
  defineDemo<CropMock>({
    id: 'crop',
    title: 'Which crop the picker offers first',
    note:
      'Make the image 1080×1920 and the suggestion moves to the portrait preset — the picker opens on the crop whose aspect is closest to what was actually chosen.',
    mock: {
      image_width: 1600,
      image_height: 900,
      bytes: 2_411_724,
      video_seconds: 94,
      presets: [
        { key: 'none', label: 'No crop', width: 0, height: 0, enabled: true },
        { key: 'square', label: 'Square', width: 1080, height: 1080, enabled: true },
        { key: 'landscape', label: 'Landscape', width: 1600, height: 900, enabled: true },
        { key: 'portrait', label: 'Portrait', width: 1080, height: 1920, enabled: true },
        { key: 'banner', label: 'Banner', width: 1920, height: 480, enabled: false },
      ],
    },
    compute: (mock) => {
      const croppable = croppablePresets(mock.presets);
      return {
        'Crops this surface offers': croppable.map((preset) => preset.label),
        'Disabled by the admin': mock.presets
          .filter((preset) => !preset.enabled)
          .map((preset) => preset.label),
        'Opens on': suggestPresetKey(mock.image_width, mock.image_height, mock.presets),
        'Source aspect': (mock.image_width / mock.image_height).toFixed(3),
        'Preset aspects': Object.fromEntries(
          croppable.map((preset) => [preset.label, presetAspect(preset)])
        ),
        'File size shown as': formatBytes(mock.bytes),
        'Video length shown as': formatDuration(mock.video_seconds),
      };
    },
  }),
  defineDemo<CapsMock>({
    id: 'caps',
    title: "What the admin's caps refuse",
    note:
      'Drop max_image_mb to 2 and the 3 MB pod cover is refused — the same sentence the user sees, from the same call the picker makes. Note the video: it is judged by max_video_mb, never by the image cap, which is the bug this replaced (one number for all three kinds).',
    mock: {
      max_image_mb: 8,
      max_video_mb: 60,
      allowed_image_formats: ['jpg', 'png', 'webp'],
      allowed_video_formats: ['mp4', 'mov'],
    },
    compute: (mock) => {
      const caps = {
        maxImageMb: mock.max_image_mb,
        maxVideoMb: mock.max_video_mb,
        allowedImageFormats: mock.allowed_image_formats,
        allowedVideoFormats: mock.allowed_video_formats,
      };
      const anything = { allowImage: true, allowVideo: true, allowDocuments: true };
      const file = (name: string, type: string, mb: number) =>
        ({ name, type, size: mb * MB }) as File;
      return {
        'Image caps at': `${mock.max_image_mb} MB`,
        'Video caps at': `${mock.max_video_mb} MB`,
        'pod-cover.jpg (3 MB)': validateFile(file('pod-cover.jpg', 'image/jpeg', 3), anything, caps) ?? 'accepted',
        'pod-reel.mp4 (45 MB)': validateFile(file('pod-reel.mp4', 'video/mp4', 45), anything, caps) ?? 'accepted',
        'venue-photo.heic (1 MB)': validateFile(file('venue-photo.heic', 'image/heic', 1), anything, caps) ?? 'accepted',
        'gst-certificate.pdf (4 MB)': validateFile(file('gst-certificate.pdf', 'application/pdf', 4), anything, caps) ?? 'accepted',
      };
    },
  }),
  defineDemo<RowsMock>({
    id: 'list-row',
    title: 'One row of a media list, named by the form that renders it',
    note:
      "Delete labels and the four controls fall back to the shared media.* copy — that is what MediaListField renders. The club and pod forms pass their own (clubForm.mediaRow.*, podForm.mediaRow.*) so the translations entered for those keys keep applying. Note the reel: a row tells a video from a picture by its URL alone, and the arrows are disabled at the two ends, so the list that owns the rows needs no bounds check.",
    mock: {
      urls: [
        'https://ik.imagekit.io/duncit/pods/DUN-POD-4821/cover.jpg',
        'https://ik.imagekit.io/duncit/pods/DUN-POD-4821/court-2.jpg',
        'https://ik.imagekit.io/duncit/pods/DUN-POD-4821/reel.mp4',
      ],
      replacement_url: 'https://ik.imagekit.io/duncit/pods/DUN-POD-4821/court-2-resurfaced.jpg',
      labels: { replace: 'Replace', moveUp: 'Move up', moveDown: 'Move down', remove: 'Remove' },
    },
    render: (mock) => <RowsStage key={mock.urls.join('|')} mock={mock} />,
  }),
  defineDemo<FieldMock>({
    id: 'picker-field',
    title: 'A URL field with the picker behind it',
    note:
      "Every word around the field comes in through labels: the admin, marketing and onboarding portals each bind this one implementation to their own keys (admin.pickers.*, marketing.mediaPickerField.*, onboarding.mediaPickerField.*). Set buttonOnly to true and the text field goes away — the same picker behind a single button. Narrow accept to 'image/*' and the dialog stops offering videos.",
    mock: {
      label: 'Campaign banner',
      value: 'https://ik.imagekit.io/duncit/marketing/diwali-banner.jpg',
      folder: '/marketing',
      helperText: 'Shown at the top of the notification.',
      buttonOnly: false,
      showPreview: true,
      accept: 'image/*',
      labels: {
        placeholder: 'Click the image icon to upload, or paste a URL…',
        pick: 'Pick from device or Pexels',
        open: 'Open',
      },
    },
    render: (mock) => <FieldStage key={mock.value} mock={mock} />,
  }),
]);

interface RowsMock {
  /** The list as the form holds it — one URL per row. */
  urls: string[];
  /** What the Replace control swaps a row for (the picker's answer, in a real form). */
  replacement_url: string;
  /** The host form's own wording. Remove it for the shared `media.*` copy. */
  labels?: MediaListRowLabels;
}

/** Hoisted: a component defined inside `render` remounts on every keystroke. */
function RowsStage({ mock }: Readonly<{ mock: RowsMock }>) {
  const [urls, setUrls] = useState(mock.urls);
  const swap = (from: number, to: number) => {
    const next = [...urls];
    [next[from], next[to]] = [next[to], next[from]];
    setUrls(next);
  };
  return (
    <Stack spacing={1}>
      {urls.map((url, position) => (
        <MediaListRow
          key={url}
          url={url}
          index={position}
          total={urls.length}
          onReplace={() => setUrls(urls.map((u) => (u === url ? mock.replacement_url : u)))}
          onMove={(dir) => swap(position, position + dir)}
          onRemove={() => setUrls(urls.filter((u) => u !== url))}
          labels={mock.labels}
        />
      ))}
    </Stack>
  );
}

/** The field's own props, minus the value the stage holds. */
type FieldMock = Omit<MediaPickerFieldProps, 'onChange'>;

function FieldStage({ mock }: Readonly<{ mock: FieldMock }>) {
  const [value, setValue] = useState(mock.value);
  return <MediaPickerField {...mock} value={value} onChange={setValue} />;
}

interface CapsMock {
  max_image_mb: number;
  max_video_mb: number;
  allowed_image_formats: string[];
  allowed_video_formats: string[];
}
