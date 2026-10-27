import { Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { SaveState } from './useSaveCase';

interface Props {
  state: SaveState;
  /** The section has edits not saved yet. */
  dirty: boolean;
}

/** One line saying where a section's save stands — announced politely to screen readers. */
export function SaveStatus({ state, dirty }: Readonly<Props>) {
  const { t } = useTranslation();
  let text = '';
  let color = 'text.secondary';
  if (state === 'saving') text = t('testsManual.save.saving');
  else if (state === 'error') {
    text = t('testsManual.save.failed');
    color = 'error.main';
  } else if (dirty) text = t('testsManual.save.unsaved');
  else if (state === 'saved') {
    text = t('testsManual.save.saved');
    color = 'success.main';
  }
  return (
    <Typography variant="caption" role="status" aria-live="polite" sx={{ color }}>
      {text}
    </Typography>
  );
}
