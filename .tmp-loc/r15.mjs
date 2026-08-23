import { apply } from "./e.mjs";

apply("packages/media-picker/src/media-list-field/MediaListRow.tsx", [
  [
    "  onRemove,\n}: Readonly<Props>) {\n  return (",
    "  onRemove,\n}: Readonly<Props>) {\n  const { t } = useTranslation();\n  return (",
  ],
]);

// ---- MediaListField: default button label + empty state
apply("packages/media-picker/src/media-list-field/MediaListField.tsx", [
  [
    "import MediaPickerDialog from '../MediaPickerDialog';\nimport MediaListRow from './MediaListRow';",
    "import { useTranslation } from '../i18n/useTranslation';\nimport MediaPickerDialog from '../MediaPickerDialog';\nimport MediaListRow from './MediaListRow';",
  ],
  [
    "  helperText?: string;\n  buttonLabel?: string;",
    "  helperText?: string;\n  /** Defaults to the shared `Add image` copy in the reader's language. */\n  buttonLabel?: string;",
  ],
  [
    "  buttonLabel = 'Add image',\n}: Readonly<Props>) {\n  const items = value",
    "  buttonLabel,\n}: Readonly<Props>) {\n  const { t } = useTranslation();\n  const addLabel = buttonLabel ?? t('media.list.addImage');\n  const items = value",
  ],
  [
    "            {buttonLabel}\n          </Button>",
    "            {addLabel}\n          </Button>",
  ],
  [
    "            No images yet. Click <b>Add image</b> to upload or pick from Pexels.",
    "            {t('media.list.empty', { vars: { action: addLabel } })}",
  ],
]);
