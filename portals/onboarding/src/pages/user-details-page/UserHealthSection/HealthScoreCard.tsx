import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import AdjustHealthDialog from './AdjustHealthDialog';
import type { AdminHealthScore } from './queries';
import { formatDateTime } from '@duncit/app-settings';

const BAND_COLOR: Record<AdminHealthScore['band'], 'error' | 'warning' | 'success'> = {
  RED: 'error',
  YELLOW: 'warning',
  GREEN: 'success',
};

interface Props {
  score: AdminHealthScore;
  onUpdated: (next: AdminHealthScore) => void;
}

export default function HealthScoreCard({ score, onUpdated }: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const bandHex: Record<AdminHealthScore['band'], string> = {
    RED: theme.palette.error.main,
    YELLOW: theme.palette.warning.main,
    GREEN: theme.palette.success.main,
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack
            direction="row"
            spacing={2}
            sx={{
              alignItems: "center",
              flexWrap: "wrap",
              rowGap: 1
            }}>
            <Box
              sx={{
                width: 86,
                height: 86,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                bgcolor: alpha(bandHex[score.band], 0.1),
                color: bandHex[score.band],
                fontWeight: 950,
                fontSize: 28,
                border: `3px solid ${bandHex[score.band]}`,
              }}
            >
              {score.total_score}
            </Box>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Stack direction="row" spacing={1} sx={{
                alignItems: "center"
              }}>
                <Typography variant="h6" sx={{
                  fontWeight: 900
                }}>
                  {score.subject_label}
                </Typography>
                <Chip
                  size="small"
                  color={BAND_COLOR[score.band]}
                  label={score.subject_type === 'USER' ? 'User' : 'Venue'}
                  sx={{ fontWeight: 800 }}
                />
              </Stack>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  display: 'block'
                }}>
                Base: {score.base_score} · Admin adjustment: {score.delta_sum >= 0 ? `+${score.delta_sum}` : score.delta_sum} · Final: {score.total_score}/100
              </Typography>
            </Box>
            <Button variant="contained" size="small" startIcon={<EditIcon />} onClick={() => setOpen(true)}>
              Adjust
            </Button>
          </Stack>

          <Box>
            <Typography
              variant="overline"
              sx={{
                color: "text.secondary",
                fontWeight: 900
              }}>
              Adjustment history
            </Typography>
            {score.adjustments.length === 0 ? (
              <Alert severity="info" sx={{ mt: 0.5 }}>No admin adjustments yet. Default score is {score.base_score}.</Alert>
            ) : (
              <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                {score.adjustments.map((a) => {
                  const sign = a.delta > 0 ? `+${a.delta}` : `${a.delta}`;
                  const color: 'success' | 'error' = a.delta > 0 ? 'success' : 'error';
                  return (
                    <Paper key={a.id} variant="outlined" sx={{ p: 1 }}>
                      <Stack direction="row" spacing={1} sx={{
                        alignItems: "center"
                      }}>
                        <Chip size="small" color={color} label={sign} sx={{ fontWeight: 900 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2">{a.remark}</Typography>
                          <Typography variant="caption" sx={{
                            color: "text.secondary"
                          }}>
                            {a.created_by_name} · {formatDateTime(a.created_at)}
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
      </CardContent>
      <AdjustHealthDialog
        open={open}
        subjectType={score.subject_type}
        subjectId={score.subject_id}
        subjectLabel={score.subject_label}
        currentScore={score.total_score}
        onClose={() => setOpen(false)}
        onSaved={(next) => {
          onUpdated(next);
          setOpen(false);
        }}
      />
    </Card>
  );
}
