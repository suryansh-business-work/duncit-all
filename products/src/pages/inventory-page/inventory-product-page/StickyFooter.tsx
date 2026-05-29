import { Box, Button, CircularProgress, Stack } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';

interface StickyFooterProps {
  busy: boolean;
  dirty: boolean;
  isEdit: boolean;
  onCancel: () => void;
  onSaveAndContinue: () => void;
  onSave: () => void;
}

export default function StickyFooter({
  busy,
  dirty,
  isEdit,
  onCancel,
  onSaveAndContinue,
  onSave,
}: StickyFooterProps) {
  const saveLabel = busy
    ? 'Saving…'
    : isEdit
      ? 'Save changes'
      : 'Save product';
  return (
    <Box
      sx={{
        position: 'sticky',
        bottom: 0,
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        py: 1.5,
        px: 2,
        mt: 2,
        zIndex: 2,
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        justifyContent="flex-end"
        alignItems={{ sm: 'center' }}
      >
        <Box sx={{ flex: 1, color: 'text.secondary', fontSize: 13 }}>
          {dirty ? 'You have unsaved changes' : 'All changes saved'}
        </Box>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={onSaveAndContinue} disabled={busy || !dirty}>
          Save & continue
        </Button>
        <Button
          variant="contained"
          startIcon={busy ? <CircularProgress size={16} /> : <SaveIcon />}
          onClick={onSave}
          disabled={busy}
        >
          {saveLabel}
        </Button>
      </Stack>
    </Box>
  );
}
