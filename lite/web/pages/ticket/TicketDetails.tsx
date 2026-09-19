import { useMutation } from '@apollo/client/react';
import { Link, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { InfoRow, SectionCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useWebT } from '../../../shared/i18n';
import { PaymentStatusChip, RegistrationStatusChip } from '../../components/StatusChips';
import { LITE_CANCEL_REGISTRATION, type LiteTicket } from '../../graphql/registrations';
import { StatusTimeline } from './StatusTimeline';

const CAN_CANCEL = new Set(['PENDING_APPROVAL', 'PAYMENT_PENDING', 'CONFIRMED', 'WAITLISTED']);

/** Status, the join link once confirmed, the answers given, and the way to cancel. */
export function TicketDetails({ ticket, onChanged }: Readonly<{ ticket: LiteTicket; onChanged: () => void }>) {
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
      await cancelRegistration({ variables: { id: ticket.id } });
      notifySuccess(t('liteWeb.event.cancelled'));
      onChanged();
    } catch (error) {
      notifyError(parseApiError(error));
    }
  };

  const showJoin = ticket.status === 'CONFIRMED' && ticket.event.location_type === 'VIRTUAL' && ticket.event.virtual_link;
  return (
    <Stack spacing={2}>
      <SectionCard title={t('liteWeb.ticket.statusTitle')}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <RegistrationStatusChip status={ticket.status} />
            {ticket.payment_status === 'NOT_REQUIRED' ? null : <PaymentStatusChip status={ticket.payment_status} />}
          </Stack>
          <StatusTimeline registration={ticket} requiresApproval={ticket.event.require_approval} />
          {showJoin ? (
            <Link href={ticket.event.virtual_link ?? undefined} target="_blank" rel="noopener noreferrer" sx={{ fontWeight: 700 }} data-testid="ticket-join-link">
              {t('liteWeb.event.joinLink')}
            </Link>
          ) : null}
        </Stack>
      </SectionCard>
      <SectionCard title={t('liteWeb.ticket.orderTitle')}>
        <InfoRow label={t('liteWeb.register.ticket')} value={ticket.ticket.name} />
        <InfoRow label={t('liteWeb.register.quantity')} value={String(ticket.quantity)} />
        {ticket.answers.length > 0 ? (
          <Stack spacing={0.5} sx={{ pt: 1 }}>
            <Typography variant="subtitle2">{t('liteWeb.ticket.answersTitle')}</Typography>
            {ticket.answers.map((answer) => (
              <InfoRow key={answer.question_id} label={answer.label} value={answer.answer || '—'} />
            ))}
          </Stack>
        ) : null}
      </SectionCard>
      {CAN_CANCEL.has(ticket.status) ? (
        <DuncitButton variant="outlined" color="error" onClick={cancel} loading={cancelState.loading} sx={{ alignSelf: 'flex-start' }} data-testid="ticket-cancel">
          {t('liteWeb.event.cancelRegistration')}
        </DuncitButton>
      ) : null}
    </Stack>
  );
}
