import { useMemo, type MutableRefObject } from 'react';
import { Avatar, Box, Stack, Tooltip, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlined';
import ShareIcon from '@mui/icons-material/Share';
import { DuncitIconButton } from '@duncit/buttons';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import { STATUS_COLOR_MAP, statusIcon, type IdeaRow, type Status } from './queries';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';

interface Props {
  fetchRows: TableFetch<IdeaRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onView: (id: string) => void;
  onSetStatus: (id: string, status: Status) => void;
  onDelete: (idea: IdeaRow) => void;
}

const STATUS_FILTER_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED'].map((s) => ({ value: s, label: s }));

const getIdeaRowId = (it: IdeaRow) => it.id;

const renderIdea = (it: IdeaRow) => (
  <Box sx={{ minWidth: 0, lineHeight: 1.2 }}>
    <Typography variant="body2" noWrap component="div" sx={{
      fontWeight: 600
    }}>
      {it.title}
    </Typography>
    <Typography variant="caption" noWrap component="div" sx={{
      color: "text.secondary"
    }}>
      {it.description}
    </Typography>
  </Box>
);

const renderAuthor = (it: IdeaRow) => (
  <Stack direction="row" spacing={1} component="span" sx={{
    alignItems: "center"
  }}>
    <Avatar src={it.author?.profile_photo || undefined} sx={{ width: 28, height: 28 }}>
      {(it.author?.first_name?.[0] ?? 'U').toUpperCase()}
    </Avatar>
    <Box sx={{ minWidth: 0, lineHeight: 1.2 }}>
      <Typography variant="body2" noWrap component="div" sx={{
        fontWeight: 500
      }}>
        {it.author?.full_name ?? '—'}
      </Typography>
      <Typography variant="caption" noWrap component="div" sx={{
        color: "text.secondary"
      }}>
        {it.author?.email ?? ''}
      </Typography>
    </Box>
  </Stack>
);

type Translate = ReturnType<typeof useTranslation>['t'];

const renderEngagement = (it: IdeaRow, t: Translate) => (
  <Stack direction="row" spacing={1} sx={{ color: 'text.secondary', fontSize: 12 }} component="span">
    <Tooltip title={t('admin.podIdeas.colLikes')}>
      <Stack direction="row" spacing={0.5} component="span" sx={{
        alignItems: "center"
      }}>
        <FavoriteIcon fontSize="inherit" />
        <span>{it.likes_count}</span>
      </Stack>
    </Tooltip>
    <Tooltip title={t('admin.podIdeas.colComments')}>
      <Stack direction="row" spacing={0.5} component="span" sx={{
        alignItems: "center"
      }}>
        <ChatBubbleOutlineIcon fontSize="inherit" />
        <span>{it.comments_count}</span>
      </Stack>
    </Tooltip>
    <Tooltip title={t('admin.podIdeas.colShares')}>
      <Stack direction="row" spacing={0.5} component="span" sx={{
        alignItems: "center"
      }}>
        <ShareIcon fontSize="inherit" />
        <span>{it.shares_count}</span>
      </Stack>
    </Tooltip>
  </Stack>
);

const renderStatus = (it: IdeaRow) => (
  <StatusChip status={it.status} icon={statusIcon(it.status)} fallbackColor="warning" colorMap={STATUS_COLOR_MAP} />
);

export default function IdeasTable({ fetchRows, refetchRef, onView, onSetStatus, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<IdeaRow>[]>(() => {
    const renderActions = (it: IdeaRow) => (
      <Stack direction="row" component="span" sx={{
        justifyContent: "flex-end"
      }}>
        <Tooltip title={t('shell.common.view')}>
          <DuncitIconButton size="small" onClick={() => onView(it.id)}>
            <VisibilityIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
        {it.status !== 'APPROVED' && (
          <Tooltip title={t('admin.podIdeas.approve')}>
            <DuncitIconButton size="small" color="success" onClick={() => onSetStatus(it.id, 'APPROVED')}>
              <CheckCircleIcon fontSize="small" />
            </DuncitIconButton>
          </Tooltip>
        )}
        {it.status !== 'REJECTED' && (
          <Tooltip title={t('admin.podIdeas.reject')}>
            <DuncitIconButton size="small" color="warning" onClick={() => onSetStatus(it.id, 'REJECTED')}>
              <CancelIcon fontSize="small" />
            </DuncitIconButton>
          </Tooltip>
        )}
        <Tooltip title={t('shell.common.delete')}>
          <DuncitIconButton size="small" color="error" onClick={() => onDelete(it)}>
            <DeleteIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      </Stack>
    );
    return [
      {
        field: 'title',
        headerName: t('admin.podIdeas.colIdea'),
        flex: 1.4,
        minWidth: 240,
        cellRenderer: renderIdea,
        valueGetter: (it) => it.title,
      },
      {
        field: 'author',
        headerName: t('admin.podIdeas.colAuthor'),
        sortable: false,
        minWidth: 200,
        cellRenderer: renderAuthor,
        valueGetter: (it) => it.author?.full_name ?? '—',
      },
      {
        field: 'engagement',
        headerName: t('admin.podIdeas.colEngagement'),
        sortable: false,
        width: 150,
        cellRenderer: (row: IdeaRow) => renderEngagement(row, t),
        valueGetter: (it) => `${it.likes_count} likes · ${it.comments_count} comments · ${it.shares_count} shares`,
      },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        filter: { type: 'select', options: STATUS_FILTER_OPTIONS },
        width: 140,
        cellRenderer: renderStatus,
        valueGetter: (it) => it.status,
      },
      {
        field: 'created_at',
        headerName: t('shell.common.created'),
        filter: { type: 'date' },
        width: 170,
        valueGetter: (it) => (it.created_at ? formatDateTime(it.created_at) : '—'),
      },
      { field: 'actions', headerName: t('shell.common.actions'), sortable: false, width: 170, cellRenderer: renderActions },
    ];
  }, [onView, onSetStatus, onDelete]);

  return (
    <DuncitTable<IdeaRow>
      tableId="admin-pod-ideas"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getIdeaRowId}
      emptyText={t('admin.podIdeas.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search title or description"
      refetchRef={refetchRef}
    />
  );
}
