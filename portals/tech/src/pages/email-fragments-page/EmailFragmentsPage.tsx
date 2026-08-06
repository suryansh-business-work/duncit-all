import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import FragmentList from './FragmentList';
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

  if (f.loading && !f.hasData) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Email Fragments
        </Typography>
        <Typography variant="caption" color="text.secondary">
          One header and footer per email category. A template picks its category on the Templates
          page, and its body is rendered between the two.
        </Typography>
      </Box>

      <Stack direction="row" spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        <FragmentList list={f.list} selected={f.selected} onSelect={f.setSelected} />

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
          />
        ) : (
          <Box sx={{ flex: 1, display: 'grid', placeItems: 'center' }}>
            <Typography color="text.secondary">Select a category from the left.</Typography>
          </Box>
        )}
      </Stack>

      {f.snack && (
        <Alert
          severity={f.snack.kind}
          onClose={() => f.setSnack(null)}
          sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1400 }}
        >
          {f.snack.msg}
        </Alert>
      )}
    </Box>
  );
}
