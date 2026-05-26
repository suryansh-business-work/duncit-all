import { Box, Chip, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import SendIcon from '@mui/icons-material/Send';
import type { CommsProvider, CommsProviderType } from './queries';

interface Props {
  providers: CommsProvider[];
  onEdit: (p: CommsProvider) => void;
  onDelete: (p: CommsProvider) => void;
  onSetDefault: (p: CommsProvider) => void;
  onTest: (p: CommsProvider) => void;
}

const TYPE_COLOURS: Record<CommsProviderType, 'primary' | 'success' | 'warning'> = {
  SMTP: 'primary',
  VOBIZ_EMAIL: 'success',
  VOBIZ_CALL: 'warning',
};

const TYPE_LABELS: Record<CommsProviderType, string> = {
  SMTP: 'SMTP',
  VOBIZ_EMAIL: 'Vobiz Email',
  VOBIZ_CALL: 'Vobiz Call',
};

export default function ProvidersTable({ providers, onEdit, onDelete, onSetDefault, onTest }: Props) {
  if (!providers.length) {
    return (
      <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="body2">No providers configured yet. Click “New provider” to add the first one.</Typography>
      </Box>
    );
  }
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Name</TableCell>
          <TableCell>Type</TableCell>
          <TableCell>From / Caller</TableCell>
          <TableCell>Default</TableCell>
          <TableCell>Active</TableCell>
          <TableCell align="right">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {providers.map((p) => {
          const fromLine = p.type === 'SMTP'
            ? p.config.from_address || p.config.user || '—'
            : p.config.caller_id || p.config.sender_email || '—';
          return (
            <TableRow key={p.id} hover>
              <TableCell>
                <Stack>
                  <Typography variant="subtitle2" fontWeight={700}>{p.name}</Typography>
                  {p.description && (
                    <Typography variant="caption" color="text.secondary" noWrap>{p.description}</Typography>
                  )}
                </Stack>
              </TableCell>
              <TableCell>
                <Chip size="small" label={TYPE_LABELS[p.type]} color={TYPE_COLOURS[p.type]} variant="outlined" />
              </TableCell>
              <TableCell>{fromLine}</TableCell>
              <TableCell>
                <Tooltip title={p.is_default ? 'Default provider for this type' : 'Set as default'}>
                  <IconButton size="small" onClick={() => !p.is_default && onSetDefault(p)} color={p.is_default ? 'warning' : 'default'}>
                    {p.is_default ? <StarIcon fontSize="small" /> : <StarOutlineIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Chip size="small" label={p.is_active ? 'Active' : 'Disabled'} color={p.is_active ? 'success' : 'default'} variant={p.is_active ? 'filled' : 'outlined'} />
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Send test">
                  <IconButton size="small" onClick={() => onTest(p)}>
                    <SendIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={() => onEdit(p)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton size="small" color="error" onClick={() => onDelete(p)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
