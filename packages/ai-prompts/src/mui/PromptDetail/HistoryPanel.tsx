import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RestoreIcon from '@mui/icons-material/Restore';
import { DuncitButton } from '@duncit/buttons';
import { useConfirm } from '@duncit/dialogs';
import { useDateFormat } from '@duncit/app-settings';
import type { PromptChange, PromptVersion } from '../../detailTypes';
import { useDetailCopy } from '../../i18n/useDetailCopy';
import { runInBackground } from '../../log';

interface Props {
  versions: PromptVersion[];
  restoring: boolean;
  onRestore: (version: number) => void;
}

const CHANGE_COLOR: Record<PromptChange, 'default' | 'primary' | 'secondary' | 'info'> = {
  BASELINE: 'default',
  CREATE: 'primary',
  UPDATE: 'secondary',
  SEED: 'info',
};

/**
 * Every saved state of the prompt, newest first. Each is a full snapshot, so
 * the body shown is exactly what the prompt said then, and restoring copies it
 * back as a new version — nothing is ever overwritten.
 */
export function HistoryPanel({ versions, restoring, onRestore }: Readonly<Props>) {
  const copy = useDetailCopy();
  const confirm = useConfirm();
  const { formatDateTime } = useDateFormat();

  if (versions.length === 0) return <Typography variant="body2">{copy.history.empty}</Typography>;

  const restore = async (version: number) => {
    const ok = await confirm({
      title: copy.history.restoreTitle,
      message: copy.history.restoreMessage(version),
      confirmLabel: copy.history.restore,
    });
    if (ok) onRestore(version);
  };

  return (
    <Stack spacing={1}>
      {versions.map((version, index) => (
        <Accordion key={version.version} disableGutters variant="outlined">
          <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-label={copy.history.version(version.version)}>
            <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
              <Typography variant="subtitle2">{copy.history.version(version.version)}</Typography>
              <Chip size="small" color={CHANGE_COLOR[version.change]} label={copy.history.changes[version.change]} />
              {index === 0 && <Chip size="small" variant="outlined" label={copy.history.current} />}
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {version.edited_by_name ? copy.history.by(version.edited_by_name) : copy.history.system}
                {version.created_at ? ` · ${formatDateTime(version.created_at)}` : ''}
              </Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1}>
              {version.changed_fields.length > 0 && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {copy.history.changed(version.changed_fields.join(', '))}
                </Typography>
              )}
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'monospace',
                  fontSize: (theme) => theme.typography.body2.fontSize,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                }}
              >
                {version.content}
              </Box>
              {index > 0 && (
                <Box>
                  <DuncitButton
                    size="small"
                    startIcon={<RestoreIcon />}
                    disabled={restoring}
                    onClick={() => runInBackground(restore(version.version), 'restore')}
                  >
                    {copy.history.restore}
                  </DuncitButton>
                </Box>
              )}
            </Stack>
          </AccordionDetails>
        </Accordion>
      ))}
    </Stack>
  );
}
