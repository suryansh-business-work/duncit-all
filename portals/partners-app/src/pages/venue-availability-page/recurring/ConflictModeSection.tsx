import { Alert, Box, FormControlLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import type { ConflictMode } from './useRecurringDialog';
import { useTranslation } from '@duncit/shell';

interface Props {
  value: ConflictMode;
  onChange: (mode: ConflictMode) => void;
}

/**
 * What a recurring run does when one of its slots lands on a time the space is
 * already published for. Overwrite is destructive and irreversible, so it says
 * exactly what it deletes at the moment it is picked rather than after.
 */
export default function ConflictModeSection({ value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 800, mb: 0.25 }}>
        {t('partners.venueAvailabilityPage.whenSlotsOverlap')}
      </Typography>
      <RadioGroup value={value} onChange={(e) => onChange(e.target.value as ConflictMode)}>
        <FormControlLabel
          value="SKIP"
          control={<Radio size="small" />}
          label={
            <Stack>
              <Typography variant="body2" sx={{
                fontWeight: 700
              }}>
                {t('partners.venueAvailabilityPage.overlapSkip')}
              </Typography>
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                {t('partners.venueAvailabilityPage.overlapSkipHint')}
              </Typography>
            </Stack>
          }
        />
        <FormControlLabel
          value="REPLACE"
          control={<Radio size="small" color="error" />}
          label={
            <Stack>
              <Typography variant="body2" sx={{
                fontWeight: 700
              }}>
                {t('partners.venueAvailabilityPage.overlapReplace')}
              </Typography>
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                {t('partners.venueAvailabilityPage.overlapReplaceHint')}
              </Typography>
            </Stack>
          }
        />
      </RadioGroup>
      {value === 'REPLACE' && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          {t('partners.venueAvailabilityPage.overlapReplaceWarning')}
        </Alert>
      )}
    </Box>
  );
}
