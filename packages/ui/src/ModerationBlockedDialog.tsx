import { Dialog, DialogActions, DialogContent, DialogTitle, Link, Stack, Typography } from '@mui/material';
import GppMaybeIcon from '@mui/icons-material/GppMaybe';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from './i18n/useTranslation';

/** One flagged issue, resolved to the wizard step the user must fix it on. */
export interface BlockedViolation {
  id: string;
  message: string;
  type: string;
  stepIndex: number;
  stepTitle: string;
}

export interface ModerationBlockedDialogProps {
  violations: BlockedViolation[];
  onJump: (stepIndex: number) => void;
  onClose: () => void;
  /** Dialog heading. Defaults to a generic publish-blocked title. */
  title?: string;
  /** Explanatory line under the heading. Defaults to a generic message. */
  description?: string;
}


/** Shown when the AI + rules preflight blocks publishing: lists what to fix and
 * links each issue to the step it lives on (click → jump there). Shared by the
 * mWeb pod editor and the partner-portal product form. */
export function ModerationBlockedDialog({
  violations,
  onJump,
  onClose,
  title,
  description,
}: Readonly<ModerationBlockedDialogProps>) {
  const { t } = useTranslation();
  return (
    <Dialog
      open={violations.length > 0}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      data-testid="moderation-blocked-dialog"
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 900 }}>
        <GppMaybeIcon color="error" /> {title ?? t('ui.moderation.title')}
      </DialogTitle>
      <DialogContent>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mb: 1.5
          }}>
          {description ?? t('ui.moderation.description')}
        </Typography>
        <Stack spacing={1.25}>
          {violations.map((violation) => (
            <Stack key={violation.id} spacing={0.5} sx={{ p: 1.25, borderRadius: 2, bgcolor: 'action.hover' }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {violation.message}
              </Typography>
              <Link
                component="button"
                type="button"
                underline="hover"
                data-testid={`moderation-fix-${violation.id}`}
                onClick={() => onJump(violation.stepIndex)}
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 800, alignSelf: 'flex-start' }}
              >
                <ArrowForwardIcon sx={{ fontSize: 16 }} /> Fix in {violation.stepTitle}
              </Link>
            </Stack>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} data-testid="moderation-blocked-close">
          Close
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
