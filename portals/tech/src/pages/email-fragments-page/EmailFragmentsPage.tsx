import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EmailSidebarList from '../../components/EmailSidebarList';
import FillViewport from '../../components/FillViewport';
import FragmentEditorPanel from './FragmentEditorPanel';
import { useEmailFragments } from './useEmailFragments';
import { fragmentSidebarItems } from './sidebar-items';
import { useTranslation } from '@duncit/app-settings';

/**
 * Email Fragments — the header and footer that wrap a template's body, one
 * pair per email category. Editable, switchable, resettable, and there is no
 * way to add or remove one: the categories are a closed set in the server's
 * code, so a tenth fragment could never be reached.
 */
export default function EmailFragmentsPage() {
  const { t } = useTranslation();
  const f = useEmailFragments();
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');

  if (f.loading && !f.hasData) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <FillViewport>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2
        }}>
        <Box>
          <Typography variant="h5" sx={{
            fontWeight: 700
          }}>
            Email Fragments
          </Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            A header and a footer, wrapped around a template's body. Nine ship with Duncit, one per
            email category; add as many of your own as you need.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
          New fragment
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        <EmailSidebarList
          items={fragmentSidebarItems(t, f.list, f.templatesByFragment)}
          selected={f.selected}
          onSelect={f.setSelected}
          searchPlaceholder="Search category"
          emptyText={t('tech.emailFragments.noFragmentsYet')}
        />

        {f.draft ? (
          <FragmentEditorPanel
            draft={f.draft}
            setDraft={f.setDraft}
            previewHtml={f.previewHtml}
            previewErrors={f.previewErrors}
            previewLoading={f.previewLoading}
            templates={f.templatesByFragment.get(f.draft.key) ?? []}
            dirty={f.dirty}
            busy={f.busy}
            onSave={f.save}
            onReset={f.reset}
            onDelete={f.remove}
          />
        ) : (
          <Box sx={{ flex: 1, display: 'grid', placeItems: 'center' }}>
            <Typography sx={{
              color: "text.secondary"
            }}>{t('tech.emailFragments.selectACategoryFromTheLeft')}</Typography>
          </Box>
        )}
      </Stack>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('tech.emailFragments.newFragment')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label={t('shell.common.name')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('tech.emailFragments.weekendBanner')}
            helperText={t('tech.emailFragments.itsKeyIsMadeFromThe')}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>{t('shell.common.close')}</Button>
          <Button
            variant="contained"
            disabled={!newName.trim() || f.busy}
            onClick={async () => {
              await f.create(newName.trim());
              setNewName('');
              setAddOpen(false);
            }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {f.snack && (
        <Alert
          severity={f.snack.kind}
          onClose={() => f.setSnack(null)}
          sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1400 }}
        >
          {f.snack.msg}
        </Alert>
      )}
    </FillViewport>
  );
}
