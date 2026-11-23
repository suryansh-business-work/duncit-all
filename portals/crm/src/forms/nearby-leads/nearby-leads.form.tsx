import { useMemo } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormHelperText, FormLabel, Slider, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import RadarIcon from '@mui/icons-material/Radar';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { AreaField, CityField } from '../fields/LocationField';
import { NEARBY_RADIUS } from '../../hooks/useNearbyLeads';
import { nearbyLeadsDefaults, nearbyLeadsSchema } from './nearby-leads.schema';
import type { NearbyLeadsFormProps, NearbyLeadsFormValues } from './nearby-leads.types';

const RADIUS_LABEL_ID = 'nearby-leads-radius-label';
const SOURCE_LABEL_ID = 'nearby-leads-source-label';

/** Leads listing › Nearby leads: where to search around, and how far. */
export default function NearbyLeadsForm({ initialValues, onSubmit }: Readonly<NearbyLeadsFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => nearbyLeadsSchema(t), [t]);
  const methods = useForm<NearbyLeadsFormValues>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    defaultValues: initialValues ?? nearbyLeadsDefaults,
  });
  const { control, handleSubmit, formState } = methods;
  const source = useWatch({ control, name: 'source' });
  const marks = useMemo(
    () => NEARBY_RADIUS.marks.map((km) => ({ value: km, label: t('crm.nearby.radiusValue', { vars: { km } }) })),
    [t]
  );
  const radiusText = (km: number) => t('crm.nearby.radiusValue', { vars: { km } });

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="nearby-leads-form">
        <Stack spacing={2.5}>
          <Stack spacing={1}>
            <FormLabel id={SOURCE_LABEL_ID}>{t('crm.nearby.centreLabel')}</FormLabel>
            <Controller
              name="source"
              control={control}
              render={({ field }) => (
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  color="primary"
                  value={field.value}
                  onChange={(_, value: NearbyLeadsFormValues['source'] | null) => value && field.onChange(value)}
                  aria-labelledby={SOURCE_LABEL_ID}
                >
                  <ToggleButton value="me" data-testid="nearby-source-me">
                    <MyLocationIcon fontSize="small" sx={{ mr: 1 }} />
                    {t('crm.nearby.myLocation')}
                  </ToggleButton>
                  <ToggleButton value="place" data-testid="nearby-source-place">
                    <LocationCityIcon fontSize="small" sx={{ mr: 1 }} />
                    {t('crm.nearby.pickPlace')}
                  </ToggleButton>
                </ToggleButtonGroup>
              )}
            />
            {source === 'me' && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('crm.nearby.myLocationHint')}
              </Typography>
            )}
          </Stack>

          {source === 'place' && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <CityField name="city" label={t('crm.common.city')} required />
              <AreaField name="area" cityField="city" label={t('crm.forms.areaLocality')} />
            </Stack>
          )}

          <Stack spacing={1}>
            <FormLabel id={RADIUS_LABEL_ID}>{t('crm.nearby.radiusLabel')}</FormLabel>
            <Controller
              name="radius_km"
              control={control}
              render={({ field }) => (
                <Slider
                  value={field.value}
                  onChange={(_, value) => field.onChange(Array.isArray(value) ? value[0] : value)}
                  min={NEARBY_RADIUS.min}
                  max={NEARBY_RADIUS.max}
                  step={0.5}
                  marks={marks}
                  valueLabelDisplay="auto"
                  valueLabelFormat={radiusText}
                  getAriaValueText={radiusText}
                  aria-labelledby={RADIUS_LABEL_ID}
                  data-testid="nearby-radius"
                />
              )}
            />
            {formState.errors.radius_km && <FormHelperText error>{formState.errors.radius_km.message}</FormHelperText>}
          </Stack>

          <DuncitButton type="submit" variant="contained" startIcon={<RadarIcon />} data-testid="nearby-find">
            {t('crm.nearby.find')}
          </DuncitButton>
        </Stack>
      </form>
    </FormProvider>
  );
}
