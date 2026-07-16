import { useMemo, type MutableRefObject } from 'react';
import { Avatar, Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ShareIcon from '@mui/icons-material/Share';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import { STATUS_COLOR_MAP, statusIcon, type IdeaRow, type Status } from './queries';

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
    <Typography variant="body2" fontWeight={600} noWrap component="div">
      {it.title}
    </Typography>
    <Typography variant="caption" color="text.secondary" noWrap component="div">
      {it.description}
    </Typography>
  </Box>
);

const renderAuthor = (it: IdeaRow) => (
  <Stack direction="row" spacing={1} alignItems="center" component="span">
    <Avatar src={it.author?.profile_photo || undefined} sx={{ width: 28, height: 28 }}>
      {(it.author?.first_name?.[0] ?? 'U').toUpperCase()}
    </Avatar>
    <Box sx={{ minWidth: 0, lineHeight: 1.2 }}>
      <Typography variant="body2" fontWeight={500} noWrap component="div">
        {it.author?.full_name ?? '—'}
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap component="div">
        {it.author?.email ?? ''}
      </Typography>
    </Box>
  </Stack>
);

const renderEngagement = (it: IdeaRow) => (
  <Stack direction="row" spacing={1} sx={{ color: 'text.secondary', fontSize: 12 }} component="span">
    <Tooltip title="Likes">
      <Stack direction="row" spacing={0.5} alignItems="center" component="span">
        <FavoriteIcon fontSize="inherit" />
        <span>{it.likes_count}</span>
      </Stack>
    </Tooltip>
    <Tooltip title="Comments">
      <Stack direction="row" spacing={0.5} alignItems="center" component="span">
        <ChatBubbleOutlineIcon fontSize="inherit" />
        <span>{it.comments_count}</span>
      </Stack>
    </Tooltip>
    <Tooltip title="Shares">
      <Stack direction="row" spacing={0.5} alignItems="center" component="span">
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
  const columns = useMemo<DuncitColumn<IdeaRow>[]>(() => {
    const renderActions = (it: IdeaRow) => (
      <Stack direction="row" justifyContent="flex-end" component="span">
        <Tooltip title="View">
          <IconButton size="small" onClick={() => onView(it.id)}>
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {it.status !== 'APPROVED' && (
          <Tooltip title="Approve">
            <IconButton size="small" color="success" onClick={() => onSetStatus(it.id, 'APPROVED')}>
              <CheckCircleIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {it.status !== 'REJECTED' && (
          <Tooltip title="Reject">
            <IconButton size="small" color="warning" onClick={() => onSetStatus(it.id, 'REJECTED')}>
              <CancelIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={() => onDelete(it)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    );
    return [
      {
        field: 'title',
        headerName: 'Idea',
        flex: 1.4,
        minWidth: 240,
        cellRenderer: renderIdea,
        valueGetter: (it) => it.title,
      },
      {
        field: 'author',
        headerName: 'Author',
        sortable: false,
        minWidth: 200,
        cellRenderer: renderAuthor,
        valueGetter: (it) => it.author?.full_name ?? '—',
      },
      {
        field: 'engagement',
        headerName: 'Engagement',
        sortable: false,
        width: 150,
        cellRenderer: renderEngagement,
        valueGetter: (it) => `${it.likes_count} likes · ${it.comments_count} comments · ${it.shares_count} shares`,
      },
      {
        field: 'status',
        headerName: 'Status',
        filter: { type: 'select', options: STATUS_FILTER_OPTIONS },
        width: 140,
        cellRenderer: renderStatus,
        valueGetter: (it) => it.status,
      },
      {
        field: 'created_at',
        headerName: 'Created',
        filter: { type: 'date' },
        width: 170,
        valueGetter: (it) => (it.created_at ? new Date(it.created_at).toLocaleString() : '—'),
      },
      { field: 'actions', headerName: 'Actions', sortable: false, width: 170, cellRenderer: renderActions },
    ];
  }, [onView, onSetStatus, onDelete]);

  return (
    <DuncitTable<IdeaRow>
      tableId="admin-pod-ideas"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getIdeaRowId}
      emptyText="No pod ideas match the current filters."
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search title or description"
      refetchRef={refetchRef}
    />
  );
}
