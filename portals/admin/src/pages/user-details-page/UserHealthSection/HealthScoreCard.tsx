import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Alert, Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import { DuncitButton } from '@duncit/buttons';
import AdjustHealthDialog from './AdjustHealthDialog';
import AdjustmentRow from './AdjustmentRow';
import { useConfirm } from '@duncit/dialogs';
import {
  DELETE_ADJUSTMENT,
  type AdminHealthAdjustment,
  type AdminHealthScore,
} from './queries';
import { useTranslation } from '@duncit/shell';

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
  const { t } = useTranslation();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminHealthAdjustment | null>(null);
  const [deleteAdjustment, { loading: deleting }] = useMutation(DELETE_ADJUSTMENT);
  const confirm = useConfirm();
  const bandColor = theme.palette[BAND_COLOR[score.band]].main;

  const closeDialog = () => {
    setOpen(false);
    setEditing(null);
  };

  const onDelete = async (adjustment: AdminHealthAdjustment) => {
    const ok = await confirm({
      title: t('admin.health.deleteAdjustment'),
      message: t('admin.health.deleteBody'),
      confirmLabel: t('shell.common.delete'),
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
                bgcolor: alpha(bandColor, 0.1),
                color: bandColor,
                fontWeight: 950,
                fontSize: 28,
                border: `3px solid ${bandColor}`,
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
            <DuncitButton variant="contained" size="small" startIcon={<EditIcon />} onClick={() => { setEditing(null); setOpen(true); }}>
              Adjust
            </DuncitButton>
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
