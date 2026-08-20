import type { ReactNode } from 'react';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AutoModeIcon from '@mui/icons-material/AutoMode';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import type { PodKindLabels } from '@duncit/utils';

/** Which form the New Pod button should open. */
export type PodKind = 'NORMAL' | 'AUTO';

interface PodKindOptionProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

/**
 * One of the two boxes. Hoisted to module scope (rule 26a/S6478) and a real
 * ButtonBase, so it is reachable by keyboard and announced as a button.
 */
function PodKindOption({ icon, title, description, onClick }: Readonly<PodKindOptionProps>) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{ flex: 1, textAlign: 'left', borderRadius: 2, alignItems: 'stretch' }}
    >
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          width: '100%',
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          transition: 'border-color .15s, box-shadow .15s',
          '&:hover': { borderColor: 'primary.main', boxShadow: 2 },
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25}>
          {icon}
          <Typography variant="subtitle1" fontWeight={700}>
            {title}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Paper>
    </ButtonBase>
  );
}

export interface PodKindChooserProps {
  open: boolean;
  labels: PodKindLabels;
  onClose: () => void;
  /** The chosen kind — the caller opens the matching form. */
  onPick: (kind: PodKind) => void;
}

/**
 * The question every "New Pod" button asks first: an ordinary pod the creator
 * fills in end to end, or an Auto Pod the marketplace completes.
 *
 * It only ever reports the choice; the two forms stay with their own surfaces,
 * because Admin and the Partners console submit through different mutations.
 * Callers that have the `auto_pods` flag off skip this dialog entirely rather
 * than render a one-sided question.
 */
export function PodKindChooser({ open, labels, onClose, onPick }: Readonly<PodKindChooserProps>) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 0.5 }}>{labels.title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {labels.subtitle}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="stretch">
          <PodKindOption
            icon={<EventAvailableIcon color="primary" />}
            title={labels.normalTitle}
            description={labels.normalDesc}
            onClick={() => onPick('NORMAL')}
          />
          <PodKindOption
            icon={<AutoModeIcon color="primary" />}
            title={labels.autoTitle}
            description={labels.autoDesc}
            onClick={() => onPick('AUTO')}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{labels.dismiss}</Button>
      </DialogActions>
    </Dialog>
  );
}
