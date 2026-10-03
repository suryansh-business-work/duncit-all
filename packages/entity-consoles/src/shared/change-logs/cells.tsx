import { Chip, Stack, Typography } from '@mui/material';
import { formatDateTime } from '@duncit/app-settings';
import type { EntityChangeLogRow } from './queries';
import {
  ACTION_COLORS,
  ACTOR_COLORS,
  actionOptions,
  actorOptions,
  labelOf,
  sourceOptions,
} from './options';

/**
 * Module-scope cells, so none of them is a component defined inside another
 * (S6478). Each takes the row and, where it renders copy, the translator the
 * column builder closed over.
 */

type Translate = (key: string) => string;

const EMPTY = '—';

// The field and old/new value cells are the shell's (the brand log draws the
// same columns) — one copy, so the two trails can never look different.
export {
  renderChangeLogField as renderField,
  renderChangeLogNew as renderNew,
  renderChangeLogOld as renderOld,
} from '@duncit/shell';

export const renderAction = (t: Translate) => (row: EntityChangeLogRow) => (
  <Chip
    size="small"
    color={ACTION_COLORS[row.action]}
    label={labelOf(actionOptions(t), row.action)}
  />
);

export const renderActor = (t: Translate) => (row: EntityChangeLogRow) => (
  <Chip
    size="small"
    variant="outlined"
    color={ACTOR_COLORS[row.actor_type]}
    label={labelOf(actorOptions(t), row.actor_type)}
  />
);

export const renderSource = (t: Translate) => (row: EntityChangeLogRow) => (
  <Chip size="small" variant="outlined" label={labelOf(sourceOptions(t), row.source)} />
);

/** Who did it: the name they are stored under, over the account id. */
export const renderActorName = (row: EntityChangeLogRow) => (
  <Stack spacing={0.25} component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="caption" component="span">
      {row.actor_name || EMPTY}
    </Typography>
    <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
      {row.actor_user_id ?? EMPTY}
    </Typography>
  </Stack>
);

/** The record the row belongs to — only shown on the console-wide feed. */
export const renderEntity = (row: EntityChangeLogRow) => (
  <Stack spacing={0.25} component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="caption" component="span" sx={{ fontWeight: 700 }}>
      {row.entity_label || EMPTY}
    </Typography>
    <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
      {row.entity_id}
    </Typography>
  </Stack>
);

/** Rendered through the admin-configured date format, never a hardcoded one. */
export const whenValue = (row: EntityChangeLogRow) => formatDateTime(row.created_at);

export const actorValue = (row: EntityChangeLogRow) =>
  [row.actor_name, row.actor_user_id].filter(Boolean).join(' — ');
