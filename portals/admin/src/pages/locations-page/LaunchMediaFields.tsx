import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { LaunchPageMedia, LaunchSection } from '@duncit/utils';
import MediaPickerField from '../../components/MediaPickerField';

interface SectionRow {
  section: LaunchSection;
  /** Written out in full: the translation gate only sees literal keys. */
  labelKey: string;
}

/** The four screens of the waitlist page, in the order the app scrolls them. */
const SECTIONS: readonly SectionRow[] = [
  { section: 'hero', labelKey: 'admin.locations.launchSectionHero' },
  { section: 'host', labelKey: 'admin.locations.launchSectionHost' },
  { section: 'venue', labelKey: 'admin.locations.launchSectionVenue' },
  { section: 'club_admin', labelKey: 'admin.locations.launchSectionClubAdmin' },
];

interface Props {
  value: LaunchPageMedia;
  onChange: (next: LaunchPageMedia) => void;
  /** The media library folder a picked upload lands in. */
  folder: string;
  /** Prefix for the pickers' test ids, so the global dialog and a city's override stay apart. */
  testIdPrefix: string;
}

/**
 * One video and one backup image per screen of the launch waitlist page —
 * the same eight fields whether they are the global set (Launch page media)
 * or a city's own override in its Launch Settings.
 */
export default function LaunchMediaFields({ value, onChange, folder, testIdPrefix }: Readonly<Props>) {
  const { t } = useTranslation();

  const setField = (field: keyof LaunchPageMedia, url: string) => onChange({ ...value, [field]: url });

  return (
    <Stack spacing={2.5}>
      {SECTIONS.map(({ section, labelKey }) => (
        <Box key={section} data-testid={`${testIdPrefix}-${section}`}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {t(labelKey)}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, alignItems: 'start' }}>
            <MediaPickerField
              label={t('admin.locations.launchMediaVideo')}
              value={value[`${section}_video_url`]}
              onChange={(url) => setField(`${section}_video_url`, url)}
              folder={folder}
              accept="video/*"
              showPreview={false}
            />
            <MediaPickerField
              label={t('admin.locations.launchMediaImage')}
              value={value[`${section}_image_url`]}
              onChange={(url) => setField(`${section}_image_url`, url)}
              folder={folder}
              accept="image/*"
              showPreview={false}
            />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
