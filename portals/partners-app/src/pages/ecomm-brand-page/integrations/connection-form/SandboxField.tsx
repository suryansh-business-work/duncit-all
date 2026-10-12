import { useId, type ReactNode } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { Alert, FormControl, FormControlLabel, FormHelperText, Link, Stack, Switch, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { INTEGRATION_LINKS } from '../../../../config/integration-links';
import type { ConnectionFormValues } from './connection.types';

interface Props {
  control: Control<ConnectionFormValues>;
  /** The sandbox's own inputs (address, API user), shown only while the switch is on. */
  children: ReactNode;
}

/**
 * ShipRocket's sandbox switch. On, every order for a brand using this
 * connection is booked on ShipRocket's sandbox — a test, with no courier and no
 * charge — so the form says so plainly before the partner saves it. The sandbox
 * has its own API user and address, entered here; the production ones stay saved.
 */
export default function SandboxField({ control, children }: Readonly<Props>) {
  const { t } = useTranslation();
  const hintId = useId();
  const sectionId = useId();
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
            <Stack spacing={2} component="section" aria-labelledby={sectionId} data-testid="integration-shiprocket-sandbox-section">
              <Typography id={sectionId} component="h3" variant="subtitle2">
                {t('partners.brandWizard.integration.sandboxSection')}
              </Typography>
              <Alert severity="info" data-testid="integration-shiprocket-sandbox-info">
                {t('partners.brandWizard.integration.sandboxInfo')}
              </Alert>
              {children}
              <Alert severity="warning" data-testid="integration-shiprocket-sandbox-warning">
                {t('partners.brandWizard.integration.sandboxOnWarning')}
              </Alert>
            </Stack>
          )}
        </Stack>
      )}
    />
  );
}
