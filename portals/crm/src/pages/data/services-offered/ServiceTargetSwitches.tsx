import { Alert, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';

interface Props {
  venue: boolean;
  host: boolean;
  onChange: (next: { venue: boolean; host: boolean }) => void;
}

/**
 * Venue / Host / Both target switches for a Service Offered. "Both" is derived
 * (venue && host) — turning it on enables both sides; turning it off clears
 * both. At least one side must stay on (enforced by the parent on submit).
 */
export default function ServiceTargetSwitches({ venue, host, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const both = venue && host;
  return (
    <Stack spacing={0.5}>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontWeight: 700,
          letterSpacing: 0.4
        }}>
        AVAILABLE FOR · which lead form shows this service
      </Typography>
      <Stack direction="row" useFlexGap spacing={2} sx={{
        flexWrap: "wrap"
      }}>
        <FormControlLabel
          control={<Switch checked={venue} onChange={(e) => onChange({ venue: e.target.checked, host })} />}
          label={t('crm.common.venue')}
        />
        <FormControlLabel
          control={<Switch checked={host} onChange={(e) => onChange({ venue, host: e.target.checked })} />}
          label={t('crm.common.host')}
        />
        <FormControlLabel
          control={<Switch checked={both} onChange={(e) => onChange({ venue: e.target.checked, host: e.target.checked })} />}
          label={t('crm.data.both')}
        />
      </Stack>
      {!venue && !host && (
        <Alert severity="warning" sx={{ py: 0 }}>{t('crm.data.turnOnVenueHostOrBoth')}</Alert>
      )}
    </Stack>
  );
}
