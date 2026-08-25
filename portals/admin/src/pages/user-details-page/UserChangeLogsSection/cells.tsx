import { Chip, Stack, Tooltip, Typography } from '@mui/material';
import { formatDateTime } from '@duncit/app-settings';
import type { UserChangeLogRow } from '../queries';
import {
  ACTION_COLORS,
  ACTION_OPTIONS,
  ACTOR_COLORS,
  ACTOR_OPTIONS,
  SOURCE_OPTIONS,
  labelOf,
} from './options';

/** Module-scope cells, so none of them is a component defined inside another. */

/** The field, with the document path it maps to underneath. */
export const renderField = (row: UserChangeLogRow) => (
  <Stack spacing={0.25} component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="caption" component="span" sx={{
      fontWeight: 700
    }}>
      {row.field_label || row.field}
    </Typography>
    <Typography variant="caption" component="span" sx={{
      color: "text.secondary"
    }}>
      {row.field}
    </Typography>
  </Stack>
);

/** A stored value, or an em-dash when the field was empty on that side. */
function renderValue(value: string) {
  if (!value) {
    return (
      <Typography variant="caption" component="span" sx={{
        color: "text.disabled"
      }}>—
              </Typography>
    );
  }
  return (
    <Tooltip title={value}>
      <Typography variant="caption" component="span" sx={{ wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Tooltip>
  );
}

export const renderOld = (row: UserChangeLogRow) => renderValue(row.old_value);
export const renderNew = (row: UserChangeLogRow) => renderValue(row.new_value);

export const renderAction = (row: UserChangeLogRow) => (
  <Chip size="small" color={ACTION_COLORS[row.action]} label={labelOf(ACTION_OPTIONS, row.action)} />
);

export const renderActor = (row: UserChangeLogRow) => (
  <Chip
    size="small"
    variant="outlined"
    color={ACTOR_COLORS[row.actor_type]}
    label={labelOf(ACTOR_OPTIONS, row.actor_type)}
  />
);

export const renderSource = (row: UserChangeLogRow) => (
  <Chip size="small" variant="outlined" label={labelOf(SOURCE_OPTIONS, row.source)} />
);

/** Who did it: the name they are stored under, over the account id. */
export const renderActorName = (row: UserChangeLogRow) => (
  <Stack spacing={0.25} component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="caption" component="span">
      {row.actor_name || '—'}
    </Typography>
    <Typography variant="caption" component="span" sx={{
      color: "text.secondary"
    }}>
      {row.actor_user_id ?? '—'}
    </Typography>
  </Stack>
);

/** Rendered through the admin-configured date format, never a hardcoded one. */
export const whenValue = (row: UserChangeLogRow) => formatDateTime(row.created_at);

export const actorValue = (row: UserChangeLogRow) =>
  [row.actor_name, row.actor_user_id].filter(Boolean).join(' — ');
