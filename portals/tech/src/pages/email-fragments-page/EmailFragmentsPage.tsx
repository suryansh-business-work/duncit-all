import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import EmailSidebarList from '../../components/EmailSidebarList';
import FillViewport from '../../components/FillViewport';
import FragmentEditorPanel from './FragmentEditorPanel';
import { useEmailFragments } from './useEmailFragments';

/**
 * Email Fragments — the header and footer that wrap a template's body, one
 * pair per email category. Editable, switchable, resettable, and there is no
 * way to add or remove one: the categories are a closed set in the server's
 * code, so a tenth fragment could never be reached.
 */
export default function EmailFragmentsPage() {
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
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Email Fragments
          </Typography>
          <Typography variant="caption" color="text.secondary">
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
          items={f.list.map((fragment) => ({
            key: fragment.key,
            primary: fragment.name,
            secondary: fragment.key,
            off: !fragment.is_active,
          }))}
          selected={f.selected}
          onSelect={f.setSelected}
          searchPlaceholder="Search category"
          emptyText="No fragments yet."
        />

        {f.draft ? (
          <FragmentEditorPanel
            draft={f.draft}
            setDraft={f.setDraft}
            previewHtml={f.previewHtml}
            previewErrors={f.previewErrors}
            dirty={f.dirty}
            busy={f.busy}
            onSave={f.save}
            onReset={f.reset}
            onDelete={f.remove}
          />
        ) : (
          <Box sx={{ flex: 1, display: 'grid', placeItems: 'center' }}>
            <Typography color="text.secondary">Select a category from the left.</Typography>
          </Box>
        )}
      </Stack>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>New fragment</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Weekend banner"
            helperText="Its key is made from the name. Add the header and footer next."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Close</Button>
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
