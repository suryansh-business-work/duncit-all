import { Controller, type Control } from 'react-hook-form';
import { FormControlLabel, FormGroup, Switch } from '@mui/material';
import { useTranslation } from '../i18n';
import type { ChallengeMappingValues } from './challenge-mapping.types';

type ToggleKey =
  | 'allow_host_customization'
  | 'show_on_pod_details_default'
  | 'allow_audience_voting'
  | 'require_challenge';

const TOGGLES: readonly ToggleKey[] = [
  'allow_host_customization',
  'show_on_pod_details_default',
  'allow_audience_voting',
  'require_challenge',
];

/** The category's host-facing defaults, one labelled switch each. */
export function MappingToggles({ control, disabled }: Readonly<{ control: Control<ChallengeMappingValues>; disabled: boolean }>) {
  const { t } = useTranslation();
  return (
    <FormGroup>
      {TOGGLES.map((key) => (
        <Controller
          key={key}
          name={key}
          control={control}
          render={({ field }) => (
            <FormControlLabel
              disabled={disabled}
              control={
                <Switch checked={field.value} onChange={(_e, checked) => field.onChange(checked)} />
              }
              label={t(`challenge.mapping.fields.${key}`)}
            />
          )}
        />
      ))}
    </FormGroup>
  );
}
