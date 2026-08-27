import { Card, Checkbox, FormControlLabel, MenuItem, Stack, Switch, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import type { CrmDynamicFieldKind } from '../../api/crm.types';
import DynamicFieldOptionsEditor from './DynamicFieldOptionsEditor';
import { KIND_LABELS, type DraftState } from './dynamicFieldDraft';
import { useTranslation } from '@duncit/shell';

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
  const { t } = useTranslation();
  const set = (patch: Partial<DraftState>) => onChange({ ...draft, ...patch });
  return (
    <Card variant="outlined" sx={{ p: 2 }}>
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 700,
          mb: 1.5
        }}>
        {draft.id ? `Edit field — ${draft.label || draft.name}` : 'New field'}
      </Typography>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label={t('crm.managedynamicfieldspage.label')}
            required
            value={draft.label}
            onChange={(e) => set({ label: e.target.value })}
            helperText={t('crm.managedynamicfieldspage.whatTheUserSeesOnThe')}
            slotProps={{
              htmlInput: { 'aria-label': 'dynamic-field-label' }
            }}
          />
          <TextField
            size="small"
            select
            label={t('shell.common.type')}
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
              aria-label={t('crm.managedynamicfieldspage.selectionMode')}
            >
              <ToggleButton value="single" aria-label={t('crm.managedynamicfieldspage.singleSelect')}>{t('crm.managedynamicfieldspage.single')}</ToggleButton>
              <ToggleButton value="multi" aria-label={t('crm.managedynamicfieldspage.multiSelect')}>{t('crm.managedynamicfieldspage.multiple')}</ToggleButton>
            </ToggleButtonGroup>
          )}
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <TextField
            fullWidth size="small" label={t('crm.managedynamicfieldspage.placeholder')} value={draft.placeholder}
            onChange={(e) => set({ placeholder: e.target.value })}
            slotProps={{
              htmlInput: { 'aria-label': 'dynamic-field-placeholder' }
            }}
          />
          <TextField
            fullWidth size="small" label={t('crm.managedynamicfieldspage.defaultValue')} value={draft.default_value}
            onChange={(e) => set({ default_value: e.target.value })}
            slotProps={{
              htmlInput: { 'aria-label': 'dynamic-field-default' }
            }}
          />
        </Stack>
        <TextField
          fullWidth size="small" label={t('crm.managedynamicfieldspage.hint')} value={draft.hint}
          onChange={(e) => set({ hint: e.target.value })}
          helperText={t('crm.managedynamicfieldspage.shownBeneathTheInputAsGuidance')}
          slotProps={{
            htmlInput: { 'aria-label': 'dynamic-field-hint' }
          }}
        />

        {draft.kind === 'select' && (
          <DynamicFieldOptionsEditor options={draft.options} onChange={(options) => set({ options })} />
        )}

        <Stack direction="row" spacing={2} useFlexGap sx={{
          flexWrap: "wrap"
        }}>
          <FormControlLabel
            control={<Checkbox checked={draft.applies_to_venue} onChange={(e) => set({ applies_to_venue: e.target.checked })} />}
            label={t('crm.managedynamicfieldspage.appliesToVenueLeads')}
          />
          <FormControlLabel
            control={<Checkbox checked={draft.applies_to_host} onChange={(e) => set({ applies_to_host: e.target.checked })} />}
            label={t('crm.managedynamicfieldspage.appliesToHostLeads')}
          />
          <FormControlLabel
            control={<Checkbox checked={draft.applies_to_ecomm} onChange={(e) => set({ applies_to_ecomm: e.target.checked })} />}
            label={t('crm.managedynamicfieldspage.appliesToEcommLeads')}
          />
          <FormControlLabel
            control={<Checkbox checked={draft.required} onChange={(e) => set({ required: e.target.checked })} />}
            label={t('crm.managedynamicfieldspage.required')}
          />
          <FormControlLabel
            control={<Switch checked={draft.is_active} onChange={(e) => set({ is_active: e.target.checked })} />}
            label={t('crm.common.active')}
          />
        </Stack>

        <Stack direction="row" spacing={1} sx={{
          justifyContent: "flex-end"
        }}>
          <DuncitButton onClick={onCancel} disabled={busy}>
            {t('shell.common.cancel')}
          </DuncitButton>
          <DuncitButton variant="contained" startIcon={<SaveIcon />} onClick={onSave} disabled={busy}>
            {busy ? 'Saving…' : 'Save field'}
          </DuncitButton>
        </Stack>
      </Stack>
    </Card>
  );
}
