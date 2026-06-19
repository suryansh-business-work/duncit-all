import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { FounderMetric } from './types';
import { labelizeKey } from './format';

export type DrawerMode = 'info' | 'settings';

interface Props {
  metric: FounderMetric | null;
  mode: DrawerMode | null;
  settings: Record<string, number>;
  saving: boolean;
  onClose: () => void;
  onSave: (entries: { key: string; value: number }[]) => void;
}

/** Build the list of editable keys for a metric's settings drawer. */
function editableKeys(metric: FounderMetric): string[] {
  const keys = metric.source === 'manual' ? [metric.key] : [];
  metric.setting_keys.forEach((k) => {
    if (!keys.includes(k)) keys.push(k);
  });
  return keys;
}

export default function MetricDrawer({ metric, mode, settings, saving, onClose, onSave }: Readonly<Props>) {
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!metric || mode !== 'settings') return;
    const initial: Record<string, string> = {};
    editableKeys(metric).forEach((k) => {
      const current = k === metric.key && metric.source === 'manual' ? metric.value : settings[k] ?? 0;
      initial[k] = String(current);
    });
    setDraft(initial);
  }, [metric, mode, settings]);

  if (!metric || !mode) return null;
  const keys = editableKeys(metric);

  const handleSave = () => {
    const entries = keys
      .map((k) => ({ key: k, value: Number(draft[k]) }))
      .filter((e) => Number.isFinite(e.value));
    onSave(entries);
  };

  return (
    <Drawer anchor="right" open onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2 }}>
        <Typography variant="h6">{metric.label}</Typography>
        <IconButton onClick={onClose} aria-label="Close">
          <CloseIcon />
        </IconButton>
      </Stack>
      <Divider />

      <Box sx={{ p: 2, flexGrow: 1, overflowY: 'auto' }}>
        <Chip
          size="small"
          color={metric.source === 'computed' ? 'success' : 'default'}
          variant="outlined"
          label={metric.source === 'computed' ? 'Computed from data' : 'Manual value'}
          sx={{ mb: 2 }}
        />

        {mode === 'info' ? (
          <>
            <Typography variant="subtitle2" color="text.secondary">
              What is this?
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {metric.definition}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
              Formula
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, fontFamily: 'monospace' }}>
              {metric.formula}
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="subtitle2" color="text.secondary">
              Formula
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, mb: 2, fontFamily: 'monospace' }}>
              {metric.formula}
            </Typography>
            {keys.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                This metric is computed automatically — nothing to configure.
              </Typography>
            ) : (
              <Stack spacing={2}>
                {keys.map((k) => (
                  <TextField
                    key={k}
                    label={k === metric.key ? `${metric.label} (value)` : labelizeKey(k)}
                    type="number"
                    size="small"
                    fullWidth
                    value={draft[k] ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
                  />
                ))}
              </Stack>
            )}
          </>
        )}
      </Box>

      {mode === 'settings' && keys.length > 0 && (
        <>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Button variant="contained" fullWidth onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </Box>
        </>
      )}
    </Drawer>
  );
}
