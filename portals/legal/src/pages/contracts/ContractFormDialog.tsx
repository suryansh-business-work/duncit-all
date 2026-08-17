import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DuncitRichTextInput } from '@duncit/rich-text';
import { CONTRACT_STATUS_OPTIONS, type ContractStatus } from '../../graphql/contracts';

export interface ContractFormState {
  title: string;
  counterparty: string;
  description: string;
  status: ContractStatus;
  effective_from: string;
  effective_to: string;
  content: string;
}

export const EMPTY_CONTRACT_FORM: ContractFormState = {
  title: '',
  counterparty: '',
  description: '',
  status: 'DRAFT',
  effective_from: '',
  effective_to: '',
  content: '',
};

interface Props {
  open: boolean;
  isNew: boolean;
  editingTitle: string;
  form: ContractFormState;
  error: string | null;
  saving: boolean;
  /** Read-only in the dialog: an id you can edit is not an identifier. */
  contractNo?: string;
  /** View mode — every field locked and nothing to save. */
  readOnly?: boolean;
  onChange: (patch: Partial<ContractFormState>) => void;
  onClose: () => void;
  onSubmit: () => void;
}

/** Create or edit a contract — the same dialog shape the Policies module uses. */
export default function ContractFormDialog({
  open,
  isNew,
  editingTitle,
  form,
  error,
  saving,
  contractNo,
  readOnly = false,
  onChange,
  onClose,
  onSubmit,
}: Readonly<Props>) {
  const heading = () => {
    if (isNew) return 'New Contract';
    return `${readOnly ? 'View' : 'Edit'} · ${editingTitle}`;
  };

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth="md">
      <DialogTitle>{heading()}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {!isNew && contractNo && (
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {contractNo}
            </Typography>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Title"
              value={form.title}
              onChange={(e) => onChange({ title: e.target.value })}
              required
              fullWidth
              autoFocus
              disabled={readOnly}
            />
            <TextField
              label="Counterparty"
              value={form.counterparty}
              onChange={(e) => onChange({ counterparty: e.target.value })}
              fullWidth
              disabled={readOnly}
              helperText="Who the contract is with"
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Status"
              select
              value={form.status}
              onChange={(e) => onChange({ status: e.target.value as ContractStatus })}
              disabled={readOnly}
              sx={{ minWidth: 180 }}
            >
              {CONTRACT_STATUS_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Effective from"
              type="date"
              value={form.effective_from}
              onChange={(e) => onChange({ effective_from: e.target.value })}
              InputLabelProps={{ shrink: true }}
              disabled={readOnly}
              fullWidth
            />
            <TextField
              label="Effective to"
              type="date"
              value={form.effective_to}
              onChange={(e) => onChange({ effective_to: e.target.value })}
              InputLabelProps={{ shrink: true }}
              disabled={readOnly}
              fullWidth
            />
          </Stack>

          <TextField
            label="Description"
            value={form.description}
            onChange={(e) => onChange({ description: e.target.value })}
            fullWidth
            multiline
            disabled={readOnly}
            minRows={2}
          />

          <Box>
            <Typography variant="caption" color="text.secondary">
              Contract
            </Typography>
            <DuncitRichTextInput
              value={form.content}
              onChange={(value) => onChange({ content: value })}
              minHeight={220}
              readOnly={readOnly}
              aiContext="legal contract"
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          {readOnly ? 'Close' : 'Cancel'}
        </Button>
        {!readOnly && (
          <Button variant="contained" disabled={saving || !form.title.trim()} onClick={onSubmit}>
            {saving ? 'Saving…' : isNew ? 'Create Contract' : 'Save'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
