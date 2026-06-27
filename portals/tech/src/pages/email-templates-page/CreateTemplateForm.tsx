import { useState } from 'react';
import {
  Button,
  DialogActions,
  DialogContent,
  TextField,
} from '@mui/material';

interface Props {
  onCancel: () => void;
  onCreate: (input: { slug: string; name: string; subject: string }) => void;
}

export default function CreateTemplateForm({ onCancel, onCreate }: Readonly<Props>) {
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  return (
    <>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="normal"
          label="Slug"
          value={slug}
          onChange={(e) =>
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
          }
          helperText="Used by code, e.g. welcome, payment-receipt."
        />
        <TextField
          fullWidth
          margin="normal"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          fullWidth
          margin="normal"
          label="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Welcome to {{ app_name }}"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!slug || !name || !subject}
          onClick={() => onCreate({ slug, name, subject })}
        >
          Create
        </Button>
      </DialogActions>
    </>
  );
}
