import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import FragmentCodePane from './FragmentCodePane';
import type { Fragment } from './queries';

interface Props {
  draft: Fragment;
  setDraft: (f: Fragment) => void;
  previewHtml: string;
  previewErrors: string[];
  dirty: boolean;
  busy: boolean;
  onSave: () => void;
  onReset: () => void;
  onDelete: () => void;
}

export default function FragmentEditorPanel(p: Readonly<Props>) {
  const { draft, setDraft, previewHtml, previewErrors, dirty, busy, onSave, onReset, onDelete } = p;

  return (
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
        <TextField
          size="small"
          label="Name"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          sx={{ flex: '1 1 200px' }}
        />
        <Chip size="small" label={draft.key} sx={{ fontFamily: 'monospace' }} />
        {draft.is_system && <Chip size="small" variant="outlined" label="ships with Duncit" />}
        <FormControlLabel
          control={
            <Switch
              checked={draft.is_active}
              onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
            />
          }
          label="Applied to templates"
        />
      </Stack>

      {draft.description && (
        <Typography variant="caption" color="text.secondary">
          {draft.description}
        </Typography>
      )}

      <Stack direction="row" spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
          <FragmentCodePane
            title="Header"
            hint="Rendered above every template body"
            value={draft.header_mjml}
            onChange={(v) => setDraft({ ...draft, header_mjml: v })}
          />
          <FragmentCodePane
            title="Footer"
            hint="Rendered below every template body"
            value={draft.footer_mjml}
            onChange={(v) => setDraft({ ...draft, footer_mjml: v })}
          />
        </Stack>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography variant="subtitle2" sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
            Preview
          </Typography>
          {previewErrors.length > 0 && (
            <Alert severity="error" sx={{ borderRadius: 0 }}>
              {previewErrors.join('; ')}
            </Alert>
          )}
          <Box sx={{ flex: 1, minHeight: 0, bgcolor: '#f4f4f4' }}>
            <iframe
              title="Fragment preview"
              srcDoc={previewHtml}
              style={{ width: '100%', height: '100%', border: 0 }}
            />
          </Box>
        </Box>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center">
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={!dirty || busy}
          onClick={onSave}
        >
          Save
        </Button>
        {draft.is_system ? (
          <Button color="warning" startIcon={<RestartAltIcon />} disabled={busy} onClick={onReset}>
            Reset to shipped
          </Button>
        ) : (
          <Button color="error" startIcon={<DeleteForeverIcon />} disabled={busy} onClick={onDelete}>
            Delete
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.secondary">
          {draft.is_system
            ? 'One of the nine that ship with Duncit — editable and switchable, never deletable.'
            : 'Your own fragment. Any template can pick it.'}
        </Typography>
      </Stack>
    </Stack>
  );
}
