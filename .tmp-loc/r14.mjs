import { apply } from "./e.mjs";

// ---- media bundle: the list field's own copy
apply("packages/i18n/src/bundles/media.ts", [
  [
    "    crop: {",
    "    /** The multi-image list field — a row per URL, reorderable. */\n    list: {\n      addImage: 'Add image',\n      empty: 'No images yet. Click {action} to upload or pick from Pexels.',\n      replace: 'Replace',\n      moveUp: 'Move up',\n      moveDown: 'Move down',\n      noVideoFile: 'This video has no downloadable mp4',\n    },\n    crop: {",
  ],
]);

// ---- MediaListRow
apply("packages/media-picker/src/media-list-field/MediaListRow.tsx", [
  [
    "import ImageIcon from '@mui/icons-material/Image';\n",
    "import ImageIcon from '@mui/icons-material/Image';\nimport { useTranslation } from '../i18n/useTranslation';\n",
  ],
  [
    "export default function MediaListRow({\n  url,\n  index,",
    "export default function MediaListRow({\n  url,\n  index,",
  ],
  ['      <Tooltip title="Replace">', "      <Tooltip title={t('media.list.replace')}>"],
  ['      <Tooltip title="Move up">', "      <Tooltip title={t('media.list.moveUp')}>"],
  ['      <Tooltip title="Move down">', "      <Tooltip title={t('media.list.moveDown')}>"],
  ['      <Tooltip title="Remove">', "      <Tooltip title={t('media.picker.remove')}>"],
]);

// ---- PexelsVideosTab
apply("packages/media-picker/src/PexelsVideosTab.tsx", [
  [
    "      setError('This video has no downloadable mp4');",
    "      setError(t('media.list.noVideoFile'));",
  ],
]);

// ---- AvatarVariant aria-label
apply("packages/media-picker/src/single-image/AvatarVariant.tsx", [
  ['                  aria-label="remove image"', "                  aria-label={t('media.picker.removeImage')}"],
]);
