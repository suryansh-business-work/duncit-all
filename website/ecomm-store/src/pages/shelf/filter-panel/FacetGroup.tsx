import { useId } from 'react';
import { Checkbox, FormControlLabel, FormGroup, Stack, Typography } from '@mui/material';

export interface FacetOption {
  value: string;
  label: string;
  count: number;
  selected: boolean;
}

interface FacetGroupProps {
  title: string;
  options: FacetOption[];
  onToggle: (value: string) => void;
}

/** One titled group of checkboxes, each with its result count. */
export function FacetGroup({ title, options, onToggle }: Readonly<FacetGroupProps>) {
  const headingId = useId();
  if (options.length === 0) return null;
  return (
    <Stack spacing={0.5} component="fieldset" sx={{ border: 0, p: 0, m: 0 }} aria-labelledby={headingId}>
      <Typography id={headingId} component="legend" variant="subtitle1" sx={{ fontWeight: 800 }}>
        {title}
      </Typography>
      <FormGroup>
        {options.map((option) => (
          <FormControlLabel
            key={option.value}
            control={<Checkbox checked={option.selected} onChange={() => onToggle(option.value)} size="small" />}
            label={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
                <Typography variant="body2">{option.label}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {`(${option.count})`}
                </Typography>
              </Stack>
            }
            sx={{ minHeight: 40 }}
          />
        ))}
      </FormGroup>
    </Stack>
  );
}
