import { apply } from "./e.mjs";

apply("packages/location/src/MapEmbedCard.tsx", [
  [
    "import { buildMapQuery, mapEmbedUrl, mapSearchUrl, type MapQueryPart } from './mapEmbed';",
    "import { useTranslation } from './i18n/useTranslation';\nimport { buildMapQuery, mapEmbedUrl, mapSearchUrl, type MapQueryPart } from './mapEmbed';",
  ],
  [
    "  /** iframe title (accessibility). Also the default heading text. */\n  title?: string;",
    "  /** iframe title (accessibility). Also the default heading text. Defaults to\n   * the shared `Map preview` copy in the reader's language. */\n  title?: string;",
  ],
  [
    '  /** "Open in Maps" (default) / "Open Map" etc. */\n  buttonLabel?: ReactNode;',
    '  /** "Open in Maps" (the default, translated) / "Open Map" etc. */\n  buttonLabel?: ReactNode;',
  ],
  [
    "const DEFAULT_MISSING_KEY_FALLBACK = (\n  <Typography variant=\"body2\" color=\"text.secondary\">\n    Add VITE_GOOGLE_MAP_API to preview the map here.\n  </Typography>\n);",
    "/** What stands in for the map when the embed key is required but absent. */\nfunction MissingKeyNotice() {\n  const { t } = useTranslation();\n  return (\n    <Typography variant=\"body2\" color=\"text.secondary\">\n      {t('location.map.keyMissing')}\n    </Typography>\n  );\n}",
  ],
  [
    "export function MapEmbedCard({\n  title = 'Map preview',\n  parts = [],",
    "export function MapEmbedCard({\n  title,\n  parts = [],",
  ],
  [
    "  buttonLabel = 'Open in Maps',\n  iconPosition = 'end',",
    "  buttonLabel,\n  iconPosition = 'end',",
  ],
  [
    "  missingKeyFallback = DEFAULT_MISSING_KEY_FALLBACK,\n  allowFullScreen = true,",
    "  missingKeyFallback,\n  allowFullScreen = true,",
  ],
  [
    "}: Readonly<MapEmbedCardProps>) {\n  const resolvedQuery = query ?? buildMapQuery(parts, lat, lng);",
    "}: Readonly<MapEmbedCardProps>) {\n  const { t } = useTranslation();\n  const frameTitle = title ?? t('location.map.title');\n  const resolvedQuery = query ?? buildMapQuery(parts, lat, lng);",
  ],
  [
    "  const headingNode = heading ?? title;",
    "  const headingNode = heading ?? frameTitle;",
  ],
  [
    "          {buttonLabel}\n        </Button>",
    "          {buttonLabel ?? t('location.map.openInMaps')}\n        </Button>",
  ],
  [
    "          component=\"iframe\"\n          title={title}",
    "          component=\"iframe\"\n          title={frameTitle}",
  ],
  [
    "      ) : (\n        missingKeyFallback\n      )}",
    "      ) : (\n        (missingKeyFallback ?? <MissingKeyNotice />)\n      )}",
  ],
]);

apply("packages/location/src/AdminLocationSelect.tsx", [
  [
    "  country: 'Country',\n  state: 'State',\n  city: 'City',\n  locality: 'Locality',",
    "  country: 'location.select.country',\n  state: 'location.select.state',\n  city: 'location.select.city',\n  locality: 'location.select.locality',",
  ],
  [
    "          label={labels?.[level] ?? DEFAULT_LABELS[level]}",
    "          label={labels?.[level] ?? t(DEFAULT_LABEL_KEYS[level])}",
  ],
]);
