import {
  Alert,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import CategoryCascade, {
  type CategoryLabels,
  type CategoryScope,
} from './CategoryCascade';
import { useTranslation } from '../../i18n/useTranslation';
import { testIdProps } from '../../utils/testIdProps';

interface IdeaComposerDialogProps {
  open: boolean;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  scope: CategoryScope;
  onCategoryChange: (scope: CategoryScope, labels: CategoryLabels) => void;
  error: string | null;
  creating: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export default function IdeaComposerDialog({
  open,
  title,
  setTitle,
  description,
  setDescription,
  scope,
  onCategoryChange,
  error,
  creating,
  onClose,
  onSubmit,
}: Readonly<IdeaComposerDialogProps>) {
  const { t } = useTranslation();
  return (
    <Dialog
      open={open}
      onClose={() => !creating && onClose()}
      fullWidth
      maxWidth="sm"
      data-testid="idea-composer-dialog"
    >
      <DialogTitle>{t('mweb.podIdeas.shareAPodIdea')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && (
            <Alert severity="error" data-testid="idea-composer-error">
              {error}
            </Alert>
          )}
          <TextField
            autoFocus
            label={t('mweb.common.title')}
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 160))}
            required
            fullWidth
            helperText={`${title.length} / 160`}
            data-testid="idea-composer-title"
            slotProps={{ htmlInput: testIdProps('idea-title-input') }}
          />
          <TextField
            label={t('mweb.common.description')}
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 2001))}
            required
            fullWidth
            multiline
            minRows={4}
            maxRows={10}
            helperText={`${description.length} / 2001 — describe the vibe, format, location, audience…`}
            data-testid="idea-composer-description"
            slotProps={{ htmlInput: testIdProps('idea-description-input') }}
          />
          <CategoryCascade value={scope} onChange={onCategoryChange} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={creating} data-testid="idea-composer-cancel">
          Cancel
        </DuncitButton>
        <DuncitButton
          variant="contained"
          onClick={onSubmit}
          disabled={creating}
          data-testid="idea-composer-submit"
        >
          {creating ? <CircularProgress size={20} /> : 'Submit'}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
