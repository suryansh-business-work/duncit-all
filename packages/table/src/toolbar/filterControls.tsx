import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { NUMBER_OPS, OPERATOR_KEYS, TEXT_OPS } from '../columnTypes';
import { useTranslation } from '../i18n';
import type { DuncitColumn, DuncitColumnOption, TableFilterOp } from '../types';
import type { FilterDraft } from './filterState';

type DraftPatch = Partial<FilterDraft>;

interface ControlProps {
  field: string;
  label: string;
  draft: FilterDraft;
  onChange: (patch: DraftPatch) => void;
}

function OperatorSelect(props: Readonly<ControlProps & { ops: readonly TableFilterOp[] }>) {
  const { field, draft, onChange, ops } = props;
  const { t } = useTranslation();
  const labelId = `duncit-filter-${field}-op-label`;
  const condition = t('shell.table.condition');
  return (
    <FormControl size="small" fullWidth>
      <InputLabel id={labelId}>{condition}</InputLabel>
      <Select
        labelId={labelId}
        label={condition}
        value={draft.op}
        onChange={(event: SelectChangeEvent) => onChange({ op: event.target.value as TableFilterOp })}
      >
        {ops.map((op) => (
          <MenuItem key={op} value={op}>
            {t(OPERATOR_KEYS[op] ?? op)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function TextControl(props: Readonly<ControlProps>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <OperatorSelect {...props} ops={TEXT_OPS} />
      <TextField
        label={t('shell.table.value')}
        size="small"
        fullWidth
        value={props.draft.value}
        onChange={(event) => props.onChange({ value: event.target.value })}
      />
    </Stack>
  );
}

function NumberControl(props: Readonly<ControlProps>) {
  const { label, draft, onChange } = props;
  const { t } = useTranslation();
  const isRange = draft.op === 'between';
  const firstLabel = isRange ? t('shell.table.rangeMin', { vars: { label } }) : t('shell.table.value');
  return (
    <Stack spacing={1.5}>
      <OperatorSelect {...props} ops={NUMBER_OPS} />
      <Stack direction="row" spacing={1}>
        <TextField
          label={firstLabel}
          size="small"
          type="number"
          fullWidth
          value={draft.value}
          onChange={(event) => onChange({ value: event.target.value })}
        />
        {isRange ? (
          <TextField
            label={t('shell.table.rangeMax', { vars: { label } })}
            size="small"
            type="number"
            fullWidth
            value={draft.valueTo}
            onChange={(event) => onChange({ valueTo: event.target.value })}
          />
        ) : null}
      </Stack>
    </Stack>
  );
}

function DateControl({ label, draft, onChange }: Readonly<ControlProps>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <DatePicker
        label={t('shell.table.rangeFrom', { vars: { label } })}
        value={draft.from}
        maxDate={draft.to ?? undefined}
        onChange={(value: Date | null) => onChange({ from: value })}
        slotProps={{ textField: { size: 'small', fullWidth: true } }}
      />
      <DatePicker
        label={t('shell.table.rangeTo', { vars: { label } })}
        value={draft.to}
        minDate={draft.from ?? undefined}
        onChange={(value: Date | null) => onChange({ to: value })}
        slotProps={{ textField: { size: 'small', fullWidth: true } }}
      />
    </Stack>
  );
}

function BooleanControl({ field, label, draft, onChange }: Readonly<ControlProps>) {
  const { t } = useTranslation();
  const labelId = `duncit-filter-${field}-label`;
  const handleChange = (event: SelectChangeEvent) => {
    onChange({ bool: event.target.value as FilterDraft['bool'] });
  };
  return (
    <FormControl size="small" fullWidth>
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select labelId={labelId} label={label} value={draft.bool} onChange={handleChange}>
        <MenuItem value="">{t('shell.table.any')}</MenuItem>
        <MenuItem value="true">{t('shell.table.yes')}</MenuItem>
        <MenuItem value="false">{t('shell.table.no')}</MenuItem>
      </Select>
    </FormControl>
  );
}

function EnumControl(props: Readonly<ControlProps & { options: ReadonlyArray<DuncitColumnOption> }>) {
  const { field, label, draft, onChange, options } = props;
  const labelId = `duncit-filter-${field}-label`;
  const labelFor = (value: string) => options.find((o) => o.value === value)?.label ?? value;
  const handleChange = (event: SelectChangeEvent<string[]>) => {
    const { value } = event.target;
    onChange({ selected: typeof value === 'string' ? value.split(',') : value });
  };
  return (
    <FormControl size="small" fullWidth>
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select
        labelId={labelId}
        label={label}
        multiple
        value={draft.selected}
        onChange={handleChange}
        renderValue={(selected) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selected.map((value) => (
              <Chip key={value} size="small" label={labelFor(value)} />
            ))}
          </Box>
        )}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

/** The control a column's `type` filters with. */
export function FilterControl<T>(
  props: Readonly<{
    column: DuncitColumn<T>;
    label: string;
    draft: FilterDraft;
    onChange: (patch: DraftPatch) => void;
  }>,
) {
  const { column, label, draft, onChange } = props;
  const common = { field: column.field, label, draft, onChange };
  if (column.type === 'enum') return <EnumControl {...common} options={column.options} />;
  if (column.type === 'number') return <NumberControl {...common} />;
  if (column.type === 'date') return <DateControl {...common} />;
  if (column.type === 'boolean') return <BooleanControl {...common} />;
  return <TextControl {...common} />;
}
