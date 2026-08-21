import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { UPDATE_LEGAL_DOCUMENT, type LegalDocumentListItem } from '../../graphql/documents';
import { useTranslation } from '@duncit/shell';

interface Props {
  /** The row being edited; null keeps the dialog closed. */
  doc: LegalDocumentListItem | null;
  onClose: () => void;
  /** Fires after a successful save so the table can show the new values. */
  onSaved: () => void;
}

/**
 * Edit the two things a row can change from the table: its title, and whether
 * the app shows it at all.
 *
 * Everything deeper (type, description, content, versions) still belongs to the
 * document page — this dialog exists so a typo or a takedown does not cost a
 * navigation. A signed document is locked, so the server refuses the write and
 * the dialog says so up front rather than after the press.
 */
export default function EditDocumentDialog({ doc, onClose, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [active, setActive] = useState(true);
  const [error, setError] = useState('');
  const [save, { loading }] = useMutation(UPDATE_LEGAL_DOCUMENT);

  // Re-seed on every open: the dialog is one instance reused for every row.
  useEffect(() => {
    if (!doc) return;
    setTitle(doc.name);
    setActive(doc.is_active);
    setError('');
  }, [doc]);

  const locked = doc?.is_locked ?? false;
  const trimmed = title.trim();

  const apply = async () => {
    if (!trimmed) {
      setError(t('legal.documents.titleRequired'));
      return;
    }
    try {
      await save({ variables: { id: doc?.id, input: { name: trimmed, is_active: active } } });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('legal.documents.saveFailed'));
    }
  };

  return (
    <Dialog open={!!doc} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>
        Edit Document
        <Typography variant="caption" color="text.secondary" component="div">
          {doc?.document_no}
        </Typography>
        <IconButton
          onClick={onClose}
          aria-label={t('shell.common.close')}
          sx={{ position: 'absolute', right: 8, top: 8, color: 'text.secondary' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          {locked && (
            <Alert severity="info">
              This document is signed, so its details are locked. The signature is what makes it
              final — edit a clone if the wording has to change.
            </Alert>
          )}
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label={t('shell.common.title')}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError('');
            }}
            fullWidth
            required
            autoFocus
            disabled={locked}
            error={!!error && !trimmed}
            helperText={trimmed ? ' ' : 'The name this document is listed and searched by.'}
          />

          <FormControlLabel
            control={
              <Switch
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                disabled={locked}
              />
            }
            label={active ? 'Active' : 'Inactive'}
          />
          <Typography variant="caption" color="text.secondary">
            Turning this off hides the document from the app without deleting it.
          </Typography>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{t('shell.common.close')}</Button>
        <Button variant="contained" onClick={apply} disabled={loading || locked || !trimmed}>
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
}
