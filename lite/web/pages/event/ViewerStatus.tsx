import { Link as RouterLink } from 'react-router';
import { useMutation } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import type { LiteRegistration } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { RegistrationStatusChip } from '../../components/StatusChips';
import { LITE_CANCEL_REGISTRATION } from '../../graphql/registrations';
import { paths } from '../../lib/paths';
import type { RegistrationView } from './registrationView';

interface ViewerStatusProps {
  view: Extract<RegistrationView, 'CONFIRMED' | 'PAYMENT_PENDING' | 'PENDING_APPROVAL' | 'WAITLISTED'>;
  registration: LiteRegistration;
  onChanged: () => void;
}

/** The card once the viewer holds a place: their status, the ticket link, and a way out. */
export function ViewerStatus({ view, registration, onChanged }: Readonly<ViewerStatusProps>) {
  const { t } = useWebT();
  const confirm = useConfirm();
  const [cancelRegistration, cancelState] = useMutation(LITE_CANCEL_REGISTRATION);

  const cancel = async () => {
    const ok = await confirm({
      title: t('liteWeb.event.cancelConfirmTitle'),
      message: t('liteWeb.event.cancelConfirmBody'),
      confirmLabel: t('liteWeb.event.cancelRegistration'),
      cancelLabel: t('liteWeb.event.keepRegistration'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await cancelRegistration({ variables: { id: registration.id } });
      notifySuccess(t('liteWeb.event.cancelled'));
      onChanged();
    } catch (error) {
      notifyError(parseApiError(error));
    }
  };

  const ticketLabel = view === 'PAYMENT_PENDING' ? t('liteWeb.event.completePayment') : t('liteWeb.event.viewTicket');
  return (
    <Stack spacing={1.5} data-testid="viewer-status">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <RegistrationStatusChip status={registration.status} />
        {registration.waitlist_position === null ? null : (
          <Typography variant="body2" color="text.secondary">
            {t('liteWeb.event.waitlistPosition', { vars: { position: registration.waitlist_position } })}
          </Typography>
        )}
      </Stack>
      <Typography sx={{ fontWeight: 700 }}>{t(`liteWeb.event.viewer.${view}`)}</Typography>
      <DuncitButton component={RouterLink} to={paths.ticket(registration.id)} variant="contained" size="large" data-testid="viewer-ticket-link">
        {ticketLabel}
      </DuncitButton>
      <DuncitButton variant="text" color="inherit" onClick={cancel} loading={cancelState.loading} data-testid="viewer-cancel">
        {t('liteWeb.event.cancelRegistration')}
      </DuncitButton>
    </Stack>
  );
}
