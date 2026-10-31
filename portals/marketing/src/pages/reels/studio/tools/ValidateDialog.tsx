import { useEffect } from 'react';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, ListItemIcon, ListItemText, Stack, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import type { ReelCheck } from '../../types';
import PlatformPicker from './PlatformPicker';
import { checkTally, useValidation } from './useValidation';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  /** The checks as the server last ran them, shown until a fresh run replaces them. */
  lastChecks: readonly ReelCheck[];
  /** A fresh result, for the toolbar's chip. */
  onResult: (checks: ReelCheck[]) => void;
}

/** Every check, pass or fail, with what it found — in words, never by colour alone. */
function CheckList({ checks }: Readonly<{ checks: readonly ReelCheck[] }>) {
  const { t } = useTranslation();
  const tally = checkTally(checks);
  return (
    <Stack spacing={1}>
      <Typography variant="body2" role="status" sx={{ fontWeight: 600 }} data-testid="reel-validate-summary">
        {t('ai.reels.validate.summary', { vars: { passed: tally.passed, total: tally.total } })}
      </Typography>
      <List dense disablePadding aria-label={t('ai.reels.validate.listLabel')} data-testid="reel-validate-list">
        {checks.map((check) => (
          <ListItem key={check.name} sx={{ alignItems: 'flex-start', px: 0 }} data-testid={`reel-check-${check.name}`} data-pass={check.pass}>
            <ListItemIcon sx={{ minWidth: 32, mt: 0.25 }}>
              {check.pass ? (
                <CheckCircleOutlineIcon color="success" fontSize="small" role="img" aria-label={t('ai.reels.validate.pass')} />
              ) : (
                <ErrorOutlineIcon color="error" fontSize="small" role="img" aria-label={t('ai.reels.validate.fail')} />
              )}
            </ListItemIcon>
            <ListItemText primary={check.name} secondary={check.detail} slotProps={{ secondary: { sx: { wordBreak: 'break-word' } } }} />
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}

/**
 * The pre-export checks: pick the networks, run them, read what would stop
 * the reel on each. The last run's result stays on the reel, so the toolbar
 * can say how it stands without the dialog open.
 */
export default function ValidateDialog({ open, onClose, projectId, lastChecks, onResult }: Readonly<Props>) {
  const { t } = useTranslation();
  const validation = useValidation(projectId);
  const { checks } = validation;

  useEffect(() => {
    if (checks) onResult(checks);
  }, [checks, onResult]);

  const shown = checks ?? lastChecks;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="reel-validate-title" data-testid="reel-validate-dialog">
      <DialogTitle id="reel-validate-title">{t('ai.reels.validate.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('ai.reels.validate.hint')}
          </Typography>
          <PlatformPicker label={t('ai.reels.validate.platforms')} value={validation.platforms} onChange={validation.setPlatforms} disabled={validation.loading} />
          <DuncitButton
            variant="contained"
            loading={validation.loading}
            disabled={validation.platforms.length === 0}
            onClick={validation.run}
            sx={{ alignSelf: 'flex-start' }}
            data-testid="reel-validate-run"
          >
            {t('ai.reels.validate.run')}
          </DuncitButton>
          {validation.error && (
            <Alert severity="error" data-testid="reel-validate-error">
              {parseApiError(validation.error, t('ai.reels.validate.failed'))}
            </Alert>
          )}
          {shown.length > 0 ? (
            <CheckList checks={shown} />
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid="reel-validate-empty">
              {t('ai.reels.validate.empty')}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} data-testid="reel-validate-close">
          {t('shell.common.close')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
