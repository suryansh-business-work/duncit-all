import { useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PersonIcon from '@mui/icons-material/Person';
import EventNoteIcon from '@mui/icons-material/EventNote';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import { useTranslation } from '@duncit/app-settings';
import { PageHeader, StatCard } from '@duncit/ui';
import type { DirectoryCounts, DirectoryEntity, DirectorySpec, DirectoryTile } from './types';

/**
 * The icon that identifies each console. Kept here rather than on the spec
 * because a spec is data the server could one day send, and a React element
 * is not.
 */
const ENTITY_ICON: Record<DirectoryEntity, React.ReactNode> = {
  venues: <StorefrontIcon />,
  clubs: <GroupsIcon />,
  clubAdmins: <SupervisorAccountIcon />,
  hosts: <PersonIcon />,
  pods: <EventNoteIcon />,
};

/**
 * Where a tile leads: the list, already filtered to what the tile counted.
 *
 * Undefined when there is no list route yet, which is what makes the tile
 * render as a plain figure rather than a link to nowhere.
 */
function tileHref(listPath: string | undefined, listQuery: string | null): string | undefined {
  if (!listPath) return undefined;
  if (!listQuery) return listPath;
  return `${listPath}?${listQuery}`;
}

/** Theme colour path for a tile's value, by tone. */
const TONE_COLOR = {
  primary: 'primary.main',
  success: 'success.main',
  warning: 'warning.main',
  error: 'error.main',
} as const;

interface TileProps {
  tile: DirectoryTile;
  /** The tile's own number, or null while it is still being fetched. */
  count: number | null;
  loading: boolean;
  icon: React.ReactNode;
  /** Where the tile leads, or undefined while the list does not exist yet. */
  to?: string;
  label: string;
  hint: string;
}

/**
 * One tile. Hoisted to module scope rather than declared inside the dashboard
 * (S6478), and given its resolved label and hint as props so the parent
 * translates once per render instead of once per tile.
 */
function DirectoryStatTile({ tile, count, loading, icon, to, label, hint }: Readonly<TileProps>) {
  return (
    <StatCard
      label={label}
      value={count ?? 0}
      loading={loading}
      icon={icon}
      iconColor={TONE_COLOR[tile.tone]}
      valueColor={TONE_COLOR[tile.tone]}
      hint={hint}
      to={to}
      sx={{ flex: '1 1 180px', minWidth: 180 }}
    />
  );
}

export interface EntityDashboardProps {
  spec: DirectorySpec;
  /**
   * Route the list lives at, e.g. `/venues`. Omitted while a console ships its
   * dashboard ahead of its list: the tiles then report the numbers without
   * pretending to be a way in, which beats four tiles that navigate nowhere.
   */
  listPath?: string;
}

/**
 * A directory console's brief: how many of this entity there are, and where
 * they stand.
 *
 * ONE component for every console. The numbers come from the spec's single
 * aliased counts document, so every tile on screen counted the same moment,
 * and a tile is a way into the list already filtered to what it counted —
 * which is the only reason a number on a dashboard is worth showing.
 */
export default function EntityDashboard({ spec, listPath }: Readonly<EntityDashboardProps>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<DirectoryCounts>(spec.countsDocument, {
    fetchPolicy: 'cache-and-network',
  });

  const icon = ENTITY_ICON[spec.entity];
  // Resolved once here rather than inside the tile: the copy is the same for
  // every tile that is a way in, and `t` is a hook call the tile must not make
  // per instance.
  const filteredHint = t('directory.common.openFiltered');
  const listHint = t('directory.common.openList');

  return (
    <Stack spacing={2}>
      <PageHeader title={t(spec.titleKey)} subtitle={t(spec.subtitleKey)} />

      {error ? <Alert severity="error">{error.message}</Alert> : null}

      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {spec.tiles.map((tile) => {
          const bucket = data?.[tile.key];
          return (
            <DirectoryStatTile
              key={tile.key}
              tile={tile}
              count={bucket ? bucket.total : null}
              loading={loading && !data}
              icon={icon}
              to={tileHref(listPath, tile.listQuery)}
              label={t(tile.labelKey)}
              hint={tile.listQuery ? filteredHint : listHint}
            />
          );
        })}
      </Stack>
    </Stack>
  );
}
