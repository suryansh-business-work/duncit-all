import { useId } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { Alert, FormControl, FormControlLabel, FormHelperText, Link, Stack, Switch } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { INTEGRATION_LINKS } from '../../../../config/integration-links';
import type { ConnectionFormValues } from './connection.types';

interface Props {
  control: Control<ConnectionFormValues>;
}

/**
 * ShipRocket's sandbox switch. On, every order for a brand using this
 * connection is booked on ShipRocket's sandbox — a test, with no courier and no
 * charge — so the form says so plainly before the partner saves it.
 */
export default function SandboxField({ control }: Readonly<Props>) {
  const { t } = useTranslation();
  const hintId = useId();
  return (
    <Controller
      control={control}
      name="sandbox"
      render={({ field }) => (
        <Stack spacing={1}>
          <FormControl>
            <FormControlLabel
              label={t('partners.brandWizard.integration.sandboxLabel')}
              control={
                <Switch
                  checked={field.value}
                  onChange={(_event, checked) => field.onChange(checked)}
                  onBlur={field.onBlur}
                  slotProps={{ input: { 'aria-describedby': hintId } }}
                  data-testid="integration-shiprocket-sandbox"
                />
              }
            />
            <FormHelperText id={hintId} sx={{ mx: 0 }}>
              {t('partners.brandWizard.integration.sandboxHint')}{' '}
              <Link href={INTEGRATION_LINKS.SHIPROCKET.sandbox} target="_blank" rel="noopener noreferrer">
                {t('partners.brandWizard.integration.sandboxOpen')} ({t('partners.brandWizard.integration.opensInNewTab')})
              </Link>
            </FormHelperText>
          </FormControl>
          {field.value && (
            <Alert severity="warning" data-testid="integration-shiprocket-sandbox-warning">
              {t('partners.brandWizard.integration.sandboxOnWarning')}
            </Alert>
          )}
        </Stack>
      )}
    />
  );
}
