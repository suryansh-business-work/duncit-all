import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Controller, useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, isValid, parse } from 'date-fns';
import { Alert, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { UPDATE_VENUE_SETTINGS } from '@duncit/availability-calendar';
import { DuncitButton } from '@duncit/buttons';
import { notifySuccess } from '@duncit/dialogs';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { weekdayLabels } from '@duncit/slots';
import { parseApiError } from '@duncit/utils';
import {
  buildOpeningHoursSchema,
  openingHoursValues,
  toOpeningHoursInput,
  type OpeningHoursSource,
  type OpeningHoursValues,
} from './opening-hours.types';

const CLOCK = 'HH:mm';

/** A picker's test id, spread into its text field (MUI X types no data-* props there). */
const testIdOf = (name: string): { 'data-testid': string } => ({ 'data-testid': `opening-hours-${name}` });

interface TimeProps {
  control: Control<OpeningHoursValues>;
  name: 'open' | 'close';
  label: string;
}

/** An 'HH:mm' form value on the MUI X time picker (the admin's clock format). */
function TimeOfDayField({ control, name, label }: Readonly<TimeProps>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TimePicker
          label={label}
          value={parse(field.value, CLOCK, new Date())}
          onChange={(next) => field.onChange(next && isValid(next) ? format(next, CLOCK) : '')}
          slotProps={{
            textField: {
              size: 'small',
              fullWidth: true,
              error: !!fieldState.error,
              helperText: fieldState.error?.message ?? ' ',
              ...testIdOf(name),
            },
          }}
        />
      )}
    />
  );
}

interface Props {
  venueId: string;
  settings: OpeningHoursSource | null | undefined;
  onSaved: () => Promise<unknown>;
}

/** When the venue opens and closes, and the days it is closed every week. */
export default function OpeningHoursForm({ venueId, settings, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const days = useMemo(() => weekdayLabels(t), [t]);
  const schema = useMemo(() => buildOpeningHoursSchema(t), [t]);
  const defaults = useMemo(() => openingHoursValues(settings), [settings]);
  const [error, setError] = useState<string | null>(null);
  const [save, saveState] = useMutation(UPDATE_VENUE_SETTINGS);
  const { control, handleSubmit, reset, formState } = useForm<OpeningHoursValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => reset(defaults), [defaults, reset]);

  const submit = handleSubmit(async (values) => {
    setError(null);
    try {
      await save({ variables: { venue_doc_id: venueId, input: toOpeningHoursInput(values) } });
      await onSaved();
      notifySuccess(t('partners.venueSetup.saved'));
    } catch (saveError) {
      setError(parseApiError(saveError) || t('partners.venueSetup.saveFailed'));
      logs.portal['partners-app'].warn('opening-hours', 'save', { error: saveError, venue_id: venueId });
    }
  });

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }} data-testid="opening-hours">
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <form noValidate aria-label={t('partners.venueSetup.hoursTitle')} onSubmit={submit}>
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 800 }}>
                {t('partners.venueSetup.hoursTitle')}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('partners.venueSetup.hoursSubtitle')}
              </Typography>
            </Stack>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TimeOfDayField control={control} name="open" label={t('partners.venueSetup.opensAt')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TimeOfDayField control={control} name="close" label={t('partners.venueSetup.closesAt')} />
              </Grid>
            </Grid>
            <Controller
              control={control}
              name="weekly_off_days"
              render={({ field }) => (
                <Stack spacing={1} role="group" aria-label={t('partners.venueSetup.weeklyOff')}>
                  <Typography variant="subtitle2">{t('partners.venueSetup.weeklyOff')}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {t('partners.venueSetup.weeklyOffHint')}
                  </Typography>
                  <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {days.short.map((label, day) => {
                      const off = field.value.includes(day);
                      return (
                        <Chip
                          key={days.full[day]}
                          label={label}
                          aria-label={days.full[day]}
                          aria-pressed={off}
                          color={off ? 'primary' : 'default'}
                          variant={off ? 'filled' : 'outlined'}
                          onClick={() => field.onChange(off ? field.value.filter((d) => d !== day) : [...field.value, day])}
                          data-testid={`opening-hours-off-${day}`}
                        />
                      );
                    })}
                  </Stack>
                </Stack>
              )}
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
              <DuncitButton
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                loading={saveState.loading}
                disabled={!formState.isDirty}
                data-testid="opening-hours-save"
              >
                {t('partners.venueSetup.save')}
              </DuncitButton>
            </Stack>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}
