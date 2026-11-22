import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { parseApiError, roleLabelKey } from '@duncit/utils';
import { AskDuncitKillSwitchForm, type AskDuncitKillSwitchValues } from '../../../forms/ask-duncit-kill-switch';
import { SET_ASK_DUNCIT_KILL_SWITCH } from '../shared/mutations';
import type { RoleKey } from '../shared/types';

interface Props {
  /** null = the global switch. */
  role: RoleKey | null;
  on: boolean;
  reason: string;
  canControl: boolean;
  onChanged: () => void;
}

const FORM_ID = 'ask-duncit-kill-switch';

/** The emergency stop — globally or for one role. Pulling it needs a reason; releasing it does not. */
export default function KillSwitchCard({ role, on, reason, canControl, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [setKill, setting] = useMutation(SET_ASK_DUNCIT_KILL_SWITCH);

  const apply = async (next: boolean, why = '') => {
    try {
      await setKill({ variables: { on: next, reason: why, role } });
      setOpen(false);
      onChanged();
    } catch (e) {
      notifyError(parseApiError(e) || t('ai.askDuncit.saveFailed'));
    }
  };

  const scope = role ? t(roleLabelKey(role)) : t('ai.askDuncit.control.everyone');
  return (
    <Card variant="outlined" sx={{ borderColor: on ? 'error.main' : 'divider' }}>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
          <Stack>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t('ai.askDuncit.control.killTitle', { vars: { scope } })}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t(on ? 'ai.askDuncit.control.killOn' : 'ai.askDuncit.control.killOff')}
            </Typography>
          </Stack>
          {canControl && (
            <DuncitButton variant="contained" color={on ? 'primary' : 'error'} disabled={setting.loading} onClick={() => (on ? apply(false).catch(() => undefined) : setOpen(true))}>
              {t(on ? 'ai.askDuncit.control.release' : 'ai.askDuncit.control.stop')}
            </DuncitButton>
          )}
        </Stack>
        {on && reason && <Alert severity="error" sx={{ mt: 1.5 }}>{reason}</Alert>}
      </CardContent>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" aria-labelledby="ask-duncit-kill-title">
        <DialogTitle id="ask-duncit-kill-title">{t('ai.askDuncit.control.killConfirm', { vars: { scope } })}</DialogTitle>
        <DialogContent>{open && <AskDuncitKillSwitchForm formId={FORM_ID} onSubmit={(values: AskDuncitKillSwitchValues) => apply(true, values.reason)} />}</DialogContent>
        <DialogActions>
          <DuncitButton onClick={() => setOpen(false)}>{t('ai.askDuncit.cancel')}</DuncitButton>
          <DuncitButton type="submit" form={FORM_ID} variant="contained" color="error" disabled={setting.loading}>
            {t('ai.askDuncit.control.stop')}
          </DuncitButton>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
