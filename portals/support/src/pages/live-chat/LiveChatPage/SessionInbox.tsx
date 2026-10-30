import { Box, InputAdornment, Stack, TablePagination, TextField, Typography } from '@mui/material';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import SearchIcon from '@mui/icons-material/Search';
import { DuncitIconButton } from '@duncit/buttons';
import type { SupportChatSession, SupportChatStatus } from '../../../graphql/supportChat';
import SessionList from '../SessionList';
import SessionFilter from './SessionFilter';
import { useTranslation } from '@duncit/shell';

const LIST_WIDTH = 300;

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
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        width: LIST_WIDTH,
        flexShrink: 0,
        borderRight: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          pt: 1.5,
          pb: 0.5
        }}>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 800 }}>
          {t('shell.nav.chatWithUs')}
        </Typography>
        <DuncitIconButton size="small" aria-label={t('support.createUser.title')} onClick={onCreateUser} data-testid="live-chat-create-user">
          <PersonAddAlt1Icon fontSize="small" />
        </DuncitIconButton>
      </Stack>
      <SessionFilter value={statusFilter} onChange={onStatusChange} />
      <Box sx={{ px: 1.5, py: 1.25 }}>
        <TextField
          size="small"
          fullWidth
          placeholder={t('support.chat.search')}
          slotProps={{
            htmlInput: { 'aria-label': t('support.chat.search'), 'data-testid': 'live-chat-search' },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
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
        sx={{
          flexShrink: 0,
          borderTop: 1,
          borderColor: 'divider',
          '.MuiTablePagination-toolbar': { pl: 1.5, pr: 0.5, minHeight: 44 },
          '.MuiTablePagination-spacer': { display: 'none' },
          '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': { typography: 'caption' },
          '.MuiTablePagination-input': { ml: 0.5, mr: 1 },
          '.MuiTablePagination-actions': { ml: 'auto' },
        }}
      />
    </Box>
  );
}
