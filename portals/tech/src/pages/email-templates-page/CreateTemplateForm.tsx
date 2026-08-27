import { useState } from 'react';
import { DialogActions, DialogContent, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  onCancel: () => void;
  onCreate: (input: { slug: string; name: string; subject: string }) => void;
}

export default function CreateTemplateForm({ onCancel, onCreate }: Readonly<Props>) {
  const { t } = useTranslation();
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  return (
    <>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          required
          margin="normal"
          label={t('tech.emailTemplates.slug')}
          value={slug}
          onChange={(e) =>
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
          }
          helperText={t('tech.emailTemplates.usedByCodeEGWelcome')}
        />
        <TextField
          fullWidth
          required
          margin="normal"
          label={t('shell.common.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          fullWidth
          required
          margin="normal"
          label={t('tech.common.subject')}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Welcome to {{ app_name }}"
        />
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onCancel}>{t('shell.common.cancel')}</DuncitButton>
        <DuncitButton
          variant="contained"
          disabled={!slug || !name || !subject}
          onClick={() => onCreate({ slug, name, subject })}
        >
          Create
        </DuncitButton>
      </DialogActions>
    </>
  );
}
