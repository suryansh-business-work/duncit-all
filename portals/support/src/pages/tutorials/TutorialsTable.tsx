import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Avatar, Box, Chip, Stack, Typography } from '@mui/material';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import { DuncitTable, actionsColumn, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import { formatTutorialDuration } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import type { TutorialRow } from './queries';
import type { TopicOption } from './useTutorialTopics';

interface Props {
  fetchRows: TableFetch<TutorialRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  topicOptions: TopicOption[];
  labelOfTopic: (key: string) => string;
  toolbarActions?: ReactNode;
  onEdit: (row: TutorialRow) => void;
  onDelete: (row: TutorialRow) => void;
}

const getRowId = (row: TutorialRow) => row.id;

const renderTitle = (row: TutorialRow) => (
  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
    <Avatar variant="rounded" src={row.thumbnail_url || undefined} alt="" sx={{ width: 36, height: 48 }}>
      <OndemandVideoIcon fontSize="small" />
    </Avatar>
    <Box sx={{ minWidth: 0, lineHeight: 1.2 }}>
      <Typography variant="body2" noWrap component="div" sx={{ fontWeight: 600 }}>
        {row.title}
      </Typography>
      <Typography variant="caption" noWrap component="div" sx={{ color: 'text.secondary' }}>
        {row.description}
      </Typography>
    </Box>
  </Stack>
);

/** Every tutorial, with its reach (views, likes, comments) beside the authoring fields. */
export default function TutorialsTable({
  fetchRows,
  refetchRef,
  topicOptions,
  labelOfTopic,
  toolbarActions,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<TutorialRow>[]>(() => {
    const languageLabel = (row: TutorialRow) =>
      row.language === 'hi' ? t('support.tutorials.languageHindi') : t('support.tutorials.languageEnglish');
    const statusLabel = (row: TutorialRow) =>
      row.status === 'PUBLISHED' ? t('support.tutorials.statusPublished') : t('support.tutorials.statusDraft');
    return [
      {
        field: 'title',
        headerName: t('support.tutorials.colTitle'),
        type: 'text',
        flex: 1.6,
        minWidth: 260,
        cellRenderer: renderTitle,
        valueGetter: (row) => row.title,
      },
      {
        field: 'topic',
        headerName: t('support.tutorials.colTopic'),
        type: 'enum',
        options: topicOptions,
        minWidth: 150,
        valueGetter: (row) => labelOfTopic(row.topic),
      },
      {
        field: 'language',
        headerName: t('support.tutorials.colLanguage'),
        type: 'enum',
        options: [
          { value: 'en', label: t('support.tutorials.languageEnglish') },
          { value: 'hi', label: t('support.tutorials.languageHindi') },
        ],
        width: 120,
        cellRenderer: (row) => <Chip size="small" variant="outlined" label={languageLabel(row)} />,
        valueGetter: languageLabel,
      },
      {
        field: 'status',
        headerName: t('support.tutorials.colStatus'),
        type: 'enum',
        options: [
          { value: 'DRAFT', label: t('support.tutorials.statusDraft') },
          { value: 'PUBLISHED', label: t('support.tutorials.statusPublished') },
        ],
        width: 130,
        cellRenderer: (row) => (
          <Chip size="small" label={statusLabel(row)} color={row.status === 'PUBLISHED' ? 'success' : 'default'} />
        ),
        valueGetter: statusLabel,
      },
      {
        field: 'duration_sec',
        headerName: t('support.tutorials.colDuration'),
        type: 'number',
        width: 100,
        valueGetter: (row) => formatTutorialDuration(row.duration_sec),
      },
      { field: 'view_count', headerName: t('support.tutorials.colViews'), type: 'number', width: 100 },
      { field: 'like_count', headerName: t('support.tutorials.colLikes'), type: 'number', width: 100 },
      { field: 'comment_count', headerName: t('support.tutorials.colComments'), type: 'number', width: 120 },
      { field: 'sort_order', headerName: t('support.tutorials.colOrder'), type: 'number', width: 90 },
      dateColumn<TutorialRow>({ headerName: t('shell.common.created') }),
      actionsColumn<TutorialRow>({ headerName: t('shell.common.actions'), onEdit, onDelete }),
    ];
  }, [t, topicOptions, labelOfTopic, onEdit, onDelete]);

  return (
    <DuncitTable<TutorialRow>
      tableId="support-tutorials"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      toolbarActions={toolbarActions}
      emptyText={t('support.tutorials.empty')}
      defaultSort={{ field: 'sort_order', dir: 'asc' }}
      searchPlaceholder={t('support.tutorials.searchPlaceholder')}
      refetchRef={refetchRef}
    />
  );
}
