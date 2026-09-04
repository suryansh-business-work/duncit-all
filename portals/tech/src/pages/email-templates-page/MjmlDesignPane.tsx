import { useState } from 'react';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { useGrapesMjml } from './useGrapesMjml';
import 'grapesjs/dist/css/grapes.min.css';

interface Props {
  /** The MJML the canvas opens on. */
  value: string;
  onChange: (next: string) => void;
}

/**
 * The drag-and-drop half of the editor: GrapesJS driving the SAME MJML the
 * code pane edits, so switching between them is a change of view rather than a
 * change of format.
 *
 * The canvas is built once per open. Typing in the code pane does NOT push into
 * it — that would fight the person mid-drag on every keystroke — so the two
 * panes are exchanged rather than shown together, and each takes over the
 * source when it is the one on screen.
 */
export default function MjmlDesignPane({ value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const { loading, error } = useGrapesMjml({ initialMjml: value, onChange, host });

  return (
    <Box sx={{ position: 'relative', flex: 1, minHeight: 0 }}>
      {/* The canvas mounts here whatever else is drawn: unmounting it while a
          message shows would throw away the editor the message is about. */}
      <Box
        ref={setHost}
        sx={{
          height: '100%',
          // GrapesJS ships its own chrome and measures the box it is handed;
          // the panel it draws must not inherit a MUI border radius that clips it.
          '& .gjs-cv-canvas': { top: 0 },
        }}
      />
      {loading && !error && (
        <Stack
          spacing={1}
          sx={{
            position: 'absolute',
            inset: 0,
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.paper',
          }}
        >
          <CircularProgress size={24} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('tech.emailTemplates.designerLoading')}
          </Typography>
        </Stack>
      )}
      {error && (
        <Alert
          severity="error"
          sx={{ position: 'absolute', inset: 0, m: 2, height: 'fit-content' }}
        >
          {t('tech.emailTemplates.designerFailed', { vars: { reason: error } })}
        </Alert>
      )}
    </Box>
  );
}
