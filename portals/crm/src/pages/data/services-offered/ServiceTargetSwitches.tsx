import { Alert, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { SERVICE_TARGETS, allServiceTargets, hasAnyTarget, type ServiceTargets } from '../../../config/serviceTargets';

interface Props {
  value: ServiceTargets;
  onChange: (next: ServiceTargets) => void;
}

/**
 * One switch per lead kind a Service Offered can show on, plus "All". "All" is
 * derived (every kind on) — turning it on enables every kind, off clears them.
 * At least one kind must stay on (the parent disables Save until it is).
 */
export default function ServiceTargetSwitches({ value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const all = SERVICE_TARGETS.every((target) => value[target.flag]);
  return (
    <Stack spacing={0.5}>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontWeight: 700,
          letterSpacing: 0.4,
        }}
      >
        {t('crm.data.availableForLeadForms')}
      </Typography>
      <Stack direction="row" useFlexGap spacing={2} sx={{ flexWrap: 'wrap' }}>
        {SERVICE_TARGETS.map((target) => (
          <FormControlLabel
            key={target.flag}
            control={
              <Switch
                checked={value[target.flag]}
                onChange={(e) => onChange({ ...value, [target.flag]: e.target.checked })}
              />
            }
            label={t(target.labelKey)}
          />
        ))}
        <FormControlLabel
          control={<Switch checked={all} onChange={(e) => onChange(allServiceTargets(e.target.checked))} />}
          label={t('crm.data.allLeadTypes')}
        />
      </Stack>
      {!hasAnyTarget(value) && (
        <Alert severity="warning" sx={{ py: 0 }}>
          {t('crm.data.turnOnAtLeastOneLeadType')}
        </Alert>
      )}
    </Stack>
  );
}
