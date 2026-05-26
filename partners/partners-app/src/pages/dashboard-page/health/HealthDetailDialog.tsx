import {
  Alert,
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { format, formatDistanceToNow } from 'date-fns';
import HealthMeter from './HealthMeter';
import type { HealthScore } from './queries';

interface Props {
  open: boolean;
  score: HealthScore | null;
  onClose: () => void;
}

const BAND_LABEL: Record<HealthScore['band'], string> = {
  RED: 'Needs attention',
  YELLOW: 'Doing OK',
  GREEN: 'In great shape',
};

const BAND_COLOR: Record<HealthScore['band'], 'error' | 'warning' | 'success'> = {
  RED: 'error',
  YELLOW: 'warning',
  GREEN: 'success',
};

export default function HealthDetailDialog({ open, score, onClose }: Props) {
  return (
    <Dialog open={open && !!score} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle sx={{ pr: 6, fontWeight: 900 }}>
        {score?.subject_label} · {score?.subject_type === 'USER' ? 'Account' : 'Venue'} Health
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }} aria-label="Close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {score && (
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" spacing={2}>
              <HealthMeter score={score.total_score} band={score.band} />
              <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                <Chip size="small" color={BAND_COLOR[score.band]} label={BAND_LABEL[score.band]} sx={{ fontWeight: 800, alignSelf: 'flex-start' }} />
                <Typography variant="body2" color="text.secondary">
                  Base score: {score.base_score}
                  {score.delta_sum !== 0 && (
                    <>
                      {' '}· Admin adjustment: {score.delta_sum > 0 ? `+${score.delta_sum}` : score.delta_sum}
                    </>
                  )}
                </Typography>
              </Stack>
            </Stack>

            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900 }}>
                Admin remarks
              </Typography>
              {score.adjustments.length === 0 ? (
                <Alert severity="info" sx={{ mt: 1 }}>
                  No admin adjustments yet. Default score is {score.base_score}.
                </Alert>
              ) : (
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {score.adjustments.map((a) => {
                    const sign = a.delta > 0 ? `+${a.delta}` : `${a.delta}`;
                    const color: 'success' | 'error' = a.delta > 0 ? 'success' : 'error';
                    return (
                      <Paper key={a.id} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={1.25}>
                          <Chip size="small" color={color} label={sign} sx={{ fontWeight: 900 }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2">{a.remark}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {a.created_by_name} · {format(new Date(a.created_at), 'dd MMM yyyy, hh:mm a')} ·{' '}
                              {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              )}
            </Box>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
