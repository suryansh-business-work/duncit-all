import { Alert, Button, Card, IconButton, Stack, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import { DuncitRichTextInput } from '@duncit/rich-text';
import type { LogBody } from './types';

interface Props {
  body: LogBody;
  error: string | null;
  saving: boolean;
  summary: string;
  onBodyChange: (body: LogBody) => void;
  onCancel: () => void;
  onErrorClose: () => void;
  onSubmit: () => void;
  onSummaryChange: (summary: string) => void;
}

export function ManualLogComposer(props: Readonly<Props>) {
  const { body, error, saving, summary, onBodyChange, onCancel, onErrorClose, onSubmit } = props;
  return (
    <Card
      variant="outlined"
      sx={(theme) => ({
        p: 2,
        borderColor: theme.palette.primary.main,
        bgcolor: alpha(theme.palette.primary.main, 0.04),
      })}
    >
      <Stack direction="row" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
          New manual log
        </Typography>
        <IconButton size="small" aria-label="Cancel" onClick={onCancel} disabled={saving}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>
      <TextField
        fullWidth
        size="small"
        label="Title (optional)"
        value={summary}
        onChange={(event) => props.onSummaryChange(event.target.value)}
        sx={{ mb: 1.5 }}
        inputProps={{ 'data-testid': 'manual-log-title' }}
      />
      <DuncitRichTextInput
        value={body.html}
        onChange={(html, text) => onBodyChange({ html, text })}
        aiContext="CRM activity note"
      />
      {error ? (
        <Alert severity="error" sx={{ mt: 1.5 }} onClose={onErrorClose}>
          {error}
        </Alert>
      ) : null}
      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 1.5 }}>
        <Button onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<SendIcon />}
          onClick={onSubmit}
          disabled={saving || !body.html.trim()}
          data-testid="manual-log-save"
        >
          {saving ? 'Saving…' : 'Save log'}
        </Button>
      </Stack>
    </Card>
  );
}
