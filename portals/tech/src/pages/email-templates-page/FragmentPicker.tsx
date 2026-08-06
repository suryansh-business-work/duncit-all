import { MenuItem, TextField } from '@mui/material';
import type { FragmentOption } from './queries';

interface Props {
  value: string | null | undefined;
  options: FragmentOption[];
  loading?: boolean;
  /** Message from the fragments query, when it failed. */
  error?: string | null;
  onChange: (next: string | null) => void;
}

/**
 * Which header/footer wraps this template.
 *
 * Presentational on purpose — the options are fetched once by the page's hook,
 * beside every other query it makes, rather than by a field buried in the
 * editor. A component this deep opening its own network connection is how a
 * panel ends up impossible to render in a test.
 *
 * "None" is a real choice and the default: every template that shipped before
 * fragments existed already draws its own header and footer, so turning them
 * all on at once would show two logos.
 *
 * It says WHY it is empty. A failed fragments query used to render as a
 * dropdown with one entry in it, which reads as "there is nothing to pick"
 * rather than "the list did not load" — and those need different actions.
 */
export default function FragmentPicker({
  value,
  options,
  loading = false,
  error = null,
  onChange,
}: Readonly<Props>) {
  const chosen = options.find((o) => o.key === value);

  const helper = () => {
    if (error) return `Could not load fragments: ${error}`;
    if (loading && options.length === 0) return 'Loading fragments…';
    if (options.length === 0) return 'No fragments yet — add one on the Fragments page.';
    if (!value) return 'Renders exactly as written, with nothing added.';
    if (chosen && !chosen.is_active) return 'That fragment is switched off — nothing is added.';
    return 'Its header and footer are rendered around this body.';
  };

  return (
    <TextField
      select
      size="small"
      label="Header / footer"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      sx={{ flex: '1 1 220px' }}
      error={Boolean(error)}
      helperText={helper()}
    >
      <MenuItem value="">None</MenuItem>
      {options.map((o) => (
        <MenuItem key={o.key} value={o.key}>
          {o.name}
          {!o.is_active && ' (off)'}
        </MenuItem>
      ))}
    </TextField>
  );
}
