import type { ReactNode } from 'react';
import { Alert, Card, CardContent, CircularProgress, Stack } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import type { SetupSectionKey } from '../register-venue-page/register-venue';
import { useVenueSetupForm, type VenueSetupForm } from './useVenueSetupForm';

/** What a setup page draws inside the editor: the section, given the loaded form. */
type SetupContent = (ctx: Omit<VenueSetupForm, 'config'> & { config: NonNullable<VenueSetupForm['config']> }) => ReactNode;

interface Props {
  venueId: string;
  section: SetupSectionKey;
  testId: string;
  children: SetupContent;
}

/** A Venue Options setup page's card: the venue's section and its Save button. */
export default function VenueSetupEditor({ venueId, section, testId, children }: Readonly<Props>) {
  const { t } = useTranslation();
  const setup = useVenueSetupForm(venueId, section);
  const { form, config, loading, loadError, saving, error } = setup;

  if (loading) {
    return (
      <Stack sx={{ alignItems: 'center', py: 4 }}>
        <CircularProgress size={24} aria-label={t('shell.a11y.loading')} />
      </Stack>
    );
  }
  if (loadError || !config || !setup.venue) {
    return <Alert severity="error">{t('partners.venueSetup.loadFailed')}</Alert>;
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }} data-testid={testId}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            fireAndForget(setup.submit(), logs.portal['partners-app'], 'venue-setup', 'submit');
          }}
        >
          <Stack spacing={2.5}>
            {children({ ...setup, config })}
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
              <DuncitButton
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                loading={saving}
                disabled={!form.formState.isDirty}
                data-testid={`${testId}-save`}
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

