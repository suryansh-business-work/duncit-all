import { Chip, Stack, Tooltip, Typography } from '@mui/material';
import { formatDateTime } from '@duncit/app-settings';
import type { Translate } from '../../i18n/fallback';
import type { BrandChangeLogRow } from './queries';
import { ACTION_COLORS, ACTOR_COLORS, actionOptions, actorOptions, labelOf, sourceOptions } from './options';

/**
 * Module-scope cells, so none is a component defined inside another (S6478).
 * The ones that render copy take the translator the column builder closed over.
 */

const EMPTY = '—';

/** The fields every entity change log row shares — what the field/value cells read. */
export type ChangeLogValueRow = Pick<BrandChangeLogRow, 'field' | 'field_label' | 'old_value' | 'new_value'>;

/** The field's readable label, with the document path it maps to underneath. */
export const renderField = (row: ChangeLogValueRow) => (
  <Stack spacing={0.25} component="span">
    <Typography variant="caption" component="span" sx={{ fontWeight: 'fontWeightBold' }}>
      {row.field_label || row.field}
    </Typography>
    <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
      {row.field}
    </Typography>
  </Stack>
);

/** A stored value, or an em-dash when the field was empty on that side. */
function renderValue(value: string) {
  if (!value) {
    return (
      <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
        {EMPTY}
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

export const renderOld = (row: ChangeLogValueRow) => renderValue(row.old_value);
export const renderNew = (row: ChangeLogValueRow) => renderValue(row.new_value);

export const renderAction = (t: Translate) => (row: BrandChangeLogRow) => (
  <Chip size="small" color={ACTION_COLORS[row.action]} label={labelOf(actionOptions(t), row.action)} />
);

export const renderActor = (t: Translate) => (row: BrandChangeLogRow) => (
  <Chip
    size="small"
    variant="outlined"
    color={ACTOR_COLORS[row.actor_type]}
    label={labelOf(actorOptions(t), row.actor_type)}
  />
);

export const renderSource = (t: Translate) => (row: BrandChangeLogRow) => (
  <Chip size="small" variant="outlined" label={labelOf(sourceOptions(t), row.source)} />
);

/** Who did it: the name they are stored under, over the account id. */
export const renderActorName = (row: BrandChangeLogRow) => (
  <Stack spacing={0.25} component="span">
    <Typography variant="caption" component="span">
      {row.actor_name || EMPTY}
    </Typography>
    <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
      {row.actor_user_id ?? EMPTY}
    </Typography>
  </Stack>
);

/** Through the admin-configured date format, never a hardcoded one. */
export const whenValue = (row: BrandChangeLogRow) => formatDateTime(row.created_at);

export const actorValue = (row: BrandChangeLogRow) =>
  [row.actor_name, row.actor_user_id].filter(Boolean).join(' — ');
