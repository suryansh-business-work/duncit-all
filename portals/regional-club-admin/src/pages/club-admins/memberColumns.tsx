import { Chip, Stack, Typography } from '@mui/material';
import { actionsColumn, type DuncitColumn, type Translate } from '@duncit/table';
import type { RegionMember } from '../queries';

/** What the table's own search box matches a row against. */
export const memberSearchText = (row: RegionMember) =>
  [row.name, row.email, ...row.clubs].join(' ');

/** Who they are, over the address the manager would write to. */
function renderPerson(row: RegionMember) {
  return (
    <Stack component="span" sx={{ alignItems: 'flex-start', lineHeight: 1.2 }}>
      <Typography variant="body2" component="span" noWrap sx={{ fontWeight: 700 }}>
        {row.name || row.email}
      </Typography>
      <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
        {row.email}
      </Typography>
    </Stack>
  );
}

/**
 * The Club Admins table's columns.
 *
 * Out of the page file because the page is already the drill-down's owner, and
 * a column list that renders three cell shapes is the half of it that never
 * changes when the behaviour does.
 */
export function memberColumns(
  t: Translate,
  onRemove: (row: RegionMember) => void,
): DuncitColumn<RegionMember>[] {
  const renderClubs = (row: RegionMember) => {
    if (row.clubs.length === 0) {
      return (
        <Typography variant="caption" component="span" sx={{ color: 'warning.main' }}>
          {t('partners.regional.noClubsYet')}
        </Typography>
      );
    }
    return (
      <Stack direction="row" spacing={0.5} useFlexGap component="span" sx={{ flexWrap: 'wrap' }}>
        {row.clubs.map((club) => (
          <Chip key={club} size="small" variant="outlined" label={club} />
        ))}
      </Stack>
    );
  };

  return [
    {
      field: 'name',
      headerName: t('partners.regional.clubAdmin'),
      flex: 1,
      minWidth: 220,
      cellRenderer: renderPerson,
      valueGetter: (row) => row.name || row.email,
    },
    {
      field: 'clubs',
      headerName: t('partners.regional.clubs'),
      flex: 1,
      minWidth: 240,
      sortable: false,
      cellRenderer: renderClubs,
      valueGetter: (row) => row.clubs.join(', '),
    },
    {
      field: 'club_count',
      headerName: t('partners.regional.clubCount'),
      width: 110,
      valueGetter: (row) => row.club_count,
    },
    actionsColumn<RegionMember>({
      onDelete: onRemove,
      delete: { title: t('partners.regional.removeFromRegion') },
    }),
  ];
}
