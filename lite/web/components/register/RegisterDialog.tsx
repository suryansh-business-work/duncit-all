import { useId, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import { Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import type { LiteEvent, LiteRegistration } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { paths } from '../../lib/paths';
import { RegistrationStatusChip } from '../StatusChips';
import { RegisterForm } from './register.form';

interface RegisterDialogProps {
  event: LiteEvent;
  open: boolean;
  onClose: () => void;
  /** Called once a registration exists, so the page can re-read the event. */
  onRegistered: () => void;
}

/** Register for an event. A paid ticket goes straight to its ticket page, where the payment step lives. */
export function RegisterDialog({ event, open, onClose, onRegistered }: Readonly<RegisterDialogProps>) {
  const { t } = useWebT();
  const navigate = useNavigate();
  const titleId = useId();
  const [result, setResult] = useState<LiteRegistration | null>(null);

  const done = (registration: LiteRegistration) => {
    onRegistered();
    if (registration.status === 'PAYMENT_PENDING') {
      onClose();
      navigate(paths.ticket(registration.id));
      return;
    }
    setResult(registration);
  };

  const close = () => {
    setResult(null);
    onClose();
  };

  const title = event.require_approval ? t('liteWeb.register.requestTitle') : t('liteWeb.register.title');
  return (
    <Dialog open={open} onClose={close} aria-labelledby={titleId} fullWidth maxWidth="sm" data-testid="register-dialog">
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        <DialogTitle id={titleId}>{result ? t('liteWeb.register.doneTitle') : title}</DialogTitle>
        <DuncitIconButton aria-label={t('lite.common.close')} onClick={close} data-testid="register-dialog-close">
          <CloseIcon />
        </DuncitIconButton>
      </Stack>
      <DialogContent>
        {result ? (
          <Stack spacing={2} sx={{ alignItems: 'flex-start' }} data-testid="register-result">
            <RegistrationStatusChip status={result.status} />
            <Typography>{t(`liteWeb.register.done.${result.status}`, { vars: { title: event.title } })}</Typography>
            <Stack direction="row" spacing={1}>
              <DuncitButton component={RouterLink} to={paths.ticket(result.id)} variant="contained" onClick={close} data-testid="register-view-ticket">
                {t('liteWeb.register.viewTicket')}
              </DuncitButton>
              <DuncitButton onClick={close}>{t('lite.common.close')}</DuncitButton>
            </Stack>
          </Stack>
        ) : (
          <RegisterForm event={event} onDone={done} />
        )}
      </DialogContent>
    </Dialog>
  );
}
