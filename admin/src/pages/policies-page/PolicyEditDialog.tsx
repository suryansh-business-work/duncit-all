import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  InputAdornment,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { type FormState, QUILL_FORMATS, QUILL_MODULES } from './helpers';

interface Props {
  editing: any | null;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  saving: boolean;
  error: string | null;
  setSlugTouched: React.Dispatch<React.SetStateAction<boolean>>;
  onClose: () => void;
  onSubmit: () => void;
}

export default function PolicyEditDialog({
  editing,
  form,
  setForm,
  saving,
  error,
  setSlugTouched,
  onClose,
  onSubmit,
}: Props) {
  return (
    <Dialog open={!!editing} onClose={() => !saving && onClose()} fullWidth maxWidth="lg">
      <DialogTitle>{editing?.id ? `Edit · ${editing.title}` : 'New Policy'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              fullWidth
              autoFocus
            />
            <TextField
              label="Slug"
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setForm({ ...form, slug: e.target.value });
              }}
              required
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LinkIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              helperText="lowercase letters, numbers and dashes (e.g. privacy-policy)"
            />
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label="Sort order"
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              size="small"
              sx={{ width: 160 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
              }
              label={form.is_active ? 'Active (visible in app)' : 'Hidden'}
            />
          </Stack>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Content
            </Typography>
            <Box
              sx={{
                '& .ql-toolbar': {
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                },
                '& .ql-container': {
                  borderBottomLeftRadius: 8,
                  borderBottomRightRadius: 8,
                  borderColor: 'divider',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  minHeight: 320,
                  bgcolor: 'background.paper',
                },
                '& .ql-editor': { minHeight: 320 },
              }}
            >
              <ReactQuill
                theme="snow"
                value={form.content}
                onChange={(v) => setForm({ ...form, content: v })}
                modules={QUILL_MODULES}
                formats={QUILL_FORMATS}
              />
            </Box>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onSubmit} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : editing?.id ? 'Save changes' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
