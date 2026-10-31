import { useState } from 'react';
import { List, ListItem, ListItemText, Stack, TextField, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { LEAD_LIMITS } from '../copy';
import type { MarketingLeadNote } from '../queries';

interface Props {
  notes: readonly MarketingLeadNote[];
  busy: boolean;
  /** True when the note was kept — only then is the box cleared. */
  onAdd: (text: string) => Promise<boolean>;
}

/** What was said and what to do next, newest first, and a box for the next one. */
export default function LeadNotes({ notes, busy, onAdd }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const trimmed = text.trim();
  const error = (() => {
    if (!trimmed) return t('marketing.leads.noteRequired');
    if (trimmed.length > LEAD_LIMITS.note) return t('marketing.leads.noteTooLong', { vars: { max: LEAD_LIMITS.note } });
    return '';
  })();

  const add = async () => {
    setTouched(true);
    if (error) return;
    if (await onAdd(trimmed)) {
      setText('');
      setTouched(false);
    }
  };

  return (
    <Stack spacing={1} data-testid="lead-notes">
      <Typography variant="subtitle2">{t('marketing.leads.notesTitle')}</Typography>
      <TextField
        fullWidth
        multiline
        minRows={2}
        label={t('marketing.leads.noteField')}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => setTouched(true)}
        error={touched && error !== ''}
        helperText={touched && error ? error : t('marketing.leads.noteHint')}
      />
      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <DuncitButton size="small" variant="outlined" onClick={add} loading={busy} data-testid="lead-add-note">
          {t('marketing.leads.addNote')}
        </DuncitButton>
      </Stack>
      {notes.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('marketing.leads.noNotes')}
        </Typography>
      ) : (
        <List dense disablePadding>
          {[...notes].reverse().map((note) => (
            <ListItem key={`${note.at ?? ''}-${note.text}`} disableGutters alignItems="flex-start">
              <ListItemText
                primary={note.text}
                secondary={[note.by_name, note.at ? formatDateTime(note.at) : ''].filter(Boolean).join(' · ')}
                slotProps={{ primary: { sx: { whiteSpace: 'pre-wrap' } } }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Stack>
  );
}
