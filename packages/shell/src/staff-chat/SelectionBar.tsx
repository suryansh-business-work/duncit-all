import { Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';

interface Props {
  count: number;
  /** Only your own messages can be taken back for everyone. */
  allMine: boolean;
  onCopy: () => void;
  onDelete: (forEveryone: boolean) => void;
  onClear: () => void;
}

/**
 * What you can do to the messages you have picked.
 *
 * Replaces the header while a selection is live, the way every mail client
 * does: the actions belong to the selection, and leaving the normal header in
 * place would mean two toolbars competing for the same corner.
 */
export default function SelectionBar({
  count,
  allMine,
  onCopy,
  onDelete,
  onClear,
}: Readonly<Props>) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ p: 1, borderBottom: 1, borderColor: 'divider', bgcolor: 'action.selected' }}
    >
      <Tooltip title="Clear selection">
        <IconButton size="small" onClick={onClear} aria-label="Clear selection">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Typography variant="subtitle2" sx={{ flex: 1 }}>
        {count} selected
      </Typography>

      <Button size="small" startIcon={<ContentCopyIcon />} onClick={onCopy}>
        Copy
      </Button>
      <Button size="small" startIcon={<DeleteIcon />} onClick={() => onDelete(false)}>
        Hide
      </Button>
      {/* Taking a message back reaches the other person's copy, so it is only
          offered when every message picked is one you wrote. */}
      {allMine && (
        <Button size="small" color="error" onClick={() => onDelete(true)}>
          Delete for everyone
        </Button>
      )}
    </Stack>
  );
}
