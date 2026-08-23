import { apply } from "./e.mjs";

apply("portals/ads-portal/src/pages/ads/ad-details/AdSummaryCard.tsx", [
  ["            value={adPositionLabel(ad.position)}", "            value={adPositionLabel(ad.position, t)}"],
]);

apply("portals/ads-portal/src/pages/ads/ad-details/AdMediaCard.tsx", [
  [
    "import { adTypeLabel } from '../ad-options';",
    "import { useTranslation } from '@duncit/shell';\nimport { adTypeLabel } from '../ad-options';",
  ],
  [
    "export default function AdMediaCard({ ad }: Readonly<{ ad: AdRequestDetail }>) {\n  return (",
    "export default function AdMediaCard({ ad }: Readonly<{ ad: AdRequestDetail }>) {\n  const { t } = useTranslation();\n  return (",
  ],
  [
    "            Ad Media\n          </Typography>\n          <Chip size=\"small\" variant=\"outlined\" label={adTypeLabel(ad.ad_type)} />",
    "            {t('adRequest.media.label')}\n          </Typography>\n          <Chip size=\"small\" variant=\"outlined\" label={adTypeLabel(ad.ad_type, t)} />",
  ],
]);
