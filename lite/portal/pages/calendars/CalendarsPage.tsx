import { useCallback, useMemo, useRef } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Stack, Tooltip } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { DuncitIconButton } from '@duncit/buttons';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { PageHeader } from '@duncit/ui';
import { usePortalT } from '../../../shared/i18n';
import { LITE_ADMIN_CALENDARS_TABLE, LITE_ADMIN_SET_CALENDAR_FEATURED, type LiteAdminCalendarRow } from '../../graphql/calendars';
import { useAction } from '../../hooks/useAction';
import { buildCalendarColumns, calendarRowId } from './columns';

interface ActionProps {
  row: LiteAdminCalendarRow;
  onToggle: (row: LiteAdminCalendarRow) => void;
}

function FeaturedToggle({ row, onToggle }: Readonly<ActionProps>) {
  const { t } = usePortalT();
  const vars = { vars: { name: row.name } };
  const label = row.featured ? t('litePortal.calendars.unfeature', vars) : t('litePortal.calendars.feature', vars);
  return (
    <Tooltip title={label}>
      <DuncitIconButton size="small" aria-label={label} aria-pressed={row.featured} onClick={() => onToggle(row)} data-testid={`calendar-featured-${row.id}`}>
        {row.featured ? <StarIcon fontSize="small" color="primary" /> : <StarBorderIcon fontSize="small" />}
      </DuncitIconButton>
    </Tooltip>
  );
}

export function CalendarsPage() {
  const { t } = usePortalT();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const reload = useCallback(() => refetchRef.current?.(), []);
  const run = useAction(reload);
  const fetchRows = useApolloTableFetch<LiteAdminCalendarRow>(client, LITE_ADMIN_CALENDARS_TABLE, 'liteAdminCalendarsTable');
  const [setFeatured] = useMutation(LITE_ADMIN_SET_CALENDAR_FEATURED);

  const toggle = useCallback(
    (row: LiteAdminCalendarRow) => {
      const featured = !row.featured;
      const vars = { vars: { name: row.name } };
      const done = featured ? t('litePortal.calendars.featuredOn', vars) : t('litePortal.calendars.featuredOff', vars);
      return run(() => setFeatured({ variables: { id: row.id, featured } }), done);
    },
    [run, setFeatured, t],
  );

  const columns = useMemo(() => buildCalendarColumns(t, (row) => <FeaturedToggle row={row} onToggle={toggle} />), [t, toggle]);

  return (
    <Stack spacing={2}>
      <PageHeader title={t('litePortal.calendars.title')} subtitle={t('litePortal.calendars.subtitle')} />
      <DuncitTable<LiteAdminCalendarRow>
        tableId="lite-calendars"
        ariaLabel={t('litePortal.calendars.title')}
        columns={columns}
        fetchRows={fetchRows}
        getRowId={calendarRowId}
        emptyText={t('litePortal.calendars.empty')}
        searchPlaceholder={t('litePortal.calendars.search')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        refetchRef={refetchRef}
      />
    </Stack>
  );
}
