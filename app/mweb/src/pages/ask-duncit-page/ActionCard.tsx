import { Box, Chip, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { actionStatusKey, canDecide } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { Action } from './queries';

interface Props {
  action: Action;
  canRollback: boolean;
  onDecide: (actionId: string, approve: boolean) => void;
  onRollback: (actionId: string) => void;
}

const STATUS_COLOR: Record<string, 'default' | 'success' | 'error' | 'warning' | 'info'> = {
  PENDING: 'warning',
  EXECUTED: 'success',
  FAILED: 'error',
  REJECTED: 'default',
  EXPIRED: 'default',
  EXECUTING: 'info',
  ROLLED_BACK: 'info',
};

/**
 * A change the assistant proposed. Nothing happens until the person taps
 * Approve; the server re-checks their permission at that moment. Destructive
 * changes are marked, and an executed change with an exact inverse can be undone.
 */
export default function ActionCard({ action, canRollback, onDecide, onRollback }: Readonly<Props>) {
  const { t } = useTranslation();
  const pending = canDecide(action);
  const destructive = action.risk === 'DESTRUCTIVE';
  return (
    <Box
      data-testid="ask-duncit-action"
      role="group"
      aria-label={t('askDuncit.action.ariaLabel')}
      sx={{ border: 1, borderColor: destructive ? 'error.main' : 'divider', borderRadius: 2, p: 1.5, bgcolor: 'background.paper' }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {action.tool_title}
        </Typography>
        <Chip size="small" color={STATUS_COLOR[action.status] ?? 'default'} label={t(actionStatusKey(action.status))} />
      </Stack>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
        {destructive ? t('askDuncit.action.destructiveHint') : t('askDuncit.action.hint')}
      </Typography>
      <Box component="pre" sx={{ m: 0, mb: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 160, overflow: 'auto' }}>
        {action.args_preview}
      </Box>
      {action.error_message && (
        <Typography variant="caption" role="alert" sx={{ color: 'error.main', display: 'block', mb: 1 }}>
          {action.error_message}
        </Typography>
      )}
      {pending && (
        <Stack direction="row" spacing={1}>
          <DuncitButton data-testid="ask-duncit-approve" variant="contained" color={destructive ? 'error' : 'primary'} size="small" onClick={() => onDecide(action.id, true)}>
            {t('askDuncit.action.approve')}
          </DuncitButton>
          <DuncitButton data-testid="ask-duncit-reject" variant="outlined" size="small" onClick={() => onDecide(action.id, false)}>
            {t('askDuncit.action.reject')}
          </DuncitButton>
        </Stack>
      )}
      {canRollback && action.can_rollback && (
        <DuncitButton data-testid="ask-duncit-undo" variant="text" size="small" onClick={() => onRollback(action.id)}>
          {t('askDuncit.action.undo')}
        </DuncitButton>
      )}
    </Box>
  );
}
