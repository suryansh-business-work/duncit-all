import { MenuItem, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { FALLBACK_ICON_NAMES } from '@duncit/fallback-icons';
import { toLocalDateTimeInput } from '@duncit/datetime';
import LocalDateTimeField from '../../components/LocalDateTimeField';
import MediaPickerField from '../../components/MediaPickerField';
import type { OccasionalIconRow } from './queries';
import { useTranslation } from '@duncit/shell';

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
  const { t } = useTranslation();
  const slug = row.slug.trim().toLowerCase();
  const bundled = bundledSlugs.includes(slug);
  const badWindow =
    !!row.starts_at && !!row.ends_at && new Date(row.ends_at) < new Date(row.starts_at);

  return (
    <Stack spacing={1.5} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{
        alignItems: "flex-start"
      }}>
        <TextField
          label={t('admin.policies.slug')}
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
          label={t('admin.branding.occasionLabel')}
          value={row.label}
          onChange={(e) => onChange(index, { label: e.target.value })}
          fullWidth
          helperText={t('admin.settings.adminsOnly')}
        />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <LocalDateTimeField
          label={t('admin.branding.startsAt')}
          value={toLocalInput(row.starts_at)}
          onChange={(starts_at) => onChange(index, { starts_at })}
        />
        <LocalDateTimeField
          label={t('admin.branding.endsAt')}
          value={toLocalInput(row.ends_at)}
          onChange={(ends_at) => onChange(index, { ends_at })}
          error={badWindow}
          helperText={badWindow ? 'Ends before it starts — this row will be dropped.' : ' '}
        />
      </Stack>

      <MediaPickerField
        label={t('admin.branding.occasionIcon')}
        value={row.icon_url}
        onChange={(url) => onChange(index, { icon_url: url })}
        folder="/branding/occasions"
        accept="image/*"
        helperText={t('admin.branding.iconHintShort')}
      />

      <TextField
        select
        label={t('admin.branding.fallbackIcon')}
        value={row.fallback_icon || 'occasion'}
        onChange={(e) => onChange(index, { fallback_icon: e.target.value })}
        fullWidth
        helperText={t('admin.branding.fallbackHint')}
      >
        {FALLBACK_ICON_NAMES.map((name) => (
          <MenuItem key={name} value={name}>
            {name}
          </MenuItem>
        ))}
      </TextField>

      <Stack
        direction="row"
        spacing={2}
        sx={{
          alignItems: "center",
          justifyContent: "space-between"
        }}>
        <Stack direction="row" spacing={2} sx={{
          alignItems: "center"
        }}>
          <Stack direction="row" spacing={1} sx={{
            alignItems: "center"
          }}>
            <Switch
              checked={row.is_active}
              onChange={(_, v) => onChange(index, { is_active: v })}
            />
            <Typography variant="body2">{row.is_active ? t('admin.profile.active') : 'Paused'}</Typography>
          </Stack>
          <TextField
            label={t('admin.branding.priority')}
            type="number"
            value={row.sort_order}
            onChange={(e) => onChange(index, { sort_order: Number(e.target.value) || 0 })}
            sx={{ maxWidth: 130 }}
            helperText={t('admin.branding.priorityHint')}
          />
        </Stack>
        <Tooltip title={t('admin.branding.removeOccasion')}>
          <DuncitIconButton onClick={() => onRemove(index)} color="error">
            <DeleteOutlineIcon />
          </DuncitIconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}
