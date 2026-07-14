import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { DuncitColumn } from '../types';
import type { FilterDraft } from './filterState';

type DraftPatch = Partial<FilterDraft>;
type SelectOptions = ReadonlyArray<{ value: string; label: string }>;

interface ControlProps {
  field: string;
  label: string;
  draft: FilterDraft;
  onChange: (patch: DraftPatch) => void;
}

function TextControl({ label, draft, onChange }: Readonly<ControlProps>) {
  return (
    <TextField
      label={label}
      size="small"
      fullWidth
      value={draft.text}
      onChange={(event) => onChange({ text: event.target.value })}
    />
  );
}

interface SelectControlProps extends ControlProps {
  options: SelectOptions;
}

function MultiSelectControl(props: Readonly<SelectControlProps>) {
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

function SingleSelectControl(props: Readonly<SelectControlProps>) {
  const { field, label, draft, onChange, options } = props;
  const labelId = `duncit-filter-${field}-label`;
  const handleChange = (event: SelectChangeEvent) => {
    const { value } = event.target;
    onChange({ selected: value ? [value] : [] });
  };
  return (
    <FormControl size="small" fullWidth>
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select labelId={labelId} label={label} value={draft.selected[0] ?? ''} onChange={handleChange}>
        <MenuItem value="">Any</MenuItem>
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function NumberControl({ label, draft, onChange }: Readonly<ControlProps>) {
  return (
    <Stack direction="row" spacing={1}>
      <TextField
        label={`${label} min`}
        size="small"
        type="number"
        value={draft.min}
        onChange={(event) => onChange({ min: event.target.value })}
      />
      <TextField
        label={`${label} max`}
        size="small"
        type="number"
        value={draft.max}
        onChange={(event) => onChange({ max: event.target.value })}
      />
    </Stack>
  );
}

function DateControl({ label, draft, onChange }: Readonly<ControlProps>) {
  return (
    <Stack direction="row" spacing={1}>
      <DatePicker
        label={`${label} from`}
        value={draft.from}
        onChange={(value: Date | null) => onChange({ from: value })}
        slotProps={{ textField: { size: 'small' } }}
      />
      <DatePicker
        label={`${label} to`}
        value={draft.to}
        onChange={(value: Date | null) => onChange({ to: value })}
        slotProps={{ textField: { size: 'small' } }}
      />
    </Stack>
  );
}

function BooleanControl({ field, label, draft, onChange }: Readonly<ControlProps>) {
  const labelId = `duncit-filter-${field}-label`;
  const handleChange = (event: SelectChangeEvent) => {
    onChange({ bool: event.target.value as FilterDraft['bool'] });
  };
  return (
    <FormControl size="small" fullWidth>
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select labelId={labelId} label={label} value={draft.bool} onChange={handleChange}>
        <MenuItem value="">Any</MenuItem>
        <MenuItem value="true">Yes</MenuItem>
        <MenuItem value="false">No</MenuItem>
      </Select>
    </FormControl>
  );
}

/** One labelled control per filterable column, driven by the column's filter.type. */
export function FilterControl<T>(
  props: Readonly<{
    column: DuncitColumn<T>;
    draft: FilterDraft;
    onChange: (patch: DraftPatch) => void;
  }>,
) {
  const { column, draft, onChange } = props;
  const { filter, field, headerName } = column;
  if (!filter) return null;
  const common = { field, label: headerName, draft, onChange };
  if (filter.type === 'text') return <TextControl {...common} />;
  if (filter.type === 'select') {
    if (filter.multiple) return <MultiSelectControl {...common} options={filter.options} />;
    return <SingleSelectControl {...common} options={filter.options} />;
  }
  if (filter.type === 'number') return <NumberControl {...common} />;
  if (filter.type === 'date') return <DateControl {...common} />;
  return <BooleanControl {...common} />;
}
