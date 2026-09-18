import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DialogActions, DialogContent, FormControlLabel, Stack, Switch } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import TileFields from './TileFields';
import RuleFields from './RuleFields';
import RecipientsField from './RecipientsField';
import { useDashboardTiles } from './useDashboardTiles';
import { alertSchema, MAX_RECIPIENTS, type AlertValues } from './analytics-alert.types';

interface Props {
  defaultValues: AlertValues;
  busy: boolean;
  onCancel: () => void;
  /** Handles its own failure — the dialog reports it and stays open. */
  onSubmit: (values: AlertValues) => Promise<void>;
}

/**
 * One alert: its name, the tile it watches, when it trips, who hears about it
 * and whether it is on. Laid out as a dialog's content and actions.
 */
export default function AnalyticsAlertForm({ defaultValues, busy, onCancel, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, handleSubmit, setValue } = useForm<AlertValues>({
    defaultValues,
    resolver: zodResolver(
      alertSchema({
        nameRequired: t('analytics.alerts.nameRequired'),
        nameTooLong: t('analytics.alerts.nameTooLong'),
        tileRequired: t('analytics.alerts.tileRequired'),
        thresholdRequired: t('analytics.alerts.thresholdRequired'),
        thresholdInvalid: t('analytics.alerts.thresholdInvalid'),
        thresholdPositive: t('analytics.alerts.thresholdPositive'),
        emailFormat: t('analytics.alerts.emailFormat'),
        tooManyRecipients: t('analytics.alerts.tooManyRecipients', { vars: { max: MAX_RECIPIENTS } }),
        recipientsRequired: t('analytics.alerts.recipientsRequired'),
      })
    ),
    mode: 'all',
  });
  const [entity, kpiKey, condition] = useWatch({ control, name: ['entity', 'kpi_key', 'condition'] });
  const { tiles, loading } = useDashboardTiles(entity);
  const liveTile = tiles.find((tile) => tile.key === kpiKey)?.live ?? false;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="analytics-alert-form">
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <RhfTextField<AlertValues>
            control={control}
            name="name"
            label={t('analytics.alerts.name')}
            hint={t('analytics.alerts.nameHint')}
            required
            slotProps={{ htmlInput: { 'data-testid': 'analytics-alert-name', maxLength: 120 } }}
          />
          <TileFields control={control} setValue={setValue} tiles={tiles} tilesLoading={loading} />
          <RuleFields control={control} condition={condition} liveTile={liveTile} />
          <Controller
            name="emails"
            control={control}
            render={({ field, fieldState }) => (
              <RecipientsField
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message ?? fieldState.error?.root?.message}
              />
            )}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Controller
              name="slack"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />}
                  label={t('analytics.alerts.slack')}
                />
              )}
            />
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />}
                  label={t('analytics.alerts.active')}
                />
              )}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onCancel} disabled={busy}>
          {t('analytics.alerts.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" loading={busy} data-testid="analytics-alert-save">
          {t('analytics.alerts.save')}
        </DuncitButton>
      </DialogActions>
    </form>
  );
}
