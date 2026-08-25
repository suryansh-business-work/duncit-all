import { Box, IconButton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslation } from '@duncit/shell';

interface Props {
  /** Empty until `myVenues` answers, so the name renders as a placeholder. */
  venueName?: string;
  onBack: () => void;
}

/** Which venue's calendar this is, and the way back to the venue list. */
export default function AvailabilityHeader({ venueName, onBack }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={1} sx={{
      alignItems: "center"
    }}>
      <IconButton size="small" onClick={onBack} aria-label={t('partners.venueAvailabilityPage.back')}>
        <ArrowBackIcon />
      </IconButton>
      <Box>
        <Typography
          variant="overline"
          sx={{
            color: "text.secondary",
            fontWeight: 900
          }}>
          {t('partners.venueAvailabilityPage.venueNamed', { vars: { name: venueName ?? '…' } })}
        </Typography>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 950,
            lineHeight: 1.1
          }}>
          {t('partners.venueAvailabilityPage.slotAvailability')}
        </Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {t('partners.venueAvailabilityPage.slotAvailabilityHint')}
        </Typography>
      </Box>
    </Stack>
  );
}
