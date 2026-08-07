import { Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import type { useMessageSelection } from './useMessageSelection';

interface Props {
  /** The live selection, straight from useMessageSelection. */
  selection: ReturnType<typeof useMessageSelection>;
}

/**
 * What you can do to the messages you have picked.
 *
 * Replaces the header while a selection is live, the way every mail client
 * does: the actions belong to the selection, and leaving the normal header in
 * place would mean two toolbars competing for the same corner.
 */
export default function SelectionBar({ selection }: Readonly<Props>) {
  const { selected, allMine, copy, remove, clear } = selection;
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ p: 1, borderBottom: 1, borderColor: 'divider', bgcolor: 'action.selected' }}
    >
      <Tooltip title="Clear selection">
        <IconButton size="small" onClick={clear} aria-label="Clear selection">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Typography variant="subtitle2" sx={{ flex: 1 }}>
        {selected.length} selected
      </Typography>

      <Button size="small" startIcon={<ContentCopyIcon />} onClick={copy}>
        Copy
      </Button>
      <Button size="small" startIcon={<DeleteIcon />} onClick={() => remove(false)}>
        Hide
      </Button>
      {/* Taking a message back reaches the other person's copy, so it is only
          offered when every message picked is one you wrote. */}
      {allMine && (
        <Button size="small" color="error" onClick={() => remove(true)}>
          Delete for everyone
        </Button>
      )}
    </Stack>
  );
}
