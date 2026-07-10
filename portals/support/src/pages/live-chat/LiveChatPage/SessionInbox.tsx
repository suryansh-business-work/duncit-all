import { Box, IconButton, Stack, TablePagination, TextField, Typography } from '@mui/material';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import type { SupportChatSession, SupportChatStatus } from '../../../graphql/supportChat';
import SessionList from '../SessionList';
import SessionFilter from './SessionFilter';

const LIST_WIDTH = 220;

interface Props {
  statusFilter: SupportChatStatus;
  onStatusChange: (status: SupportChatStatus) => void;
  searchInput: string;
  onSearchChange: (value: string) => void;
  sessions: SupportChatSession[];
  loading: boolean;
  selectedId: string | null;
  freshIds: Set<string>;
  emptyLabel: string;
  onSelect: (id: string) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onCreateUser: () => void;
}

/** The left rail of the live-chat console: filter, search, session list + paging. */
export default function SessionInbox({
  statusFilter,
  onStatusChange,
  searchInput,
  onSearchChange,
  sessions,
  loading,
  selectedId,
  freshIds,
  emptyLabel,
  onSelect,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  onCreateUser,
}: Readonly<Props>) {
  return (
    <Box
      sx={{
        width: LIST_WIDTH,
        flexShrink: 0,
        borderRight: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ pr: 0.5 }}>
        <Typography variant="overline" sx={{ px: 1.5, pt: 1, display: 'block', fontWeight: 800 }}>
          Chat with Us
        </Typography>
        <IconButton size="small" aria-label="Create user account" onClick={onCreateUser}>
          <PersonAddAlt1Icon fontSize="small" />
        </IconButton>
      </Stack>
      <SessionFilter value={statusFilter} onChange={onStatusChange} />
      <Box sx={{ px: 1, pb: 0.5 }}>
        <TextField
          size="small"
          fullWidth
          label="Search"
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <SessionList
          sessions={sessions}
          loading={loading}
          selectedId={selectedId}
          freshIds={freshIds}
          emptyLabel={emptyLabel}
          onSelect={onSelect}
        />
      </Box>
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_e, p) => onPageChange(p)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(e) => onPageSizeChange(Number.parseInt(e.target.value, 10))}
        rowsPerPageOptions={[10, 25, 50]}
        sx={{ flexShrink: 0, borderTop: 1, borderColor: 'divider', '.MuiTablePagination-toolbar': { pl: 1 } }}
      />
    </Box>
  );
}
