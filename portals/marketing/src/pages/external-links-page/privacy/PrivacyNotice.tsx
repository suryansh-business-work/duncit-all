import { Box, Typography } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';

/** One collected field and why it is kept. */
interface CollectedField {
  id: string;
  whatKey: string;
  whyKey: string;
}

/**
 * What a click actually records.
 *
 * Written out in full because a retention window and a consent switch only
 * mean something next to the list of what they apply to — and because this is
 * the text whoever answers a data request has to be able to stand behind.
 */
const COLLECTED: CollectedField[] = [
  {
    id: 'when',
    whatKey: 'marketing.externalLinks.collectedWhen',
    whyKey: 'marketing.externalLinks.collectedWhenWhy',
  },
  {
    id: 'platform',
    whatKey: 'marketing.externalLinks.collectedPlatform',
    whyKey: 'marketing.externalLinks.collectedPlatformWhy',
  },
  {
    id: 'device',
    whatKey: 'marketing.externalLinks.collectedDevice',
    whyKey: 'marketing.externalLinks.collectedDeviceWhy',
  },
  {
    id: 'geo',
    whatKey: 'marketing.externalLinks.collectedGeo',
    whyKey: 'marketing.externalLinks.collectedGeoWhy',
  },
  {
    id: 'ip',
    whatKey: 'marketing.externalLinks.collectedIp',
    whyKey: 'marketing.externalLinks.collectedIpWhy',
  },
];

export default function PrivacyNotice() {
  const { t } = useTranslation();
  return (
    <SectionCard
      title={t('marketing.externalLinks.whatAClickRecords')}
      subtitle={t('marketing.externalLinks.whatAClickRecordsHint')}
    >
      <Box component="dl" sx={{ m: 0, display: 'grid', gap: 1.5 }}>
        {COLLECTED.map((field) => (
          <Box key={field.id}>
            <Typography component="dt" variant="body2" sx={{ fontWeight: 700 }}>
              {t(field.whatKey)}
            </Typography>
            <Typography component="dd" variant="body2" sx={{ m: 0, color: 'text.secondary' }}>
              {t(field.whyKey)}
            </Typography>
          </Box>
        ))}
      </Box>
      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2 }}>
        {t('marketing.externalLinks.legalBasis')}
      </Typography>
    </SectionCard>
  );
}
