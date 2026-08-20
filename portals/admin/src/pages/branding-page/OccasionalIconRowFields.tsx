import { IconButton, MenuItem, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { FALLBACK_ICON_NAMES } from '@duncit/fallback-icons';
import { toLocalDateTimeInput } from '@duncit/datetime';
import LocalDateTimeField from '../../components/LocalDateTimeField';
import MediaPickerField from '../../components/MediaPickerField';
import type { OccasionalIconRow } from './queries';

/** The local `YYYY-MM-DDTHH:mm` draft shape these rows keep. Re-exported
 * because the branding page reads it from here; the implementation is shared
 * with the settings screen, which keeps the same kind of draft state. */
export const toLocalInput = toLocalDateTimeInput;

interface Props {
  row: OccasionalIconRow;
  index: number;
  bundledSlugs: readonly string[];
  onChange: (index: number, patch: Partial<OccasionalIconRow>) => void;
  onRemove: (index: number) => void;
}

/** One occasion window. The slug must match the native app's bundled asset
 * folder (assets/occasions/<slug>/icon.png) for the offline icon to be used. */
export default function OccasionalIconRowFields({
  row,
  index,
  bundledSlugs,
  onChange,
  onRemove,
}: Readonly<Props>) {
  const slug = row.slug.trim().toLowerCase();
  const bundled = bundledSlugs.includes(slug);
  const badWindow =
    !!row.starts_at && !!row.ends_at && new Date(row.ends_at) < new Date(row.starts_at);

  return (
    <Stack spacing={1.5} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
        <TextField
          label="Slug"
          value={row.slug}
          onChange={(e) => onChange(index, { slug: e.target.value })}
          fullWidth
          error={!slug}
          helperText={
            bundled
              ? 'Matches a bundled app icon — used offline, no network needed.'
              : 'No bundled app icon for this slug; the app will load the URL below.'
          }
        />
        <TextField
          label="Label"
          value={row.label}
          onChange={(e) => onChange(index, { label: e.target.value })}
          fullWidth
          helperText="Shown to admins only."
        />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <LocalDateTimeField
          label="Starts at"
          value={toLocalInput(row.starts_at)}
          onChange={(starts_at) => onChange(index, { starts_at })}
        />
        <LocalDateTimeField
          label="Ends at"
          value={toLocalInput(row.ends_at)}
          onChange={(ends_at) => onChange(index, { ends_at })}
          error={badWindow}
          helperText={badWindow ? 'Ends before it starts — this row will be dropped.' : ' '}
        />
      </Stack>

      <MediaPickerField
        label="Icon (used by mWeb, portals and any app without bundled art)"
        value={row.icon_url}
        onChange={(url) => onChange(index, { icon_url: url })}
        folder="/branding/occasions"
        accept="image/*"
        helperText="Square transparent PNG/SVG, ~96×96px."
      />

      <TextField
        select
        label="Fallback icon"
        value={row.fallback_icon || 'occasion'}
        onChange={(e) => onChange(index, { fallback_icon: e.target.value })}
        fullWidth
        helperText="Bundled artwork each app renders if the icon above is blank or fails to load."
      >
        {FALLBACK_ICON_NAMES.map((name) => (
          <MenuItem key={name} value={name}>
            {name}
          </MenuItem>
        ))}
      </TextField>

      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={2} alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <Switch
              checked={row.is_active}
              onChange={(_, v) => onChange(index, { is_active: v })}
            />
            <Typography variant="body2">{row.is_active ? 'Active' : 'Paused'}</Typography>
          </Stack>
          <TextField
            label="Priority"
            type="number"
            value={row.sort_order}
            onChange={(e) => onChange(index, { sort_order: Number(e.target.value) || 0 })}
            sx={{ maxWidth: 130 }}
            helperText="Higher wins on overlap"
          />
        </Stack>
        <Tooltip title="Remove occasion">
          <IconButton onClick={() => onRemove(index)} color="error">
            <DeleteOutlineIcon />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}
