import {
  Button,
  Card,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import type { CrmDynamicFieldKind } from '../../api/crm.types';
import DynamicFieldOptionsEditor from './DynamicFieldOptionsEditor';
import { KIND_LABELS, type DraftState } from './dynamicFieldDraft';

interface Props {
  draft: DraftState;
  busy: boolean;
  onChange: (next: DraftState) => void;
  onCancel: () => void;
  onSave: () => void;
}

/** Create / edit form for a dynamic field. The storage key is auto-derived
 *  from the label (no Key input) and ordering is handled by the table. */
export default function DynamicFieldForm({ draft, busy, onChange, onCancel, onSave }: Readonly<Props>) {
  const set = (patch: Partial<DraftState>) => onChange({ ...draft, ...patch });
  return (
    <Card variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
        {draft.id ? `Edit field — ${draft.label || draft.name}` : 'New field'}
      </Typography>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label="Label"
            value={draft.label}
            onChange={(e) => set({ label: e.target.value })}
            helperText="What the user sees on the form."
            inputProps={{ 'aria-label': 'dynamic-field-label' }}
          />
          <TextField
            size="small"
            select
            label="Type"
            value={draft.kind}
            onChange={(e) => set({ kind: e.target.value as CrmDynamicFieldKind })}
            sx={{ minWidth: 160 }}
          >
            {(Object.keys(KIND_LABELS) as CrmDynamicFieldKind[]).map((k) => (
              <MenuItem key={k} value={k}>
                {KIND_LABELS[k]}
              </MenuItem>
            ))}
          </TextField>
          {draft.kind === 'select' && (
            <ToggleButtonGroup
              size="small"
              exclusive
              value={draft.multi ? 'multi' : 'single'}
              onChange={(_, v) => v && set({ multi: v === 'multi' })}
              aria-label="selection mode"
            >
              <ToggleButton value="single" aria-label="single select">Single</ToggleButton>
              <ToggleButton value="multi" aria-label="multi select">Multiple</ToggleButton>
            </ToggleButtonGroup>
          )}
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <TextField
            fullWidth size="small" label="Placeholder" value={draft.placeholder}
            onChange={(e) => set({ placeholder: e.target.value })}
            inputProps={{ 'aria-label': 'dynamic-field-placeholder' }}
          />
          <TextField
            fullWidth size="small" label="Default value" value={draft.default_value}
            onChange={(e) => set({ default_value: e.target.value })}
            inputProps={{ 'aria-label': 'dynamic-field-default' }}
          />
        </Stack>
        <TextField
          fullWidth size="small" label="Hint" value={draft.hint}
          onChange={(e) => set({ hint: e.target.value })}
          helperText="Shown beneath the input as guidance."
          inputProps={{ 'aria-label': 'dynamic-field-hint' }}
        />

        {draft.kind === 'select' && (
          <DynamicFieldOptionsEditor options={draft.options} onChange={(options) => set({ options })} />
        )}

        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <FormControlLabel
            control={<Checkbox checked={draft.applies_to_venue} onChange={(e) => set({ applies_to_venue: e.target.checked })} />}
            label="Applies to Venue leads"
          />
          <FormControlLabel
            control={<Checkbox checked={draft.applies_to_host} onChange={(e) => set({ applies_to_host: e.target.checked })} />}
            label="Applies to Host leads"
          />
          <FormControlLabel
            control={<Checkbox checked={draft.required} onChange={(e) => set({ required: e.target.checked })} />}
            label="Required"
          />
          <FormControlLabel
            control={<Switch checked={draft.is_active} onChange={(e) => set({ is_active: e.target.checked })} />}
            label="Active"
          />
        </Stack>

        <Stack direction="row" justifyContent="flex-end" spacing={1}>
          <Button onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={onSave} disabled={busy}>
            {busy ? 'Saving…' : 'Save field'}
          </Button>
        </Stack>
      </Stack>
    </Card>
  );
}
