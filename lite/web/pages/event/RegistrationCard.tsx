import { useState } from 'react';
import { Alert, Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import type { LiteEvent } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { useSignInPrompt } from '../../app/providers/SignInPromptProvider';
import { RegisterDialog } from '../../components/register';
import { registrationView } from './registrationView';
import { TicketList } from './TicketList';
import { ViewerStatus } from './ViewerStatus';

interface RegistrationCardProps {
  event: LiteEvent;
  onChanged: () => void;
}

const CLOSED_KEYS = { CANCELLED_EVENT: 'liteWeb.event.closed.cancelled', DRAFT: 'liteWeb.event.closed.draft', ENDED: 'liteWeb.event.closed.ended' } as const;

/** The right-hand card: tickets and the one call to action the viewer's situation allows. */
export function RegistrationCard({ event, onChanged }: Readonly<RegistrationCardProps>) {
  const { t } = useWebT();
  const { now } = useDateFormat({ timeZoneAware: true });
  const { requireSignIn } = useSignInPrompt();
  const [open, setOpen] = useState(false);
  const view = registrationView(event, now());

  const start = async () => {
    if (await requireSignIn()) setOpen(true);
  };

  let body;
  if (view === 'CANCELLED_EVENT' || view === 'DRAFT' || view === 'ENDED') {
    body = (
      <Alert severity={view === 'DRAFT' ? 'warning' : 'info'} data-testid="registration-closed">
        {t(CLOSED_KEYS[view])}
      </Alert>
    );
  } else if (view === 'OPEN') {
    body = (
      <DuncitButton variant="contained" size="large" onClick={start} data-testid="register-open">
        {event.require_approval ? t('liteWeb.event.requestToJoin') : t('liteWeb.event.register')}
      </DuncitButton>
    );
  } else if (event.viewer_registration) {
    body = <ViewerStatus view={view} registration={event.viewer_registration} onChanged={onChanged} />;
  }

  return (
    <Card data-testid="registration-card">
      <CardContent>
        <Stack spacing={2}>
          <Typography component="h2" variant="h5">
            {t('liteWeb.event.ticketsTitle')}
          </Typography>
          <TicketList tickets={event.tickets} />
          <Divider />
          {body}
          {event.require_approval && view === 'OPEN' ? (
            <Typography variant="body2" color="text.secondary">
              {t('liteWeb.register.approvalNote')}
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
      {view === 'OPEN' ? <RegisterDialog event={event} open={open} onClose={() => setOpen(false)} onRegistered={onChanged} /> : null}
    </Card>
  );
}
