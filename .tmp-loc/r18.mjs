import { apply } from "./e.mjs";

apply("packages/i18n/src/bundles/pod-form.ts", [
  [
    "    hostsField: {",
    "    /** The free-text chip editor (hashtags, perks). */\n    chipArrayField: {\n      placeholder: 'Type and press Enter',\n    },\n    /** The read-only map beside the venue address. */\n    mapPreview: {\n      title: 'Map preview',\n      openMap: 'Open Map',\n      keyMissing: 'Add VITE_GOOGLE_MAP_API to preview the map here.',\n    },\n    hostsField: {",
  ],
]);

apply("packages/pod-form/src/components/ChipArrayField.tsx", [
  [
    "import { Box, Chip, Stack, TextField, Typography } from '@mui/material';",
    "import { Box, Chip, Stack, TextField, Typography } from '@mui/material';\nimport { useTranslation } from '../i18n/useTranslation';",
  ],
  [
    "  helperText?: string;\n  placeholder?: string;",
    "  helperText?: string;\n  /** Defaults to the shared `Type and press Enter` copy, translated. */\n  placeholder?: string;",
  ],
  [
    "  placeholder = 'Type and press Enter',\n  max = 20,\n  error,\n}: Readonly<Props>) {\n  const [draft, setDraft] = useState('');",
    "  placeholder,\n  max = 20,\n  error,\n}: Readonly<Props>) {\n  const { t } = useTranslation();\n  const [draft, setDraft] = useState('');",
  ],
]);

apply("packages/pod-form/src/components/GoogleMapPreview.tsx", [
  [
    "import OpenInNewIcon from '@mui/icons-material/OpenInNew';",
    "import OpenInNewIcon from '@mui/icons-material/OpenInNew';\nimport { useTranslation } from '../i18n/useTranslation';",
  ],
  [
    "export default function GoogleMapPreview({ title = 'Map preview', parts, lat, lng }: Readonly<Props>) {\n  const apiKey = import.meta.env.VITE_GOOGLE_MAP_API as string | undefined;",
    "export default function GoogleMapPreview({ title, parts, lat, lng }: Readonly<Props>) {\n  const { t } = useTranslation();\n  const heading = title ?? t('podForm.mapPreview.title');\n  const apiKey = import.meta.env.VITE_GOOGLE_MAP_API as string | undefined;",
  ],
  [
    "        <Typography variant=\"subtitle2\">{title}</Typography>",
    "        <Typography variant=\"subtitle2\">{heading}</Typography>",
  ],
  [
    "          Open Map\n        </Button>",
    "          {t('podForm.mapPreview.openMap')}\n        </Button>",
  ],
  [
    "          component=\"iframe\"\n          title={title}",
    "          component=\"iframe\"\n          title={heading}",
  ],
  [
    "        <Typography variant=\"body2\" color=\"text.secondary\">\n          Add VITE_GOOGLE_MAP_API to preview the map here.\n        </Typography>",
    "        <Typography variant=\"body2\" color=\"text.secondary\">\n          {t('podForm.mapPreview.keyMissing')}\n        </Typography>",
  ],
]);
