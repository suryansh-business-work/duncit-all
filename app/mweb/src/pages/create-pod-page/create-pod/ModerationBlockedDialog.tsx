import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import GppMaybeIcon from '@mui/icons-material/GppMaybe';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

/** One flagged issue, resolved to the step the host must fix it on. */
export interface BlockedViolation {
  id: string;
  message: string;
  type: string;
  stepIndex: number;
  stepTitle: string;
}

interface Props {
  violations: BlockedViolation[];
  onJump: (stepIndex: number) => void;
  onClose: () => void;
}

/** Shown when the AI + rules preflight blocks publishing: lists what to fix and
 * links each issue to the step it lives on (click → jump there). */
export default function ModerationBlockedDialog({ violations, onJump, onClose }: Readonly<Props>) {
  return (
    <Dialog
      open={violations.length > 0}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      data-testid="moderation-blocked-dialog"
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 900 }}>
        <GppMaybeIcon color="error" /> Fix these before publishing
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Our AI check found content that breaks the community guidelines, so the pod was not
          created. Fix the items below and try again.
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
        <Button onClick={onClose} data-testid="moderation-blocked-close">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
