import { Alert, Box, FormControlLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { ConflictMode } from './useRecurringDialog';

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
        {t('availability.recurring.whenSlotsOverlap')}
      </Typography>
      <RadioGroup value={value} onChange={(e) => onChange(e.target.value as ConflictMode)}>
        <FormControlLabel
          value="SKIP"
          control={<Radio size="small" />}
          label={
            <Stack>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {t('availability.recurring.overlapSkip')}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('availability.recurring.overlapSkipHint')}
              </Typography>
            </Stack>
          }
        />
        <FormControlLabel
          value="REPLACE"
          control={<Radio size="small" color="error" />}
          label={
            <Stack>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {t('availability.recurring.overlapReplace')}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('availability.recurring.overlapReplaceHint')}
              </Typography>
            </Stack>
          }
        />
      </RadioGroup>
      {value === 'REPLACE' && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          {t('availability.recurring.overlapReplaceWarning')}
        </Alert>
      )}
    </Box>
  );
}
