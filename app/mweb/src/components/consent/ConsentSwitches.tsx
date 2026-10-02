import { FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import type { ConsentCategory } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';

export type ConsentValues = Readonly<Record<ConsentCategory, boolean>>;

interface RowProps {
  testId: string;
  title: string;
  body: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}

function ConsentRow({ testId, title, body, checked, disabled, onChange }: Readonly<RowProps>) {
  return (
    <FormControlLabel
      data-testid={testId}
      labelPlacement="start"
      sx={{ mx: 0, justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}
      control={
        <Switch
          checked={checked}
          disabled={disabled}
          onChange={(_event, value) => onChange?.(value)}
        />
      }
      label={
        <Stack spacing={0.25}>
          <Typography sx={{ fontSize: 15, fontWeight: 500 }}>{title}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 13 }}>
            {body}
          </Typography>
        </Stack>
      }
    />
  );
}

interface Props {
  values: ConsentValues;
  onChange: (category: ConsentCategory, checked: boolean) => void;
  disabled?: boolean;
}

/**
 * The three consent rows — Essential (always on), Analytics, Marketing — as the
 * banner's "Choose" view and the Privacy & data screen both render them. Each
 * switch is a real labelled control, so a screen reader names what it changes.
 */
export default function ConsentSwitches({ values, onChange, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <ConsentRow
        testId="consent-switch-essential"
        title={`${t('privacy.categories.essential.title')} · ${t('privacy.categories.essential.alwaysOn')}`}
        body={t('privacy.categories.essential.body')}
        checked
        disabled
      />
      <ConsentRow
        testId="consent-switch-analytics"
        title={t('privacy.categories.analytics.title')}
        body={t('privacy.categories.analytics.body')}
        checked={values.analytics}
        disabled={disabled}
        onChange={(checked) => onChange('analytics', checked)}
      />
      <ConsentRow
        testId="consent-switch-marketing"
        title={t('privacy.categories.marketing.title')}
        body={t('privacy.categories.marketing.body')}
        checked={values.marketing}
        disabled={disabled}
        onChange={(checked) => onChange('marketing', checked)}
      />
    </Stack>
  );
}
