import { useCallback, useMemo } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import { DuncitTable, useApolloTableFetch, type TableQueryState } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import { changeLogColumns } from './columns';
import {
  ENTITY_CHANGE_FEED_TABLE,
  ENTITY_CHANGE_LOGS_TABLE,
  type EntityAuditType,
  type EntityChangeLogRow,
} from './queries';

/**
 * The complete change history of one directory record — or, without an id, of
 * every record of that entity.
 *
 * One row per changed field: the server appends an entry every time a tracked
 * value moves, whoever moved it and wherever from, and never updates or deletes
 * one. So this is the whole history, not the latest state of it.
 *
 * The SAME component serves all five consoles because the trail is one
 * collection with the entity as a column — a console added later gets its
 * history by passing its type (rule 34).
 */

const getRowId = (row: EntityChangeLogRow) => row.id;

export interface ChangeLogsSectionProps {
  entityType: EntityAuditType;
  /** The record whose history to show. Omitted = every record of the entity. */
  entityId?: string;
  /** Table id for column/filter persistence — one per console + scope. */
  tableId: string;
}

export default function ChangeLogsSection({
  entityType,
  entityId,
  tableId,
}: Readonly<ChangeLogsSectionProps>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const isFeed = !entityId;

  const fetchTable = useApolloTableFetch<EntityChangeLogRow>(
    client,
    isFeed ? ENTITY_CHANGE_FEED_TABLE : ENTITY_CHANGE_LOGS_TABLE,
    isFeed ? 'entityChangeFeedTable' : 'entityChangeLogsTable',
    {
      extraVariables: isFeed
        ? { entity_type: entityType }
        : { entity_type: entityType, entity_id: entityId },
    },
    [entityType, entityId],
  );

  const fetchRows = useCallback(
    async (q: TableQueryState) => fetchTable(q),
    [fetchTable],
  );

  const columns = useMemo(() => changeLogColumns(t, isFeed), [t, isFeed]);

  return (
    <Stack spacing={2}>
      <Stack spacing={0.25}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t('directory.changeLogs.title')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('directory.changeLogs.subtitle')}
        </Typography>
      </Stack>
      <DuncitTable<EntityChangeLogRow>
        tableId={tableId}
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        emptyText={t('directory.changeLogs.empty')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder={t('directory.changeLogs.searchPlaceholder')}
      />
    </Stack>
  );
}
