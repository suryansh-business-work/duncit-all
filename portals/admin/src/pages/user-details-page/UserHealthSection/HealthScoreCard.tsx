import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Alert, Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AdjustHealthDialog from './AdjustHealthDialog';
import AdjustmentRow from './AdjustmentRow';
import { useConfirm } from '../../../components/useConfirm';
import {
  DELETE_ADJUSTMENT,
  type AdminHealthAdjustment,
  type AdminHealthScore,
} from './queries';

const BAND_COLOR: Record<AdminHealthScore['band'], 'error' | 'warning' | 'success'> = {
  RED: 'error',
  YELLOW: 'warning',
  GREEN: 'success',
};

const BAND_HEX: Record<AdminHealthScore['band'], string> = {
  RED: '#e53935',
  YELLOW: '#fb8c00',
  GREEN: '#43a047',
};

interface Props {
  score: AdminHealthScore;
  onUpdated: (next: AdminHealthScore) => void;
}

export default function HealthScoreCard({ score, onUpdated }: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminHealthAdjustment | null>(null);
  const [deleteAdjustment, { loading: deleting }] = useMutation(DELETE_ADJUSTMENT);
  const confirm = useConfirm();

  const closeDialog = () => {
    setOpen(false);
    setEditing(null);
  };

  const onDelete = async (adjustment: AdminHealthAdjustment) => {
    const ok = await confirm({
      title: 'Delete adjustment',
      message: 'This removes the adjustment and recomputes the score. This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    const { data } = await deleteAdjustment({ variables: { id: adjustment.id } });
    if (data?.deleteAdjustment) onUpdated(data.deleteAdjustment);
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" rowGap={1}>
            <Box
              sx={{
                width: 86,
                height: 86,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                bgcolor: `${BAND_HEX[score.band]}1A`,
                color: BAND_HEX[score.band],
                fontWeight: 950,
                fontSize: 28,
                border: `3px solid ${BAND_HEX[score.band]}`,
              }}
            >
              {score.total_score}
            </Box>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="h6" fontWeight={900}>
                  {score.subject_label}
                </Typography>
                <Chip
                  size="small"
                  color={BAND_COLOR[score.band]}
                  label={score.subject_type === 'USER' ? 'User' : 'Venue'}
                  sx={{ fontWeight: 800 }}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Base: {score.base_score} · Admin adjustment: {score.delta_sum >= 0 ? `+${score.delta_sum}` : score.delta_sum} · Final: {score.total_score}/100
              </Typography>
            </Box>
            <Button variant="contained" size="small" startIcon={<EditIcon />} onClick={() => { setEditing(null); setOpen(true); }}>
              Adjust
            </Button>
          </Stack>

          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900 }}>
              Adjustment history
            </Typography>
            {score.adjustments.length === 0 ? (
              <Alert severity="info" sx={{ mt: 0.5 }}>No admin adjustments yet. Default score is {score.base_score}.</Alert>
            ) : (
              <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                {score.adjustments.map((a) => (
                  <AdjustmentRow
                    key={a.id}
                    adjustment={a}
                    busy={deleting}
                    onEdit={(adj) => { setEditing(adj); setOpen(true); }}
                    onDelete={(adj) => {
                      onDelete(adj).catch(() => undefined);
                    }}
                  />
                ))}
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
        editing={editing}
        onClose={closeDialog}
        onSaved={(next) => {
          onUpdated(next);
          closeDialog();
        }}
      />
    </Card>
  );
}
